import { useState } from "react";
import { rollD20, rollDice, type DiceRollResult } from "@/lib/diceRoll";
import { DAMAGE_TYPE_RU } from "@/lib/dndRu";

export type RollableAttack = {
  label?: string;
  toHit?: number | null;
  damage?: { count: number; sides: number; bonus: number; type?: string | null }[];
};

function RollButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
      onClick={onClick}
    >
      🎲 {children}
    </button>
  );
}

/** Inline dice-roll buttons for one attack (to-hit + each damage part).
 * Results show next to the clicked button until clicked again — nothing
 * is stored, it's just a convenience so the GM doesn't need a separate
 * dice app at the table. */
export function AttackRoller({ attack }: { attack: RollableAttack }) {
  const [hitResult, setHitResult] = useState<DiceRollResult | null>(null);
  const [damageResults, setDamageResults] = useState<Record<number, DiceRollResult>>({});

  if (attack.toHit == null && (!attack.damage || attack.damage.length === 0)) return null;

  return (
    <span className="ml-1 inline-flex flex-wrap items-center gap-1 align-middle">
      {attack.toHit != null && (
        <>
          <RollButton onClick={() => setHitResult(rollD20(attack.toHit!))}>попадание</RollButton>
          {hitResult && <span className="text-xs text-slate-500 dark:text-slate-400">{hitResult.label}</span>}
        </>
      )}
      {attack.damage?.map((d, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <RollButton onClick={() => setDamageResults((prev) => ({ ...prev, [i]: rollDice(d.count, d.sides, d.bonus) }))}>
            урон{d.type ? ` (${DAMAGE_TYPE_RU[d.type] ?? d.type})` : ""}
          </RollButton>
          {damageResults[i] && <span className="text-xs text-slate-500 dark:text-slate-400">{damageResults[i].label}</span>}
        </span>
      ))}
    </span>
  );
}
