import { renderSafeHtml } from "@/lib/safeHtml";
import type { DndSuMonster } from "@/lib/dndSu";

/** Fully-Russian statblock sourced straight from a dnd.su page (fetched
 * on-demand for this one monster) — no English prose left, unlike the
 * open5e-backed fallback. */
export function DndSuMonsterStatblock({ monster }: { monster: DndSuMonster }) {
  return (
    <div className="rounded border border-emerald-200 bg-emerald-50/40 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/10">
      <div className="mb-1 flex items-center justify-between">
        <h4 className="text-base font-bold">{monster.name}</h4>
        <span className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">dnd.su</span>
      </div>
      <p className="text-xs italic text-slate-500 dark:text-slate-400">{monster.sizeTypeAlignment}</p>
      <div className="my-1.5 border-t border-emerald-300/60 dark:border-emerald-900" />
      {monster.lines.map((line, i) => (
        <p key={i}>
          <span className="font-semibold">{line.label} </span>
          {line.value}
        </p>
      ))}
      {monster.abilities.length > 0 && (
        <div className="my-1.5 grid grid-cols-6 gap-1 border-t border-emerald-300/60 pt-1.5 text-center dark:border-emerald-900">
          {monster.abilities.map((a, i) => (
            <div key={i}>
              <p className="font-semibold">{a.abbr}</p>
              <p>{a.score}</p>
            </div>
          ))}
        </div>
      )}
      {monster.blocks.map((block, i) => (
        <div key={i} className="mt-2">
          {block.title && <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{block.title}</p>}
          <div className="flex flex-col gap-1.5 text-sm">{renderSafeHtml(block.html)}</div>
        </div>
      ))}
    </div>
  );
}
