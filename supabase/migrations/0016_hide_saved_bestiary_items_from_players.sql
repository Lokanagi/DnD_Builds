-- The campaign's saved bestiary/item library is GM encounter/loot prep —
-- players seeing it ahead of time is a spoiler. Players keep full read
-- access to the live SRD/Steinhart reference search (open5e, steinhart_
-- monsters/items — those stay "anyone reads") and to entries they saved
-- themselves, but can no longer see what the GM (or other players) saved.

drop policy "members read bestiary" on bestiary_entries;
create policy "gm or saver reads bestiary" on bestiary_entries
  for select using (is_campaign_gm(campaign_id) or saved_by = auth.uid());

drop policy "members read campaign items" on campaign_items;
create policy "gm or creator reads campaign items" on campaign_items
  for select using (is_campaign_gm(campaign_id) or created_by = auth.uid());
