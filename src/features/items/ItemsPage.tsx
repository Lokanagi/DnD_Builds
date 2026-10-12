import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCampaignStore } from "@/stores/campaignStore";
import { useActiveCampaign } from "@/features/campaigns/useActiveCampaign";
import { useAuth } from "@/features/auth/useAuth";
import { ItemStatblock } from "./ItemStatblock";
import { DndSuItemStatblock } from "./DndSuItemStatblock";
import { fetchDndSuItem, type DndSuItem } from "@/lib/dndSu";
import {
  addCampaignItem,
  getSrdMagicItem,
  listCampaignItems,
  listSteinhartItems,
  removeCampaignItem,
  searchSrdMagicItems,
  type CampaignItem,
  type SrdItemDetail,
  type SrdItemSummary,
} from "./itemsApi";

function ItemDetailView({ detail }: { detail: SrdItemDetail }) {
  const [dndSu, setDndSu] = useState<DndSuItem | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setDndSu(undefined);
    fetchDndSuItem(detail.name)
      .then((m) => !cancelled && setDndSu(m))
      .catch(() => !cancelled && setDndSu(null));
    return () => {
      cancelled = true;
    };
  }, [detail.name]);

  if (dndSu === undefined) return <p className="text-xs text-slate-400">Загружаю...</p>;
  if (dndSu) return <DndSuItemStatblock item={dndSu} />;
  return <ItemStatblock item={detail} />;
}

function SrdItemSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SrdItemSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<SrdItemDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const found = await searchSrdMagicItems(query);
      setResults(found);
      if (found.length === 0) {
        setError("Ничего не нашлось — попробуйте другое слово (рус. частые термины понимаются, но покрывают не всё; английское название всегда сработает).");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка поиска");
    } finally {
      setBusy(false);
    }
  };

  const handleExpand = async (summary: SrdItemSummary) => {
    if (expandedKey === summary.key) {
      setExpandedKey(null);
      setExpandedDetail(null);
      return;
    }
    setExpandedKey(summary.key);
    setExpandedDetail(null);
    setLoadingDetail(true);
    try {
      setExpandedDetail(await getSrdMagicItem(summary.key));
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          placeholder="Поиск предмета (рус. или англ. название, open5e)..."
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
          <div key={r.key} className="flex flex-col gap-1">
            <button
              className="flex items-center justify-between rounded border border-slate-100 px-2 py-1 text-left text-sm hover:underline dark:border-slate-800"
              onClick={() => handleExpand(r)}
            >
              <span>
                {r.name}{" "}
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {r.rarity ?? ""} {r.source ? `· ${r.source}` : ""}
                </span>
              </span>
            </button>
            {expandedKey === r.key && (loadingDetail ? <p className="text-xs text-slate-400">Загружаю...</p> : expandedDetail && <ItemDetailView detail={expandedDetail} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function SteinhartItemSearch() {
  const itemsQuery = useQuery({ queryKey: ["steinhart-items"], queryFn: listSteinhartItems });
  const [filter, setFilter] = useState("");
  const filtered = (itemsQuery.data ?? []).filter((i) => i.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="flex flex-col gap-2">
      <input
        placeholder="Фильтр по имени (предметы Штейнхарда)..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
      />
      <div className="flex flex-col gap-1">
        {filtered.map((item) => (
          <div key={item.id} className="rounded border border-slate-100 px-2 py-1 text-sm dark:border-slate-800">
            <p>
              {item.name}{" "}
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {item.category ? `· ${item.category}` : ""} {item.rarity ? `· ${item.rarity}` : ""}
                {item.bookPage ? ` · стр. ${item.bookPage}` : ""}
              </span>
            </p>
            {item.summary && <p className="text-xs text-slate-500 dark:text-slate-400">{item.summary}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignItemForm({ campaignId, onAdded }: { campaignId: string; onAdded: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [rarity, setRarity] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setBusy(true);
    try {
      await addCampaignItem(campaignId, user.id, { name: name.trim(), category, rarity, description });
      setName("");
      setCategory("");
      setRarity("");
      setDescription("");
      onAdded();
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
          placeholder="Категория"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-28 rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-800"
        />
        <input
          placeholder="Редкость"
          value={rarity}
          onChange={(e) => setRarity(e.target.value)}
          className="w-24 rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-800"
        />
      </div>
      <textarea
        placeholder="Описание (необязательно)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
        rows={2}
      />
      <button
        disabled={busy}
        className="w-fit rounded bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
      >
        Добавить в каталог кампании
      </button>
    </form>
  );
}

function CampaignCatalogList({
  items,
  canDelete,
  onRemove,
}: {
  items: CampaignItem[];
  canDelete: (item: CampaignItem) => boolean;
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) return <p className="text-sm text-slate-400 dark:text-slate-500">Пока пусто — добавьте предмет формой ниже.</p>;
  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between rounded border border-slate-100 px-2 py-1 text-sm dark:border-slate-800">
          <span>
            {item.name}{" "}
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {item.category ?? ""} {item.rarity ? `· ${item.rarity}` : ""}
            </span>
            {item.description && <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>}
          </span>
          {canDelete(item) && (
            <button className="text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400" onClick={() => onRemove(item.id)}>
              Удалить
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function ItemsPage() {
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const { role } = useActiveCampaign(activeCampaignId);
  const { user } = useAuth();
  const isGm = role === "gm";
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"catalog" | "srd" | "steinhart">("catalog");

  const catalogQuery = useQuery({
    queryKey: ["campaign-items", activeCampaignId],
    queryFn: () => listCampaignItems(activeCampaignId!),
    enabled: !!activeCampaignId,
  });

  if (!activeCampaignId) return null;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["campaign-items", activeCampaignId] });

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Предметы</h1>
      <div className="flex gap-2 text-sm">
        {(["catalog", "srd", "steinhart"] as const).map((t) => (
          <button
            key={t}
            className={`rounded px-2 py-1 ${tab === t ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900" : "border border-slate-300 dark:border-slate-600"}`}
            onClick={() => setTab(t)}
          >
            {t === "catalog" ? "Каталог кампании" : t === "srd" ? "Поиск D&D" : "Предметы Штейнхарда"}
          </button>
        ))}
      </div>

      {tab === "catalog" && (
        <div className="flex flex-col gap-3">
          <CampaignCatalogList
            items={catalogQuery.data ?? []}
            canDelete={(item) => isGm || item.createdBy === user?.id}
            onRemove={(id) => removeCampaignItem(id).then(invalidate)}
          />
          <CampaignItemForm campaignId={activeCampaignId} onAdded={invalidate} />
        </div>
      )}
      {tab === "srd" && <SrdItemSearch />}
      {tab === "steinhart" && <SteinhartItemSearch />}

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Чтобы добавить предмет персонажу в инвентарь или вишлист — откройте лист персонажа, там та же форма возьмёт предмет из каталога кампании или создаст новый.
      </p>
    </div>
  );
}
