export type DiceRollResult = {
  rolls: number[];
  diceTotal: number;
  bonus: number;
  total: number;
  label: string;
};

function rollDie(sides: number): number {
  return 1 + Math.floor(Math.random() * sides);
}

/** Rolls `count`dSides+bonus, e.g. rollDice(4, 12, 5) for "4d12 + 5". */
export function rollDice(count: number, sides: number, bonus = 0): DiceRollResult {
  const rolls = Array.from({ length: Math.max(1, count) }, () => rollDie(sides));
  const diceTotal = rolls.reduce((a, b) => a + b, 0);
  const total = diceTotal + bonus;
  const bonusLabel = bonus !== 0 ? ` ${bonus >= 0 ? "+" : "-"} ${Math.abs(bonus)}` : "";
  return { rolls, diceTotal, bonus, total, label: `${rolls.join(" + ")}${bonusLabel} = ${total}` };
}

/** Rolls a d20 + modifier (attack rolls, saves, checks). */
export function rollD20(modifier = 0): DiceRollResult {
  const roll = rollDie(20);
  const total = roll + modifier;
  const modLabel = modifier !== 0 ? ` ${modifier >= 0 ? "+" : "-"} ${Math.abs(modifier)}` : "";
  const crit = roll === 20 ? " (КРИТ!)" : roll === 1 ? " (провал)" : "";
  return { rolls: [roll], diceTotal: roll, bonus: modifier, total, label: `d20: ${roll}${modLabel} = ${total}${crit}` };
}

/** Parses a dice formula like "4d12+5" or the book's own "4к12 + 5" notation. */
export function parseDiceFormula(formula: string): { count: number; sides: number; bonus: number } | null {
  const match = /(\d+)\s*[dкk](\d+)\s*(?:([+-])\s*(\d+))?/i.exec(formula);
  if (!match) return null;
  const count = Number(match[1]);
  const sides = Number(match[2]);
  const bonus = match[3] ? Number(match[3] + match[4]) : 0;
  return { count, sides, bonus };
}

export function rollFormula(formula: string): DiceRollResult | null {
  const parsed = parseDiceFormula(formula);
  if (!parsed) return null;
  return rollDice(parsed.count, parsed.sides, parsed.bonus);
}

/** Parses a plain modifier like "+12" or "-1" (attack-bonus style). */
export function parseModifier(text: string): number | null {
  const match = /^([+-]?\d+)/.exec(text.trim());
  return match ? Number(match[1]) : null;
}
