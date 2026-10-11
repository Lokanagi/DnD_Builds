import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCampaignStore } from "@/stores/campaignStore";
import { listCharacterSummaries } from "./charactersApi";
import { ImportCharacterButton } from "./ImportCharacterButton";
import { CharacterDetail } from "./CharacterDetail";

function HpBar({ current, max }: { current: number | null; max: number | null }) {
  const pct = max && max > 0 ? Math.max(0, Math.min(100, ((current ?? 0) / max) * 100)) : 0;
  return (
    <div className="h-2 w-full rounded bg-slate-200 dark:bg-slate-700">
      <div className="h-2 rounded bg-emerald-600 dark:bg-emerald-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function CharactersPage() {
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const summariesQuery = useQuery({
    queryKey: ["characters", activeCampaignId],
    queryFn: () => listCharacterSummaries(activeCampaignId!),
    enabled: !!activeCampaignId,
  });

  if (!activeCampaignId) return null;

  if (selectedId) {
    return (
      <div>
        <button
          className="m-4 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
          onClick={() => setSelectedId(null)}
        >
          ← Назад к списку
        </button>
        <CharacterDetail characterId={selectedId} campaignId={activeCampaignId} />
      </div>
    );
  }

  const characters = summariesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Персонажи</h1>
        <ImportCharacterButton campaignId={activeCampaignId} />
      </div>

      {summariesQuery.isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Загружаю...</p>
      ) : characters.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Пока никого — импортируй первый лист из экспорта Long Story Short.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((c) => {
            // Always clickable — getFullCharacter()'s RLS is what actually
            // decides whether the owner/GM sheet loads or "no access" shows.
            return (
              <button
                key={c.id}
                className="rounded-lg border border-slate-200 p-3 text-left shadow-sm hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-500"
                onClick={() => setSelectedId(c.id)}
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="font-medium">{c.name}</h2>
                  <span className="text-sm text-slate-500 dark:text-slate-400">ур. {c.level}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {c.class}
                  {c.subclass ? ` · ${c.subclass}` : ""}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {c.hpCurrent}/{c.hpMax} HP
                  </span>
                  <div className="flex-1">
                    <HpBar current={c.hpCurrent} max={c.hpMax} />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">КД {c.ac}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
