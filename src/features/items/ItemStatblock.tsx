import type { SrdItemDetail } from "./itemsApi";

/** Simplified open5e magic item card: category/rarity/attunement structured
 * in Russian labels, description prose left in source English (open5e has
 * no Russian text and translating hundreds of items by hand isn't realistic). */
export function ItemStatblock({ item }: { item: SrdItemDetail }) {
  const i = item as Record<string, unknown>;
  const category = (i.category as { name?: string } | undefined)?.name;
  const rarity = (i.rarity as { name?: string } | undefined)?.name;
  const requiresAttunement = i.requires_attunement as boolean | undefined;
  const attunementDetail = i.attunement_detail as string | null | undefined;
  const desc = i.desc as string | undefined;

  return (
    <div className="rounded border border-amber-200 bg-amber-50/40 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/10">
      <h4 className="text-base font-bold">{item.name}</h4>
      <p className="text-xs italic text-slate-500 dark:text-slate-400">
        {category ?? ""}
        {rarity ? `, ${rarity}` : ""}
        {requiresAttunement ? `, требует настройки${attunementDetail ? ` (${attunementDetail})` : ""}` : ""}
      </p>
      {desc && <p className="mt-2 whitespace-pre-wrap text-sm">{desc}</p>}
    </div>
  );
}
