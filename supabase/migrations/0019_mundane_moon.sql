-- GM wants to drop the manual "nights remaining" countdown and instead
-- freely toggle the campaign's current moon between any Otherworldly moon
-- and a plain "Обычная луна" (ordinary, no otherworldly effects) state —
-- the same manual-switch control already used for Otherworldly moons.
-- Simplest way to reuse all existing moon_state/moon_history/timeline code
-- unchanged: treat "Обычная луна" as just another moon_catalog row, flagged
-- so it's excluded from random d100 rolls but still fully selectable
-- manually and still plots as a timeline band like any other moon.

alter table moon_catalog add column is_mundane boolean not null default false;

insert into moon_catalog (name, d100_range, description, book_page, default_duration_nights, is_mundane)
values ('Обычная луна', '[0,0)', 'Обычная земная луна — без потусторонних эффектов.', null, 1, true)
on conflict (name) do nothing;
