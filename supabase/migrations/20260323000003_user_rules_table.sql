-- Player Intelligence System: user_rules table
-- Natural language rules parsed by LLM for scoring adjustments

create table public.user_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  league_id uuid references public.leagues(id) on delete cascade, -- null = applies to all leagues

  -- Original rule text from user
  rule_text text not null,

  -- Rule type classification
  rule_type text not null check (rule_type in ('avoid', 'target', 'filter', 'boost', 'custom')),

  -- Whether this rule is active
  is_active boolean not null default true,

  -- LLM-parsed structured rule
  -- Structure: {
  --   "action": "avoid",
  --   "conditions": [
  --     { "field": "position", "operator": "equals", "value": "WR" },
  --     { "field": "team", "operator": "equals", "value": "DAL" }
  --   ],
  --   "score_modifier": -30,
  --   "confidence": 0.95
  -- }
  -- Supported fields: position, team, age, years_exp, injury_status, bye_week, adp, auction_value, tag
  -- Supported operators: equals, not_equals, greater_than, less_than, contains, in_list
  parsed_rule jsonb not null,

  -- Human-readable interpretation of the rule (for UI display)
  llm_interpretation text,

  -- Validation status
  is_validated boolean not null default false,
  validation_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_user_rules_user on public.user_rules(user_id);
create index idx_user_rules_league on public.user_rules(league_id);
create index idx_user_rules_active on public.user_rules(user_id, is_active) where is_active = true;

-- RLS policies
alter table public.user_rules enable row level security;

-- Users can view their own rules
create policy "Users can view own rules" on public.user_rules
  for select using (auth.uid() = user_id);

-- Users can insert their own rules
create policy "Users can insert own rules" on public.user_rules
  for insert with check (auth.uid() = user_id);

-- Users can update their own rules
create policy "Users can update own rules" on public.user_rules
  for update using (auth.uid() = user_id);

-- Users can delete their own rules
create policy "Users can delete own rules" on public.user_rules
  for delete using (auth.uid() = user_id);

-- Updated_at trigger
create trigger on_user_rules_updated
  before update on public.user_rules
  for each row execute function public.handle_updated_at();
