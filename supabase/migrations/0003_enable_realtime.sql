-- Adds every tracker table to Supabase's realtime publication. Without this,
-- postgres_changes subscriptions (src/lib/realtime/campaignChannel.ts)
-- receive nothing — row changes happen but no event reaches connected
-- clients, since Realtime only watches tables explicitly added here.
alter publication supabase_realtime add table
  characters,
  character_resources,
  conditions,
  madness_events,
  moon_state,
  moon_history,
  xp_ledger;
