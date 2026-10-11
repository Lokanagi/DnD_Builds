import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCampaignStore } from "@/stores/campaignStore";
import { useActiveCampaign } from "@/features/campaigns/useActiveCampaign";
import { useAuth } from "@/features/auth/useAuth";
import { awardXp, getCharacterXpTotals, listXpLedger } from "./xpApi";

function AwardXpForm({ campaignId, onAwarded }: { campaignId: string; onAwarded: () => void }) {
  const { user } = useAuth();
  const totalsQuery = useQuery({
    queryKey: ["xp-totals", campaignId],
    queryFn: () => getCharacterXpTotals(campaignId),
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || amount === 0) return;
    const targets = selected.size > 0 ? [...selected] : (totalsQuery.data ?? []).map((c) => c.characterId);
    if (targets.length === 0) return;
    setBusy(true);
    try {
      await awardXp(campaignId, targets, amount, reason, user.id);
      setAmount(0);
      setReason("");
      setSelected(new Set());
      onAwarded();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Начислить опыт</h3>
      <div className="flex flex-wrap gap-2">
        {totalsQuery.data?.map((c) => (
          <label key={c.characterId} className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs dark:border-slate-700">
            <input type="checkbox" checked={selected.has(c.characterId)} onChange={() => toggle(c.characterId)} />
            {c.characterName}
          </label>
        ))}
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">Никого не выбрано = вся партия.</p>
      <div className="flex gap-2">
        <input
          type="number"
          required
          placeholder="Количество"
          value={amount || ""}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-32 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
        />
        <input
          placeholder="Причина"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
        />
      </div>
      <button
        disabled={busy}
        className="w-fit rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
      >
        Начислить
      </button>
    </form>
  );
}

export function XpPage() {
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const { role } = useActiveCampaign(activeCampaignId);
  const isGm = role === "gm";
  const queryClient = useQueryClient();

  const totalsQuery = useQuery({
    queryKey: ["xp-totals", activeCampaignId],
    queryFn: () => getCharacterXpTotals(activeCampaignId!),
    enabled: !!activeCampaignId,
  });
  const ledgerQuery = useQuery({
    queryKey: ["xp-ledger", activeCampaignId],
    queryFn: () => listXpLedger(activeCampaignId!),
    enabled: !!activeCampaignId,
  });

  if (!activeCampaignId) return null;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["xp-totals", activeCampaignId] });
    void queryClient.invalidateQueries({ queryKey: ["xp-ledger", activeCampaignId] });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Опыт</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {totalsQuery.data?.map((c) => {
          const mismatch = c.levelFromSheet !== null && c.levelFromSheet !== c.levelFromXp;
          return (
            <div
              key={c.characterId}
              className={`rounded border p-3 ${mismatch ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950" : "border-slate-200 dark:border-slate-700"}`}
            >
              <p className="font-medium">{c.characterName}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {c.total} XP · по опыту: ур. {c.levelFromXp}
              </p>
              {c.levelFromSheet && (
                <p className={`text-xs ${mismatch ? "text-amber-700 dark:text-amber-400" : "text-slate-400 dark:text-slate-500"}`}>
                  по листу: ур. {c.levelFromSheet}
                  {mismatch ? " — расхождение, нужен повторный импорт или ручная правка" : ""}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {isGm && <AwardXpForm campaignId={activeCampaignId} onAwarded={invalidate} />}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">История начислений</h3>
        <div className="flex flex-col gap-1">
          {ledgerQuery.data?.length ? (
            ledgerQuery.data.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded border border-slate-100 px-2 py-1 text-sm dark:border-slate-800">
                <span>
                  {entry.characterName} {entry.amount >= 0 ? "+" : ""}
                  {entry.amount} XP{entry.reason ? ` — ${entry.reason}` : ""}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(entry.createdAt).toLocaleDateString("ru-RU")}</span>
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
