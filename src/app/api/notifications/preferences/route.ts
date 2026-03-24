/**
 * Notification Preferences API (FF-133)
 *
 * GET /api/notifications/preferences — Get user notification preferences
 * PUT /api/notifications/preferences — Update user notification preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/inseason'

export async function GET() {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await getNotificationPreferences(user.id)

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Preferences fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate allowed fields
    const allowedFields: (keyof NotificationPreferences)[] = [
      'enabled',
      'quietHoursStart',
      'quietHoursEnd',
      'pushEnabled',
      'emailEnabled',
      'inAppEnabled',
      'injuryAlerts',
      'injuryAlertSeverity',
      'waiverResults',
      'weeklyReminders',
      'lineupLockReminders',
      'tradeAlerts',
      'playerNews',
      'gameStartAlerts',
      'reminderLeadTime',
      'waiverReminderLeadTime',
    ]

    const updates: Partial<NotificationPreferences> = {}
    for (const field of allowedFields) {
      if (field in body) {
        ;(updates as Record<string, unknown>)[field] = body[field]
      }
    }

    const preferences = await updateNotificationPreferences(user.id, updates)

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Preferences update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
