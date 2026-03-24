/**
 * Notifications & Alerts Service (FF-133 to FF-136)
 *
 * Fantasy football notification system:
 * - Push notification management
 * - Injury alerts
 * - Waiver wire results
 * - Weekly reminders
 */

import { createClient } from '@supabase/supabase-js'
import type { Position, InjuryStatus } from '@/lib/players/types'

// --- Types ---

export type NotificationType =
  | 'injury'
  | 'waiver_result'
  | 'weekly_reminder'
  | 'lineup_lock'
  | 'trade_offer'
  | 'trade_accepted'
  | 'player_news'
  | 'game_start'
  | 'custom'

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low'
export type NotificationChannel = 'push' | 'email' | 'in_app'
export type ReminderType = 'lineup_set' | 'waiver_deadline' | 'trade_deadline' | 'weekly_preview'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  priority: NotificationPriority
  channel: NotificationChannel

  // Content
  title: string
  message: string
  shortMessage?: string // For push notifications

  // Context
  playerId?: string
  playerName?: string
  leagueId?: string
  week?: number

  // Status
  read: boolean
  dismissed: boolean
  actionTaken?: boolean

  // Timestamps
  createdAt: string
  readAt?: string
  expiresAt?: string
}

export interface NotificationPreferences {
  userId: string

  // Global settings
  enabled: boolean
  quietHoursStart?: string // "22:00"
  quietHoursEnd?: string   // "08:00"

  // Channel preferences
  pushEnabled: boolean
  emailEnabled: boolean
  inAppEnabled: boolean

  // Type preferences
  injuryAlerts: boolean
  injuryAlertSeverity: 'all' | 'starters' | 'critical'
  waiverResults: boolean
  weeklyReminders: boolean
  lineupLockReminders: boolean
  tradeAlerts: boolean
  playerNews: boolean
  gameStartAlerts: boolean

  // Timing preferences
  reminderLeadTime: number // Minutes before lineup lock (default 60)
  waiverReminderLeadTime: number // Hours before waiver deadline (default 4)
}

export interface InjuryAlert {
  id: string
  playerId: string
  playerName: string
  position: Position
  team: string

  previousStatus?: InjuryStatus
  newStatus: InjuryStatus
  injuryType?: string
  source: string

  isStarter: boolean
  severity: NotificationPriority
  recommendation?: string

  reportedAt: string
}

export interface WaiverResult {
  id: string
  userId: string
  leagueId: string
  week: number

  // Claim details
  playerAdded?: {
    playerId: string
    playerName: string
    position: Position
    team: string
  }
  playerDropped?: {
    playerId: string
    playerName: string
    position: Position
    team: string
  }

  // Bid details (FAAB)
  bidAmount?: number
  winningBid?: number
  wasPriority?: boolean

  // Result
  success: boolean
  failureReason?: string

  processedAt: string
}

export interface WeeklyReminder {
  type: ReminderType
  userId: string
  leagueId: string
  week: number

  title: string
  message: string
  deadline?: string
  urgency: NotificationPriority

  // Actions
  actionUrl?: string
  actionLabel?: string
}

// --- Supabase Client ---

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase credentials')
  }
  return createClient(url, serviceKey)
}

// --- Notification CRUD ---

/**
 * Create a new notification
 */
export async function createNotification(
  notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'dismissed'>
): Promise<Notification> {
  const supabase = getServiceClient()

  const newNotification = {
    ...notification,
    read: false,
    dismissed: false,
    created_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: newNotification.userId,
      type: newNotification.type,
      priority: newNotification.priority,
      channel: newNotification.channel,
      title: newNotification.title,
      message: newNotification.message,
      short_message: newNotification.shortMessage,
      player_id: newNotification.playerId,
      player_name: newNotification.playerName,
      league_id: newNotification.leagueId,
      week: newNotification.week,
      read: false,
      dismissed: false,
      expires_at: newNotification.expiresAt,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create notification: ${error.message}`)

  return transformNotificationRow(data)
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(
  userId: string,
  limit: number = 50
): Promise<Notification[]> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('read', false)
    .eq('dismissed', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to fetch notifications: ${error.message}`)

  return (data || []).map(transformNotificationRow)
}

/**
 * Get all notifications for a user
 */
