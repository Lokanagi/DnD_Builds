import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { SignInPage } from "@/features/auth/SignInPage";
import { useCampaignStore } from "@/stores/campaignStore";
import { isSuperuserEmail } from "@/lib/superuser";
import { createCampaign, joinCampaign, listAllCampaigns, listMyCampaigns } from "./campaignApi";
import type { Campaign } from "@/types/campaign";

function CampaignPicker({ onPicked }: { onPicked: (campaign: Campaign) => void }) {
  const { user } = useAuth();
  const isSuperuser = isSuperuserEmail(user?.email);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [mode, setMode] = useState<"list" | "create" | "join">("list");
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCampaigns(null);
    (showAll ? listAllCampaigns() : listMyCampaigns())
      .then(setCampaigns)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [showAll]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const campaign = await createCampaign(name, displayName);
      onPicked(campaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать кампанию");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const campaign = await joinCampaign(inviteCode, displayName);
      onPicked(campaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось вступить в кампанию");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-950">
      <div className="w-96 rounded-lg border border-slate-200 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {mode === "list" && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{showAll ? "Все кампании" : "Твои кампании"}</h1>
              {isSuperuser && (
                <button className="text-xs text-slate-400 hover:underline dark:text-slate-500" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "только твои" : "все кампании"}
                </button>
              )}
            </div>
            {!campaigns ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Загружаю...</p>
            ) : campaigns.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Пока ни одной.</p>
            ) : (
              <ul className="mb-3 flex flex-col gap-1">
                {campaigns.map((c) => (
                  <li key={c.id}>
                    <button
                      className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={() => onPicked(c)}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <button
                className="flex-1 rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
                onClick={() => setMode("create")}
              >
                Создать кампанию
              </button>
              <button
                className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => setMode("join")}
              >
                Вступить по коду
              </button>
            </div>
          </>
        )}

        {mode === "create" && (
          <form onSubmit={handleCreate} className="flex flex-col gap-2">
            <h1 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Новая кампания</h1>
            <input
              required
              placeholder="Название кампании"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <input
              required
              placeholder="Твоё имя (как мастер)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              {busy ? "Создаю..." : "Создать"}
            </button>
            <button type="button" className="text-sm text-slate-500 dark:text-slate-400" onClick={() => setMode("list")}>
              Назад
            </button>
          </form>
        )}

        {mode === "join" && (
          <form onSubmit={handleJoin} className="flex flex-col gap-2">
            <h1 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Вступить в кампанию</h1>
            <input
              required
              placeholder="Код приглашения"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm uppercase dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <input
              required
              placeholder="Твоё имя (игрок)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              {busy ? "Вступаю..." : "Вступить"}
            </button>
            <button type="button" className="text-sm text-slate-500 dark:text-slate-400" onClick={() => setMode("list")}>
              Назад
            </button>
          </form>
        )}

        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}

export function CampaignGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const setActiveCampaignId = useCampaignStore((s) => s.setActiveCampaignId);

  if (loading) return null;
  if (!session) return <SignInPage />;
  if (!activeCampaignId) {
    return <CampaignPicker onPicked={(c) => setActiveCampaignId(c.id)} />;
  }
  return <>{children}</>;
}
