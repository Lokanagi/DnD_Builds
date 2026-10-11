-- Bestiary (1) + item catalog/wishlist/inventory (2, 6-inventory).
--
-- Standard D&D content isn't hand-copied into the database — it's looked up
-- live against open5e's API (CORS-open, OGL-licensed aggregation of SRD +
-- other open 5e content) at query time, and only saved into these tables
-- when the GM/player explicitly chooses to keep it. Steinhardt-specific
-- content has no API to query, so it's seeded here from the book directly
-- (see seed file) — a starting set of the setting's signature monsters and
-- items, not an exhaustive transcription of the whole bestiary/equipment
-- chapters; more rows can be added later the same way moon_catalog was.

create type item_relation as enum ('inventory', 'wishlist');
create type content_source as enum ('srd', 'steinhart', 'custom');

-- Static reference catalogs, seeded once (like moon_catalog) — public read,
-- no app-side writes.
create table steinhart_monsters (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  challenge_rating text,
  creature_type text,
  book_page int,
  summary text
);

create table steinhart_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  rarity text,
  book_page int,
  summary text
);

alter table steinhart_monsters enable row level security;
alter table steinhart_items enable row level security;
create policy "anyone reads steinhart monsters" on steinhart_monsters for select using (true);
create policy "anyone reads steinhart items" on steinhart_items for select using (true);

-- A campaign's saved encounter library — monsters the GM looked up (SRD, via
-- open5e) or picked from steinhart_monsters and chose to keep for reuse.
-- `data` snapshots the stat block at save time so it's usable offline and
-- doesn't change under the GM if the upstream API data is later edited.
create table bestiary_entries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  source content_source not null,
  source_key text, -- open5e `key` for srd, steinhart_monsters.id (as text) for steinhart
  name text not null,
  challenge_rating text,
  data jsonb,
  saved_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

alter table bestiary_entries enable row level security;
create policy "members read bestiary" on bestiary_entries
  for select using (is_campaign_member(campaign_id));
create policy "gm manages bestiary" on bestiary_entries
  for all using (is_campaign_gm(campaign_id)) with check (is_campaign_gm(campaign_id));

-- One table for both a character's wishlist and their actual inventory —
-- same shape (a character <-> item association), just a different
-- `relation`. `item_source`/`item_key` point at open5e (srd), our own
-- steinhart_items (steinhart), or neither (custom free-text item).
create table character_items (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters (id) on delete cascade,
  relation item_relation not null,
  item_source content_source not null default 'custom',
  item_key text,
  item_name text not null,
  quantity int not null default 1,
  note text,
  created_at timestamptz not null default now()
);

create index on character_items (character_id);

alter table character_items enable row level security;
create policy "owner or gm manages character items" on character_items
  for all using (
    exists (select 1 from characters c where c.id = character_id
      and (c.owner_user_id = auth.uid() or is_campaign_gm(c.campaign_id)))
  );

alter publication supabase_realtime add table bestiary_entries, character_items;
