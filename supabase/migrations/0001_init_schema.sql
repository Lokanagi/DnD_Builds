-- Steinhart Campaign Companion — initial schema
-- Tables + RLS per docs/plan: GM has full read/write scoped to campaign_id,
-- players write only their own character's rows, read campaign-wide trackers,
-- and read a restricted "summary" view of other players' characters.

create extension if not exists "pgcrypto";

create type member_role as enum ('gm', 'player');
create type import_source as enum ('lss_json', 'pdf', 'manual');
create type resource_type as enum ('counter', 'dice_pool', 'slot', 'custom');
create type condition_source as enum ('5e_standard', 'madness', 'custom');
create type madness_tier as enum ('short', 'long', 'permanent');
create type madness_status as enum ('active', 'cured', 'resolved');
create type moon_trigger_method as enum ('random_d100', 'summon_counter', 'manual');

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gm_user_id uuid not null references auth.users (id),
  invite_code text not null unique,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  role member_role not null,
  display_name text not null,
  joined_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

create table characters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  owner_user_id uuid references auth.users (id), -- null for NPCs
  name text not null,
  class text not null,
  subclass text,
  level_from_sheet int,
  level_override int,
  import_source import_source not null default 'manual',
  raw_import jsonb,
  stats jsonb not null default '{}'::jsonb,
  saves jsonb not null default '{}'::jsonb,
  skills jsonb not null default '{}'::jsonb,
  proficiency int,
  hp_current int,
  hp_max int,
  hp_temp int not null default 0,
  ac int,
  hit_die text,
  is_dying boolean not null default false,
  death_fails int not null default 0,
  death_successes int not null default 0,
  inspiration boolean not null default false,
  last_imported_at timestamptz,
  updated_at timestamptz not null default now()
);

create table character_resources (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters (id) on delete cascade,
  name text not null,
  current int not null default 0,
  max int not null default 0,
  resource_type resource_type not null default 'counter',
  die_size text, -- e.g. 'd6'/'d8'/'d10' — only meaningful for resource_type = 'dice_pool'
  visible_to_players boolean not null default true,
  sort_order int not null default 0,
  note text
);

create table conditions (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters (id) on delete cascade,
  name text not null,
  source condition_source not null default '5e_standard',
  applied_at timestamptz not null default now(),
  is_active boolean not null default true,
  note text
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  session_number int not null,
  label text,
  occurred_on date not null default current_date,
  note text,
  unique (campaign_id, session_number)
);

create table madness_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  character_id uuid not null references characters (id) on delete cascade,
  session_id uuid references sessions (id),
  tier madness_tier not null,
  title text not null,
  cause_note text,
  status madness_status not null default 'active',
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text
);

-- Static reference, seeded once (see supabase/seed/moon_catalog.sql).
create table moon_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  d100_range int4range not null,
  description text,
  book_page int,
  default_duration_nights int not null default 1
);

create table moon_state (
  campaign_id uuid primary key references campaigns (id) on delete cascade,
  current_moon_id uuid references moon_catalog (id),
  remaining_duration_nights int not null default 0,
  summon_counter int not null default 0 check (summon_counter between 0 and 1000),
  started_at timestamptz,
  updated_at timestamptz not null default now()
);

