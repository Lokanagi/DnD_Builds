import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCampaignStore } from "@/stores/campaignStore";
import { useActiveCampaign } from "@/features/campaigns/useActiveCampaign";
import { useAuth } from "@/features/auth/useAuth";
import {
  getSrdCreature,
  listBestiaryEntries,
  listSteinhartMonsters,
  removeBestiaryEntry,
  saveCustomMonster,
  saveSrdCreatureToBestiary,
  saveSteinhartMonsterToBestiary,
  searchSrdCreatures,
  type BestiaryEntry,
  type SrdCreatureSummary,
} from "./bestiaryApi";

function SrdSearch({ campaignId, onSaved }: { campaignId: string; onSaved: () => void }) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SrdCreatureSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResults(await searchSrdCreatures(query));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка поиска");
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (summary: SrdCreatureSummary) => {
    if (!user) return;
    const full = await getSrdCreature(summary.key);
    await saveSrdCreatureToBestiary(campaignId, full, user.id);
    onSaved();
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          placeholder="Поиск монстра (open5e, SRD и другие открытые источники)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
        />
        <button
          disabled={busy}
          className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
        >
          Искать
        </button>
      </form>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex flex-col gap-1">
        {results.map((r) => (
          <div key={r.key} className="flex items-center justify-between rounded border border-slate-100 px-2 py-1 text-sm dark:border-slate-800">
            <span>
              {r.name}{" "}
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {r.challengeRating ? `ОС ${r.challengeRating}` : ""} {r.type ? `· ${r.type}` : ""} {r.source ? `· ${r.source}` : ""}
              </span>
            </span>
            <button
              className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
              onClick={() => handleSave(r)}
            >
              Сохранить
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SteinhartSearch({ campaignId, onSaved }: { campaignId: string; onSaved: () => void }) {
  const { user } = useAuth();
  const monstersQuery = useQuery({ queryKey: ["steinhart-monsters"], queryFn: listSteinhartMonsters });
  const [filter, setFilter] = useState("");

  const filtered = (monstersQuery.data ?? []).filter((m) => m.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="flex flex-col gap-2">
      <input
        placeholder="Фильтр по имени (монстры Штейнхарда)..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
      />
      <div className="flex flex-col gap-1">
        {filtered.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded border border-slate-100 px-2 py-1 text-sm dark:border-slate-800">
            <div>
              <span>{m.name} </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {m.challengeRating ? `ОС ${m.challengeRating}` : ""} {m.creatureType ? `· ${m.creatureType}` : ""}
                {m.bookPage ? ` · стр. ${m.bookPage}` : ""}
              </span>
              {m.summary && <p className="text-xs text-slate-500 dark:text-slate-400">{m.summary}</p>}
            </div>
            <button
              className="shrink-0 rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
              onClick={() => user && saveSteinhartMonsterToBestiary(campaignId, m, user.id).then(onSaved)}
            >
              Сохранить
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomMonsterForm({ campaignId, onSaved }: { campaignId: string; onSaved: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [cr, setCr] = useState("");
  const [type, setType] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setBusy(true);
    try {
      await saveCustomMonster(campaignId, user.id, { name: name.trim(), challengeRating: cr, creatureType: type, summary });
      setName("");
      setCr("");
      setType("");
      setSummary("");
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded border border-dashed border-slate-300 p-3 text-sm dark:border-slate-600">
      <div className="flex gap-2">
        <input
          required
          placeholder="Название"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-800"
        />
        <input
          placeholder="ОС"
          value={cr}
          onChange={(e) => setCr(e.target.value)}
          className="w-16 rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-800"
        />
        <input
          placeholder="Тип"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-28 rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-800"
        />
      </div>
      <textarea
        placeholder="Заметки / краткое описание (необязательно)"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
        rows={2}
      />
      <button
        disabled={busy}
        className="w-fit rounded bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
      >
        Добавить в библиотеку кампании
      </button>
    </form>
  );
}

export function BestiaryPage() {
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const { role } = useActiveCampaign(activeCampaignId);
  const { user } = useAuth();
  const isGm = role === "gm";
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"library" | "srd" | "steinhart" | "custom">("library");

  const entriesQuery = useQuery({
    queryKey: ["bestiary", activeCampaignId],
    queryFn: () => listBestiaryEntries(activeCampaignId!),
    enabled: !!activeCampaignId,
  });

  if (!activeCampaignId) return null;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["bestiary", activeCampaignId] });

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Бестиарий</h1>
      <div className="flex gap-2 text-sm">
        {(["library", "srd", "steinhart", "custom"] as const).map((t) => (
          <button
            key={t}
            className={`rounded px-2 py-1 ${tab === t ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900" : "border border-slate-300 dark:border-slate-600"}`}
            onClick={() => setTab(t)}
          >
            {t === "library" ? "Библиотека кампании" : t === "srd" ? "Поиск D&D" : t === "steinhart" ? "Монстры Штейнхарда" : "Создать своего"}
          </button>
        ))}
      </div>

      {tab === "library" && (
        <BestiaryList
          entries={entriesQuery.data ?? []}
          canDelete={(e) => isGm || e.savedBy === user?.id}
          onRemove={(id) => removeBestiaryEntry(id).then(invalidate)}
        />
      )}
      {tab === "srd" && <SrdSearch campaignId={activeCampaignId} onSaved={invalidate} />}
      {tab === "steinhart" && <SteinhartSearch campaignId={activeCampaignId} onSaved={invalidate} />}
      {tab === "custom" && <CustomMonsterForm campaignId={activeCampaignId} onSaved={invalidate} />}
    </div>
  );
}

const SOURCE_LABEL: Record<BestiaryEntry["source"], string> = { srd: "D&D", steinhart: "Штейнхард", custom: "Своё" };

function BestiaryList({
  entries,
  canDelete,
  onRemove,
}: {
  entries: BestiaryEntry[];
  canDelete?: (entry: BestiaryEntry) => boolean;
  onRemove?: (id: string) => void;
}) {
  if (entries.length === 0) return <p className="text-sm text-slate-400 dark:text-slate-500">Пока пусто — сохраните монстров из поиска или добавьте своего.</p>;
  return (
    <div className="flex flex-col gap-1">
      {entries.map((e) => (
        <div key={e.id} className="flex items-center justify-between rounded border border-slate-100 px-2 py-1 text-sm dark:border-slate-800">
          <span>
            {e.name} <span className="text-xs text-slate-400 dark:text-slate-500">{e.challengeRating ? `ОС ${e.challengeRating}` : ""} · {SOURCE_LABEL[e.source]}</span>
          </span>
          {onRemove && canDelete?.(e) && (
            <button className="text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400" onClick={() => onRemove(e.id)}>
              Удалить
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
