-- `sessions` was planned as a separate "real game session" marker alongside
-- campaigns.current_day (the in-game calendar day the madness timeline
-- actually uses). It was never wired into any UI or write path — nothing
-- ever inserts a session or sets madness_events.session_id — so it's dead
-- schema. Dropping it now rather than carrying an unused table+column;
-- a real "start session" feature can reintroduce this later if wanted.
alter table madness_events drop column session_id;
drop table sessions;
