-- Diseases get the same "event with an optional duration, plotted on the
-- timeline" treatment as madness events, but without madness's tier/
-- escalation machinery — a disease is just a named ailment on a character
-- that starts on a campaign day and may run for a known number of days.
-- Reuses madness_status (active/cured/resolved) since the lifecycle matches.

create table diseases (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  character_id uuid not null references characters (id) on delete cascade,
  title text not null,
  cause_note text,
  status madness_status not null default 'active',
  campaign_day int not null default 1,
  duration_days int,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text
);

create index on diseases (campaign_id);
create index on diseases (character_id);

alter table diseases enable row level security;
create policy "members read diseases" on diseases
  for select using (is_campaign_member(campaign_id));
create policy "gm writes diseases" on diseases
  for insert with check (is_campaign_gm(campaign_id) and created_by = auth.uid());
create policy "gm updates diseases" on diseases
  for update using (is_campaign_gm(campaign_id));
create policy "gm deletes diseases" on diseases
  for delete using (is_campaign_gm(campaign_id));

alter publication supabase_realtime add table diseases;
