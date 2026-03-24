-- Notifications: stores user notifications for injury alerts, waiver results, reminders
-- Part of FF-133 to FF-136

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Notification type and priority
  type text not null check (type in ('injury', 'waiver_result', 'weekly_reminder', 'lineup_lock', 'trade_offer', 'trade_accepted', 'player_news', 'game_start', 'custom')),
  priority text not null default 'medium' check (priority in ('critical', 'high', 'medium', 'low')),
  channel text not null default 'in_app' check (channel in ('push', 'email', 'in_app')),

  -- Content
  title text not null,
  message text not null,
  short_message text, -- For push notifications

  -- Context
  player_id text,
  player_name text,
  league_id text,
  week integer,

  -- Status
  read boolean not null default false,
  dismissed boolean not null default false,
  action_taken boolean,

  -- Timestamps
  created_at timestamptz not null default now(),
  read_at timestamptz,
  expires_at timestamptz
);

-- Indexes for common queries
create index idx_notifications_user on public.notifications(user_id);
create index idx_notifications_user_unread on public.notifications(user_id) where read = false and dismissed = false;
create index idx_notifications_type on public.notifications(type);
create index idx_notifications_created on public.notifications(created_at desc);
create index idx_notifications_expires on public.notifications(expires_at) where expires_at is not null;

-- RLS policies
alter table public.notifications enable row level security;

create policy "Users can read own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

create policy "Service role can manage notifications" on public.notifications
  for all using (auth.role() = 'service_role');


-- Notification Preferences: user settings for notification delivery
create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- Global settings
  enabled boolean not null default true,
  quiet_hours_start text, -- "22:00" format
  quiet_hours_end text,   -- "08:00" format

  -- Channel preferences
  push_enabled boolean not null default true,
  email_enabled boolean not null default false,
  in_app_enabled boolean not null default true,

  -- Type preferences
  injury_alerts boolean not null default true,
  injury_alert_severity text not null default 'starters' check (injury_alert_severity in ('all', 'starters', 'critical')),
  waiver_results boolean not null default true,
  weekly_reminders boolean not null default true,
  lineup_lock_reminders boolean not null default true,
  trade_alerts boolean not null default true,
  player_news boolean not null default false,
  game_start_alerts boolean not null default false,

  -- Timing preferences
  reminder_lead_time integer not null default 60, -- Minutes before lineup lock
  waiver_reminder_lead_time integer not null default 4, -- Hours before waiver deadline

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS policies
alter table public.notification_preferences enable row level security;

create policy "Users can read own preferences" on public.notification_preferences
  for select using (auth.uid() = user_id);

create policy "Users can update own preferences" on public.notification_preferences
  for update using (auth.uid() = user_id);

create policy "Users can insert own preferences" on public.notification_preferences
  for insert with check (auth.uid() = user_id);

create policy "Service role can manage preferences" on public.notification_preferences
  for all using (auth.role() = 'service_role');


-- Push Subscriptions: Web Push API subscription data
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Web Push subscription data
  endpoint text not null,
  p256dh_key text not null,
  auth_key text not null,

  created_at timestamptz not null default now(),

  constraint unique_user_endpoint unique (user_id, endpoint)
);

-- Index for looking up subscriptions by user
create index idx_push_subscriptions_user on public.push_subscriptions(user_id);

-- RLS policies
alter table public.push_subscriptions enable row level security;

create policy "Users can read own subscriptions" on public.push_subscriptions
  for select using (auth.uid() = user_id);

create policy "Users can insert own subscriptions" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own subscriptions" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

create policy "Service role can manage subscriptions" on public.push_subscriptions
  for all using (auth.role() = 'service_role');
