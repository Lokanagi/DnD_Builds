-- Static reference data for the Otherworldly Moons tracker, seeded once.
-- Only names, d100 table ranges, page refs (into the GM's own copy of the
-- sourcebook) and default duration are stored here — not the moons' rules
-- text, which stays in the book itself; the app points the GM to the page.
insert into moon_catalog (name, d100_range, book_page, default_duration_nights) values
  ('Воющая Луна',               int4range(1, 21),    293, 1),
  ('Расколотая Луна',           int4range(21, 31),   301, 1),
  ('Пылающая Луна',             int4range(31, 41),   null, 1),
  ('Пустая Луна',               int4range(41, 51),   305, 1),
  ('Взирающая Луна',            int4range(51, 61),   291, 1),
  ('Ледяная Луна',              int4range(61, 68),   289, 1),
  ('Дремлющая Луна',            int4range(68, 75),   303, 1),
  ('Желтая Корона',             int4range(75, 82),   307, 1),
  ('Крадущийся Смольный Свет',  int4range(82, 89),   287, 1),
  ('Свет Кракена',              int4range(89, 96),   295, 1),
  ('Кровавое Затмение',         int4range(96, 99),   297, 1),
  ('Кровавая Луна Перерождения', int4range(99, 101),  286, 3)
on conflict (name) do nothing;

-- Note: book_page for "Пылающая Луна" is left null — its exact page could not
-- be confirmed from the source PDF's own table of contents (it appears to
-- list that name twice while omitting a clean independent page for it,
-- likely an upstream ToC extraction artifact). The GM can resolve this once
-- from the physical/PDF book and the fix is a one-line UPDATE, not a
-- migration change.
