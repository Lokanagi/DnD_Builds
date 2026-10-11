-- Supports: editable HP/temp HP (already had columns, just needed an API —
-- no schema change), money tracking, and letting a character's owner (not
-- just the GM) delete their own character.

alter table characters
  add column coins jsonb not null default '{"cp":0,"sp":0,"ep":0,"gp":0,"pp":0}'::jsonb;

comment on column characters.coins is
  'Copper/silver/electrum/gold/platinum piece counts, editable in-app.';

-- 0001's delete policy was GM-only; a player should be able to delete their
-- own character too (e.g. a character died permanently, or was a mistake).
drop policy "gm deletes character" on characters;
create policy "owner or gm deletes character" on characters
  for delete using (owner_user_id = auth.uid() or is_campaign_gm(campaign_id));