export async function getNotifications(
  userId: string,
  options: {
    type?: NotificationType
    limit?: number
    includeRead?: boolean
  } = {}
): Promise<Notification[]> {
  const supabase = getServiceClient()
  const { type, limit = 100, includeRead = true } = options

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type) query = query.eq('type', type)
  if (!includeRead) query = query.eq('read', false)

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch notifications: ${error.message}`)

  return (data || []).map(transformNotificationRow)
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = getServiceClient()

  const { error } = await supabase
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)

  if (error) throw new Error(`Failed to mark notification read: ${error.message}`)
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('read', false)
    .select('id')

  if (error) throw new Error(`Failed to mark notifications read: ${error.message}`)

  return data?.length || 0
}

/**
 * Dismiss a notification
 */
export async function dismissNotification(notificationId: string): Promise<void> {
  const supabase = getServiceClient()

  const { error } = await supabase
    .from('notifications')
    .update({ dismissed: true })
    .eq('id', notificationId)

  if (error) throw new Error(`Failed to dismiss notification: ${error.message}`)
}

// --- Injury Alerts (FF-134) ---

/**
 * Process injury update and create alert
 */
export async function createInjuryAlert(
  injury: InjuryAlert,
  userId: string,
  preferences: NotificationPreferences
): Promise<Notification | null> {
  // Check if user wants injury alerts
  if (!preferences.injuryAlerts) return null

  // Check severity preference
  if (preferences.injuryAlertSeverity === 'starters' && !injury.isStarter) return null
  if (preferences.injuryAlertSeverity === 'critical' && injury.severity !== 'critical') return null

  // Determine priority based on status change
  let priority: NotificationPriority = 'medium'
  if (injury.newStatus === 'out' || injury.newStatus === 'ir') {
    priority = 'critical'
  } else if (injury.newStatus === 'doubtful') {
    priority = 'high'
  } else if (injury.newStatus === 'questionable') {
    priority = 'medium'
  }

  const statusChange = injury.previousStatus
    ? `${injury.previousStatus} → ${injury.newStatus}`
    : injury.newStatus

  const notification = await createNotification({
    userId,
    type: 'injury',
    priority,
    channel: priority === 'critical' ? 'push' : 'in_app',
    title: `Injury Alert: ${injury.playerName}`,
    message: `${injury.playerName} (${injury.team}) is now ${injury.newStatus}${injury.injuryType ? ` (${injury.injuryType})` : ''}. ${injury.recommendation || ''}`,
    shortMessage: `${injury.playerName} ${statusChange}`,
    playerId: injury.playerId,
    playerName: injury.playerName,
  })

  return notification
}

/**
 * Get recent injury alerts for a user's roster
 */
export async function getRecentInjuryAlerts(
  userId: string,
  hours: number = 24
): Promise<Notification[]> {
  const supabase = getServiceClient()
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'injury')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch injury alerts: ${error.message}`)

  return (data || []).map(transformNotificationRow)
}

// --- Waiver Results (FF-135) ---

/**
 * Create waiver result notification
 */
export async function createWaiverResultNotification(
  result: WaiverResult,
  preferences: NotificationPreferences
): Promise<Notification | null> {
  if (!preferences.waiverResults) return null

  let title: string
  let message: string
  let priority: NotificationPriority = 'medium'

  if (result.success && result.playerAdded) {
    title = `Waiver Claim Successful!`
    message = `You added ${result.playerAdded.playerName} (${result.playerAdded.position})`
    if (result.bidAmount !== undefined) {
      message += ` for $${result.bidAmount}`
    }
    if (result.playerDropped) {
      message += `. Dropped ${result.playerDropped.playerName}.`
    }
    priority = 'high'
  } else {
    title = `Waiver Claim Failed`
    message = result.failureReason || 'Your waiver claim was not processed.'
    if (result.winningBid !== undefined) {
      message += ` Winning bid: $${result.winningBid}`
    }
    priority = 'medium'
  }

  return createNotification({
    userId: result.userId,
    type: 'waiver_result',
    priority,
    channel: 'in_app',
    title,
    message,
    leagueId: result.leagueId,
    week: result.week,
    playerId: result.playerAdded?.playerId,
    playerName: result.playerAdded?.playerName,
  })
}

/**
 * Create batch waiver results summary
 */
export async function createWaiverSummaryNotification(
  userId: string,
  leagueId: string,
  week: number,
  successful: number,
  failed: number
): Promise<Notification> {
  const total = successful + failed
  let title: string
  let message: string
  let priority: NotificationPriority = 'medium'

  if (successful === total) {
    title = `All ${successful} Waiver Claims Successful!`
    message = `Your waiver claims for Week ${week} have been processed. All players added.`
    priority = 'high'
  } else if (failed === total) {
    title = `Waiver Claims Unsuccessful`
    message = `None of your ${total} waiver claims for Week ${week} were successful.`
    priority = 'medium'
  } else {
    title = `Waiver Results: ${successful}/${total} Successful`
    message = `Week ${week}: ${successful} players added, ${failed} claims failed.`
    priority = 'medium'
  }

  return createNotification({
    userId,
    type: 'waiver_result',
    priority,
    channel: 'in_app',
    title,
    message,
    leagueId,
    week,
  })
}

