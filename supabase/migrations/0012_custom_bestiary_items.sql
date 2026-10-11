-- Lets any campaign member (not just GM) save a custom monster or item into
-- the shared campaign library — bestiary_entries already supports
-- source='custom' with a free-form `data` blob, it just didn't allow
-- non-GM inserts yet. Mirrors that same "shared campaign catalog" shape
-- for items (campaign_items), which character_items' 'custom' source can
-- now point at so a custom item is reusable across characters instead of
-- being re-typed into every wishlist/inventory separately.

drop policy "gm manages bestiary" on bestiary_entries;
create policy "members add to bestiary" on bestiary_entries
  for insert with check (is_campaign_member(campaign_id) and saved_by = auth.uid());
create policy "gm or saver updates bestiary" on bestiary_entries
  for update using (is_campaign_gm(campaign_id) or saved_by = auth.uid());
create policy "gm or saver deletes bestiary" on bestiary_entries
  for delete using (is_campaign_gm(campaign_id) or saved_by = auth.uid());

create table campaign_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  name text not null,
  category text,
  rarity text,
  description text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

alter table campaign_items enable row level security;
create policy "members read campaign items" on campaign_items
  for select using (is_campaign_member(campaign_id));
create policy "members add campaign items" on campaign_items
  for insert with check (is_campaign_member(campaign_id) and created_by = auth.uid());
create policy "gm or creator updates campaign items" on campaign_items
  for update using (is_campaign_gm(campaign_id) or created_by = auth.uid());
create policy "gm or creator deletes campaign items" on campaign_items
  for delete using (is_campaign_gm(campaign_id) or created_by = auth.uid());

alter publication supabase_realtime add table campaign_items;