create table moon_history (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  moon_id uuid not null references moon_catalog (id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_nights int,
  triggered_method moon_trigger_method not null,
  note text
);

create table xp_ledger (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  character_id uuid not null references characters (id) on delete cascade,
  amount int not null,
  reason text,
  awarded_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index on campaign_members (user_id);
create index on characters (campaign_id);
create index on character_resources (character_id);
create index on conditions (character_id);
create index on madness_events (campaign_id);
create index on madness_events (character_id);
create index on xp_ledger (character_id);

-- ---------------------------------------------------------------------------
-- Helper: is the current user GM of a given campaign?
-- ---------------------------------------------------------------------------
create or replace function is_campaign_gm(target_campaign_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from campaign_members
    where campaign_id = target_campaign_id
      and user_id = auth.uid()
      and role = 'gm'
  );
$$;

create or replace function is_campaign_member(target_campaign_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from campaign_members
    where campaign_id = target_campaign_id
      and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table campaigns enable row level security;
alter table campaign_members enable row level security;
alter table characters enable row level security;
alter table character_resources enable row level security;
alter table conditions enable row level security;
alter table sessions enable row level security;
alter table madness_events enable row level security;
alter table moon_catalog enable row level security;
alter table moon_state enable row level security;
alter table moon_history enable row level security;
alter table xp_ledger enable row level security;

create policy "members read own campaigns" on campaigns
  for select using (is_campaign_member(id));
create policy "gm manages campaign" on campaigns
  for all using (gm_user_id = auth.uid()) with check (gm_user_id = auth.uid());

create policy "members read campaign roster" on campaign_members
  for select using (is_campaign_member(campaign_id));
create policy "gm manages roster" on campaign_members
  for all using (is_campaign_gm(campaign_id)) with check (is_campaign_gm(campaign_id));

-- Characters: owner or GM gets the full row (full sheet). Everyone else in the
-- campaign is limited to summary fields via the `character_summaries` view below —
-- this base-table policy intentionally does NOT grant other members row access,
-- so querying `characters` directly as a non-owner/non-GM returns nothing.
create policy "owner or gm reads full character" on characters
  for select using (owner_user_id = auth.uid() or is_campaign_gm(campaign_id));
create policy "owner or gm writes character" on characters
  for insert with check (owner_user_id = auth.uid() or is_campaign_gm(campaign_id));
create policy "owner or gm updates character" on characters
  for update using (owner_user_id = auth.uid() or is_campaign_gm(campaign_id));
create policy "gm deletes character" on characters
  for delete using (is_campaign_gm(campaign_id));

create policy "owner or gm manages resources" on character_resources
  for all using (
    exists (select 1 from characters c where c.id = character_id
      and (c.owner_user_id = auth.uid() or is_campaign_gm(c.campaign_id)))
  );

create policy "owner or gm manages conditions" on conditions
  for all using (
    exists (select 1 from characters c where c.id = character_id
      and (c.owner_user_id = auth.uid() or is_campaign_gm(c.campaign_id)))
  );

create policy "members read sessions" on sessions
  for select using (is_campaign_member(campaign_id));
create policy "gm manages sessions" on sessions
  for all using (is_campaign_gm(campaign_id)) with check (is_campaign_gm(campaign_id));

-- Madness events: whole campaign can read (own + others, per plan — only the
-- full character *sheet* is restricted, not the madness timeline), only GM writes.
create policy "members read madness events" on madness_events
  for select using (is_campaign_member(campaign_id));
create policy "gm writes madness events" on madness_events
  for insert with check (is_campaign_gm(campaign_id) and created_by = auth.uid());
create policy "gm updates madness events" on madness_events
  for update using (is_campaign_gm(campaign_id));
create policy "gm deletes madness events" on madness_events
  for delete using (is_campaign_gm(campaign_id));

create policy "anyone reads moon catalog" on moon_catalog
  for select using (true);

create policy "members read moon state" on moon_state
  for select using (is_campaign_member(campaign_id));
create policy "gm manages moon state" on moon_state
  for all using (is_campaign_gm(campaign_id)) with check (is_campaign_gm(campaign_id));

create policy "members read moon history" on moon_history
  for select using (is_campaign_member(campaign_id));
create policy "gm manages moon history" on moon_history
  for all using (is_campaign_gm(campaign_id)) with check (is_campaign_gm(campaign_id));

create policy "members read xp ledger" on xp_ledger
  for select using (is_campaign_member(campaign_id));
create policy "gm manages xp ledger" on xp_ledger
  for all using (is_campaign_gm(campaign_id)) with check (is_campaign_gm(campaign_id));

-- ---------------------------------------------------------------------------
-- Summary access: what players see for OTHER members' characters.
--
-- Deliberately a SECURITY DEFINER function, not a view or an extra RLS policy.
-- RLS is row-level, not column-level — a plain "members can read" policy on
-- `characters` would hand every column (full sheet) to every campaign member,
-- not just the summary fields. This function runs with elevated privileges,
-- explicitly re-checks membership itself, and only ever projects the limited
-- column set, so the full-sheet columns never leave the database for a
-- non-owner/non-GM caller.
-- ---------------------------------------------------------------------------
create or replace function character_summaries(target_campaign_id uuid)
returns table (
  id uuid,
  campaign_id uuid,
  owner_user_id uuid,
  name text,
  class text,
  subclass text,
  level int,
  hp_current int,
  hp_max int,
  ac int
)
language sql
security definer
set search_path = public
stable
as $$
  select c.id, c.campaign_id, c.owner_user_id, c.name, c.class, c.subclass,
         coalesce(c.level_override, c.level_from_sheet) as level,
         c.hp_current, c.hp_max, c.ac
  from characters c
  where c.campaign_id = target_campaign_id
    and is_campaign_member(target_campaign_id);
$$;
