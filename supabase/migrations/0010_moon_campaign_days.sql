-- moon_history previously only recorded real wall-clock timestamps, so
-- duration_nights ended up measuring real minutes between GM clicks, not
-- in-game nights — and there was no way to plot which moon was active on
-- which campaign day on the madness timeline (7.1). Both need the same
-- campaign_day axis madness_events already uses (see 0004).

alter table moon_state
  add column started_day int;

alter table moon_history
  add column started_day int,
  add column ended_day int;

comment on column moon_state.started_day is
  'campaigns.current_day when the current moon rose — used to compute nights-elapsed instead of real wall-clock time.';
comment on column moon_history.started_day is 'campaigns.current_day when this moon rose.';
comment on column moon_history.ended_day is 'campaigns.current_day when this moon set.';
