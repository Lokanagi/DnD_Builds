-- Expands steinhart_monsters from a one-line summary to a full structured
-- statblock (armor class, hit points, speed, ability scores, saves, skills,
-- senses, languages, traits/actions as name+short-paraphrase pairs) so the
-- bestiary can show a complete sheet per monster, not just a book-page
-- pointer. Traits/actions are stored as original paraphrases, never the
-- book's verbatim ability text.

alter table steinhart_monsters
  add column armor_class text,
  add column hit_points text,
  add column speed text,
  add column ability_scores jsonb,
  add column saves jsonb,
  add column skills jsonb,
  add column senses text,
  add column languages text,
  add column proficiency_bonus text,
  add column experience_points int,
  add column traits jsonb,
  add column actions jsonb,
  add column legendary_actions jsonb;
