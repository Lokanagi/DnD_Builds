-- Supports the Gantt-style madness timeline: characters as rows, a
-- campaign-relative day axis, events plotted by the day they occurred, and
-- an escalation check (book's GM rule of thumb, explicitly adjustable —
-- see campaigns.settings.madness_thresholds below).

alter table campaigns
  add column current_day int not null default 1;

alter table madness_events
  add column campaign_day int not null default 1;

comment on column campaigns.current_day is
  'GM-advanced campaign-relative day counter, used as the x-axis for the madness timeline and the escalation time windows. Independent of real wall-clock time between sessions.';

comment on column madness_events.campaign_day is
  'campaigns.current_day at the moment this event was recorded — stamped at insert time, not derived from created_at.';

-- campaigns itself needs to be in the realtime publication too (0003 only
-- added the tables filtered by campaign_id) — current_day/settings changes
-- (day advance, madness threshold edits) are watched by campaignChannel.ts.
alter publication supabase_realtime add table campaigns;

-- Default escalation thresholds, stored per-campaign in the existing
-- settings jsonb so a GM can tune them without a schema change:
--   { "madness_thresholds": { "short_count": 5, "short_window_days": 2, "long_count": 3, "long_window_days": 30 } }
-- (book's own rule: 5 short-term within 48h -> long-term; 3 long-term within
-- 30 days -> permanent; the book explicitly invites adjusting these numbers)