// --- Weekly Reminders (FF-136) ---

/**
 * Create weekly lineup reminder
 */
export async function createLineupReminder(
  userId: string,
  leagueId: string,
  week: number,
  lockTime: Date,
  preferences: NotificationPreferences
): Promise<Notification | null> {
  if (!preferences.weeklyReminders) return null

  const minutesUntilLock = Math.round((lockTime.getTime() - Date.now()) / 60000)
  let urgency: NotificationPriority = 'low'
  let timeLabel: string

  if (minutesUntilLock <= 30) {
    urgency = 'critical'
    timeLabel = `${minutesUntilLock} minutes`
  } else if (minutesUntilLock <= 60) {
    urgency = 'high'
    timeLabel = `${minutesUntilLock} minutes`
  } else if (minutesUntilLock <= 180) {
    urgency = 'medium'
    timeLabel = `${Math.round(minutesUntilLock / 60)} hours`
  } else {
    urgency = 'low'
    timeLabel = `${Math.round(minutesUntilLock / 60)} hours`
  }

  return createNotification({
    userId,
    type: 'lineup_lock',
    priority: urgency,
    channel: urgency === 'critical' ? 'push' : 'in_app',
    title: `Lineup Lock in ${timeLabel}`,
    message: `Week ${week} lineups lock soon. Review your roster and make any last-minute changes.`,
    shortMessage: `Week ${week} locks in ${timeLabel}`,
    leagueId,
    week,
    expiresAt: lockTime.toISOString(),
  })
}

/**
 * Create waiver deadline reminder
 */
export async function createWaiverDeadlineReminder(
  userId: string,
  leagueId: string,
  week: number,
  deadline: Date,
  preferences: NotificationPreferences
): Promise<Notification | null> {
  if (!preferences.weeklyReminders) return null

  const hoursUntilDeadline = Math.round((deadline.getTime() - Date.now()) / 3600000)
  let urgency: NotificationPriority = 'low'

  if (hoursUntilDeadline <= 2) {
    urgency = 'critical'
  } else if (hoursUntilDeadline <= 6) {
    urgency = 'high'
  } else if (hoursUntilDeadline <= 12) {
    urgency = 'medium'
  }

  return createNotification({
    userId,
    type: 'weekly_reminder',
    priority: urgency,
    channel: urgency === 'critical' ? 'push' : 'in_app',
    title: `Waiver Wire Closes in ${hoursUntilDeadline}h`,
    message: `Don't forget to submit your waiver claims for Week ${week}. Process time is approaching.`,
    shortMessage: `Waivers close in ${hoursUntilDeadline}h`,
    leagueId,
    week,
    expiresAt: deadline.toISOString(),
  })
}

/**
 * Create weekly preview reminder
 */
export async function createWeeklyPreviewReminder(
  userId: string,
  leagueId: string,
  week: number
): Promise<Notification> {
  return createNotification({
    userId,
    type: 'weekly_reminder',
    priority: 'low',
    channel: 'in_app',
    title: `Week ${week} Preview Ready`,
    message: `Your matchup preview for Week ${week} is ready. Review projections, leverage plays, and lineup recommendations.`,
    leagueId,
    week,
  })
}

/**
 * Create game start reminder for players
 */
export async function createGameStartReminder(
  userId: string,
  playerName: string,
  playerId: string,
  gameTime: Date,
  opponent: string,
  preferences: NotificationPreferences
): Promise<Notification | null> {
  if (!preferences.gameStartAlerts) return null

  const minutesUntilKick = Math.round((gameTime.getTime() - Date.now()) / 60000)

  return createNotification({
    userId,
    type: 'game_start',
    priority: 'medium',
    channel: 'in_app',
    title: `Game Starting: ${playerName}`,
    message: `${playerName} vs ${opponent} kicks off in ${minutesUntilKick} minutes. Last chance to make lineup changes!`,
    shortMessage: `${playerName} kicks off soon`,
    playerId,
    playerName,
    expiresAt: gameTime.toISOString(),
  })
}

// --- Notification Preferences ---

