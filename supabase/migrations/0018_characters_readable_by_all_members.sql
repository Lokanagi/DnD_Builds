-- Original design: only the owner and GM could read a character's full
-- sheet, everyone else only got the summary (character_summaries()). GM
-- asked to drop that — any campaign member can now read any character's
-- full sheet, stats, resources, conditions and inventory. Writes stay
-- owner-or-GM only (players still can't edit each other's characters).

drop policy "owner or gm reads full character" on characters;
create policy "members read full character" on characters
  for select using (is_campaign_member(campaign_id));

-- character_resources/conditions/character_items were single "for all"
-- policies (same check for every operation) — split each into a
-- member-wide select and an owner-or-gm write policy.

drop policy "owner or gm manages resources" on character_resources;
create policy "members read resources" on character_resources
  for select using (
    exists (select 1 from characters c where c.id = character_id and is_campaign_member(c.campaign_id))
  );
create policy "owner or gm writes resources" on character_resources
  for insert with check (
    exists (select 1 from characters c where c.id = character_id
      and (c.owner_user_id = auth.uid() or is_campaign_gm(c.campaign_id)))
  );
create policy "owner or gm updates resources" on character_resources
  for update using (
    exists (select 1 from characters c where c.id = character_id
      and (c.owner_user_id = auth.uid() or is_campaign_gm(c.campaign_id)))
  );
create policy "owner or gm deletes resources" on character_resources
  for delete using (
    exists (select 1 from characters c where c.id = character_id
      and (c.owner_user_id = auth.uid() or is_campaign_gm(c.campaign_id)))
  );

drop policy "owner or gm manages conditions" on conditions;
create policy "members read conditions" on conditions
  for select using (
    exists (select 1 from characters c where c.id = character_id and is_campaign_member(c.campaign_id))
  );
create policy "owner or gm writes conditions" on conditions
  for insert with check (
    exists (select 1 from characters c where c.id = character_id
      and (c.owner_user_id = auth.uid() or is_campaign_gm(c.campaign_id)))
  );
create policy "owner or gm updates conditions" on conditions
  for update using (
    exists (select 1 from characters c where c.id = character_id
      and (c.owner_user_id = auth.uid() or is_campaign_gm(c.campaign_id)))
  );
create policy "owner or gm deletes conditions" on conditions
  for delete using (
    exists (select 1 from characters c where c.id = character_id
      and (c.owner_user_id = auth.uid() or is_campaign_gm(c.campaign_id)))
  );

drop policy "owner or gm manages character items" on character_items;
create policy "members read character items" on character_items
  for select using (
    exists (select 1 from characters c where c.id = character_id and is_campaign_member(c.campaign_id))
  );
create policy "owner or gm writes character items" on character_items
  for insert with check (
    exists (select 1 from characters c where c.id = character_id
      and (c.owner_user_id = auth.uid() or is_campaign_gm(c.campaign_id)))
  );
create policy "owner or gm updates character items" on character_items
  for update using (
    exists (select 1 from characters c where c.id = character_id
      and (c.owner_user_id = auth.uid() or is_campaign_gm(c.campaign_id)))
  );
create policy "owner or gm deletes character items" on character_items
  for delete using (
    exists (select 1 from characters c where c.id = character_id
      and (c.owner_user_id = auth.uid() or is_campaign_gm(c.campaign_id)))
  );
