import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCampaignStore } from "@/stores/campaignStore";
import { useActiveCampaign } from "@/features/campaigns/useActiveCampaign";
import {
  adjustDuration,
  getMoonCatalog,
  getMoonState,
  listMoonHistory,
  setSummonCounter,
  triggerNextMoon,
} from "./moonsApi";

export function MoonsPage() {
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const { role } = useActiveCampaign(activeCampaignId);
  const isGm = role === "gm";
  const queryClient = useQueryClient();
  const [manualMoonId, setManualMoonId] = useState<string>("");

  const catalogQuery = useQuery({ queryKey: ["moon-catalog"], queryFn: getMoonCatalog });
  const stateQuery = useQuery({
    queryKey: ["moon-state", activeCampaignId],
    queryFn: () => getMoonState(activeCampaignId!),
    enabled: !!activeCampaignId,
  });
  const historyQuery = useQuery({
    queryKey: ["moon-history", activeCampaignId],
    queryFn: () => listMoonHistory(activeCampaignId!),
    enabled: !!activeCampaignId,
  });

  if (!activeCampaignId) return null;

  const currentMoon = catalogQuery.data?.find((m) => m.id === stateQuery.data?.currentMoonId);

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["moon-state", activeCampaignId] });
    void queryClient.invalidateQueries({ queryKey: ["moon-history", activeCampaignId] });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Луны</h1>

      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        {currentMoon ? (
          <>
            <h2 className="text-base font-semibold">{currentMoon.name}</h2>
            {currentMoon.bookPage && <p className="text-xs text-slate-400 dark:text-slate-500">стр. {currentMoon.bookPage}</p>}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-300">Осталось ночей:</span>
              {isGm && (
                <button
                  className="h-6 w-6 rounded border border-slate-300 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                  onClick={() => adjustDuration(activeCampaignId, -1).then(invalidateAll)}
                >
                  −
                </button>
              )}
              <span className="w-8 text-center text-sm font-medium">{stateQuery.data?.remainingDurationNights ?? 0}</span>
              {isGm && (
                <button
                  className="h-6 w-6 rounded border border-slate-300 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                  onClick={() => adjustDuration(activeCampaignId, 1).then(invalidateAll)}
                >
                  +
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Сейчас не взошла ни одна Потусторонняя луна.</p>
        )}
      </div>

      {isGm && (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Призвать следующую луну</h3>
          <button
            className="w-fit rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
            onClick={() => triggerNextMoon(activeCampaignId, "random_d100").then(invalidateAll)}
          >
            Бросить d100 (случайный метод)
          </button>
          <div className="flex items-center gap-2">
            <select
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={manualMoonId}
              onChange={(e) => setManualMoonId(e.target.value)}
            >
              <option value="">Выбрать вручную...</option>
              {catalogQuery.data?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button
              disabled={!manualMoonId}
              className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800"
              onClick={() => triggerNextMoon(activeCampaignId, "manual", manualMoonId).then(invalidateAll)}
            >
              Назначить
            </button>
          </div>

          <div className="mt-2">
            <label className="text-xs text-slate-500 dark:text-slate-400">
              Счётчик Сверхъестественного Призыва (0-1000)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={1000}
                defaultValue={stateQuery.data?.summonCounter ?? 0}
                className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
                onBlur={(e) => setSummonCounter(activeCampaignId, Number(e.target.value)).then(invalidateAll)}
              />
              <span className="text-xs text-slate-400 dark:text-slate-500">влияет на частоту восхода — правило см. в книге, стр. 283</span>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Журнал</h3>
        <div className="flex flex-col gap-1">
          {historyQuery.data?.length ? (
            historyQuery.data.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded border border-slate-100 px-2 py-1 text-sm dark:border-slate-800">
                <span>{h.moonName}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {new Date(h.startedAt).toLocaleDateString("ru-RU")}
                  {h.durationNights ? ` · ${h.durationNights} н.` : ""}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">Пусто.</p>
          )}
        </div>
      </div>
    </div>
  );
}
