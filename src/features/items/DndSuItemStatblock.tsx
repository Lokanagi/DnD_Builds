import { renderSafeHtml } from "@/lib/safeHtml";
import type { DndSuItem } from "@/lib/dndSu";

/** Fully-Russian item card sourced straight from a dnd.su page (fetched
 * on-demand for this one item) — no English prose left, unlike the
 * open5e-backed fallback. */
export function DndSuItemStatblock({ item }: { item: DndSuItem }) {
  return (
    <div className="rounded border border-emerald-200 bg-emerald-50/40 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/10">
      <div className="mb-1 flex items-center justify-between">
        <h4 className="text-base font-bold">{item.name}</h4>
        <span className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">dnd.su</span>
      </div>
      <p className="text-xs italic text-slate-500 dark:text-slate-400">{item.sizeTypeAlignment}</p>
      {item.lines.map((line, i) => (
        <p key={i} className="mt-1">
          <span className="font-semibold">{line.label} </span>
          {line.value}
        </p>
      ))}
      {item.blocks.map((block, i) => (
        <div key={i} className="mt-2 text-sm">
          {block.title && <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{block.title}</p>}
          <div className="flex flex-col gap-1.5">{renderSafeHtml(block.html)}</div>
        </div>
      ))}
    </div>
  );
}