/**
 * Get user notification preferences
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch preferences: ${error.message}`)
  }

  if (!data) {
    // Return defaults if no preferences exist
    return getDefaultPreferences(userId)
  }

  return transformPreferencesRow(data)
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      enabled: updates.enabled,
      quiet_hours_start: updates.quietHoursStart,
      quiet_hours_end: updates.quietHoursEnd,
      push_enabled: updates.pushEnabled,
      email_enabled: updates.emailEnabled,
      in_app_enabled: updates.inAppEnabled,
      injury_alerts: updates.injuryAlerts,
      injury_alert_severity: updates.injuryAlertSeverity,
      waiver_results: updates.waiverResults,
      weekly_reminders: updates.weeklyReminders,
      lineup_lock_reminders: updates.lineupLockReminders,
      trade_alerts: updates.tradeAlerts,
      player_news: updates.playerNews,
      game_start_alerts: updates.gameStartAlerts,
      reminder_lead_time: updates.reminderLeadTime,
      waiver_reminder_lead_time: updates.waiverReminderLeadTime,
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update preferences: ${error.message}`)

  return transformPreferencesRow(data)
}

/**
 * Get default notification preferences
 */
function getDefaultPreferences(userId: string): NotificationPreferences {
  return {
    userId,
    enabled: true,
    pushEnabled: true,
    emailEnabled: false,
    inAppEnabled: true,
    injuryAlerts: true,
    injuryAlertSeverity: 'starters',
    waiverResults: true,
    weeklyReminders: true,
    lineupLockReminders: true,
    tradeAlerts: true,
    playerNews: false,
    gameStartAlerts: false,
    reminderLeadTime: 60,
    waiverReminderLeadTime: 4,
  }
}

// --- Push Notification Support (FF-133) ---

export interface PushSubscription {
  userId: string
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  createdAt: string
}

/**
 * Save push subscription for a user
 */
export async function savePushSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void> {
  const supabase = getServiceClient()

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh_key: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
      created_at: new Date().toISOString(),
    })

  if (error) throw new Error(`Failed to save push subscription: ${error.message}`)
}

/**
 * Remove push subscription for a user
 */
export async function removePushSubscription(userId: string): Promise<void> {
  const supabase = getServiceClient()

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to remove push subscription: ${error.message}`)
}

/**
 * Get push subscriptions for a user
 */
export async function getPushSubscriptions(userId: string): Promise<PushSubscription[]> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to fetch push subscriptions: ${error.message}`)

  return (data || []).map((row) => ({
    userId: row.user_id,
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh_key,
      auth: row.auth_key,
    },
    createdAt: row.created_at,
  }))
}

// --- Transform Functions ---

function transformNotificationRow(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as NotificationType,
    priority: row.priority as NotificationPriority,
    channel: row.channel as NotificationChannel,
    title: row.title as string,
    message: row.message as string,
    shortMessage: row.short_message as string | undefined,
    playerId: row.player_id as string | undefined,
    playerName: row.player_name as string | undefined,
    leagueId: row.league_id as string | undefined,
    week: row.week as number | undefined,
    read: row.read as boolean,
    dismissed: row.dismissed as boolean,
    actionTaken: row.action_taken as boolean | undefined,
    createdAt: row.created_at as string,
    readAt: row.read_at as string | undefined,
    expiresAt: row.expires_at as string | undefined,
  }
}

function transformPreferencesRow(row: Record<string, unknown>): NotificationPreferences {
  return {
    userId: row.user_id as string,
    enabled: row.enabled as boolean ?? true,
    quietHoursStart: row.quiet_hours_start as string | undefined,
    quietHoursEnd: row.quiet_hours_end as string | undefined,
    pushEnabled: row.push_enabled as boolean ?? true,
    emailEnabled: row.email_enabled as boolean ?? false,
    inAppEnabled: row.in_app_enabled as boolean ?? true,
    injuryAlerts: row.injury_alerts as boolean ?? true,
    injuryAlertSeverity: (row.injury_alert_severity as NotificationPreferences['injuryAlertSeverity']) ?? 'starters',
    waiverResults: row.waiver_results as boolean ?? true,
    weeklyReminders: row.weekly_reminders as boolean ?? true,
    lineupLockReminders: row.lineup_lock_reminders as boolean ?? true,
    tradeAlerts: row.trade_alerts as boolean ?? true,
    playerNews: row.player_news as boolean ?? false,
    gameStartAlerts: row.game_start_alerts as boolean ?? false,
    reminderLeadTime: row.reminder_lead_time as number ?? 60,
    waiverReminderLeadTime: row.waiver_reminder_lead_time as number ?? 4,
  }
}
