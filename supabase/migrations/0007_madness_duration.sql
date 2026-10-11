-- Long-term madness has a rolled duration in the book (1d4 x 7 days, the
-- no-moons variant of "1d4 x Otherworldly Moons" — days are what the
-- timeline's x-axis already tracks, so that's the unit used here too).
-- Short-term is minute-scale (1d4 minutes, combat-timescale) and permanent
-- lasts until cured — neither gets a day-duration value.
alter table madness_events
  add column duration_days int;

comment on column madness_events.duration_days is
  'Planned duration in campaign days, set when tier = long (auto-rolled 1d4x7, GM-editable). Null for short (minute-scale) and permanent (lasts until cured). Expiry is surfaced as a notification only — nothing auto-resolves the event.';
