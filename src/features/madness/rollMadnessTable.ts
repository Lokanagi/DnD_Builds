import { SHORT_TERM_MADNESS_TABLE } from "./shortTermMadnessTable";
import { LONG_TERM_MADNESS_TABLE } from "./longTermMadnessTable";
import { PERMANENT_MADNESS_TABLE } from "./permanentMadnessTable";
import type { MadnessRollEntry } from "./madnessRollTypes";
import type { MadnessTier } from "./madnessApi";

const TABLE_BY_TIER: Record<MadnessTier, MadnessRollEntry[]> = {
  short: SHORT_TERM_MADNESS_TABLE,
  long: LONG_TERM_MADNESS_TABLE,
  permanent: PERMANENT_MADNESS_TABLE,
};

const roll = (sides: number) => 1 + Math.floor(Math.random() * sides);

/** Book's own two-step roll (p. 269-280): d100 picks a category, d10 picks
 * one of 3 specific effects within it. Title/note are original paraphrases
 * baked into the table data, not the book's own text. */
export function rollMadnessEffect(tier: MadnessTier): { title: string; causeNote: string; d100: number; d10: number } {
  const table = TABLE_BY_TIER[tier];
  const d100 = roll(100);
  const entry = table.find((e) => d100 >= e.d100Min && d100 <= e.d100Max) ?? table[0];
  const d10 = roll(10);
  const sub = entry.subEffects.find((s) => d10 >= s.d10Min && d10 <= s.d10Max) ?? entry.subEffects[0];
  return {
    title: `${entry.categoryTitle} — ${sub.title}`,
    causeNote: sub.note,
    d100,
    d10,
  };
}
