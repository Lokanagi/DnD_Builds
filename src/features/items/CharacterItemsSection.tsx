import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/useAuth";
import { addCampaignItem, listCampaignItems, listSteinhartItems, searchSrdMagicItems } from "./itemsApi";
import {
  addCharacterItem,
  listCharacterItems,
  markAcquired,
  removeCharacterItem,
  updateCharacterItemQuantity,
  type CharacterItem,
} from "./itemsApi";

function AddItemForm({
  characterId,
  campaignId,
  relation,
  onAdded,
}: {
  characterId: string;
  campaignId: string;
  relation: "inventory" | "wishlist";
  onAdded: () => void;
}) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"custom" | "srd" | "steinhart">("custom");
  const [customFilter, setCustomFilter] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newRarity, setNewRarity] = useState("");
  const [srdQuery, setSrdQuery] = useState("");
  const [srdResults, setSrdResults] = useState<{ key: string; name: string }[]>([]);
  const steinhartQuery = useQuery({ queryKey: ["steinhart-items"], queryFn: listSteinhartItems });
  const campaignItemsQuery = useQuery({ queryKey: ["campaign-items", campaignId], queryFn: () => listCampaignItems(campaignId) });

  const handleAdd = async (item: { source: "srd" | "steinhart" | "custom"; key: string | null; name: string }) => {
    await addCharacterItem(characterId, relation, item);
    onAdded();
  };

  const customMatches = (campaignItemsQuery.data ?? []).filter((i) => i.name.toLowerCase().includes(customFilter.toLowerCase()));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;
    const created = await addCampaignItem(campaignId, user.id, {
      name: newName.trim(),
      category: newCategory,
      rarity: newRarity,
      description: "",
    });
    setNewName("");
    setNewCategory("");
    setNewRarity("");
    await handleAdd({ source: "custom", key: created.id, name: created.name });
  };

  return (
    <div className="flex flex-col gap-1 rounded border border-dashed border-slate-300 p-2 text-xs dark:border-slate-600">
      <div className="flex gap-1">
        {(["custom", "srd", "steinhart"] as const).map((m) => (
          <button
            key={m}
            className={`rounded px-1.5 py-0.5 ${mode === m ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900" : "border border-slate-300 dark:border-slate-600"}`}
            onClick={() => setMode(m)}
          >
            {m === "custom" ? "Каталог кампании" : m === "srd" ? "D&D" : "Штейнхард"}
          </button>
        ))}
      </div>

      {mode === "custom" && (
        <div className="flex flex-col gap-1">
          <input
            placeholder="Поиск по каталогу кампании..."
            value={customFilter}
            onChange={(e) => setCustomFilter(e.target.value)}
            className="rounded border border-slate-300 bg-white px-1 py-0.5 dark:border-slate-600 dark:bg-slate-800"
          />
          {customFilter && (
            <div className="flex max-h-24 flex-col gap-1 overflow-y-auto">
              {customMatches.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <span>
                    {item.name} <span className="text-slate-400 dark:text-slate-500">{item.rarity ?? ""}</span>
                  </span>
                  <button
                    className="rounded border border-slate-300 px-1.5 dark:border-slate-600"
                    onClick={() => handleAdd({ source: "custom", key: item.id, name: item.name })}
                  >
                    +
                  </button>
                </div>
              ))}
              {customMatches.length === 0 && <p className="text-slate-400 dark:text-slate-500">Не найдено — создайте новый ниже.</p>}
            </div>
          )}
          <form className="flex flex-wrap gap-1" onSubmit={handleCreate}>
            <input
              placeholder="Новый предмет: название"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="min-w-[8rem] flex-1 rounded border border-slate-300 bg-white px-1 py-0.5 dark:border-slate-600 dark:bg-slate-800"
            />
            <input
              placeholder="Категория"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-20 rounded border border-slate-300 bg-white px-1 py-0.5 dark:border-slate-600 dark:bg-slate-800"
            />
            <input
              placeholder="Редкость"
              value={newRarity}
              onChange={(e) => setNewRarity(e.target.value)}
              className="w-20 rounded border border-slate-300 bg-white px-1 py-0.5 dark:border-slate-600 dark:bg-slate-800"
            />
            <button className="rounded border border-slate-300 px-2 dark:border-slate-600">Создать и добавить</button>
          </form>
        </div>
      )}

      {mode === "srd" && (
        <div className="flex flex-col gap-1">
          <form
            className="flex gap-1"
            onSubmit={async (e) => {
              e.preventDefault();
              setSrdResults(await searchSrdMagicItems(srdQuery));
            }}
          >
            <input
              placeholder="Поиск предмета D&D..."
              value={srdQuery}
              onChange={(e) => setSrdQuery(e.target.value)}
              className="flex-1 rounded border border-slate-300 bg-white px-1 py-0.5 dark:border-slate-600 dark:bg-slate-800"
            />
            <button className="rounded border border-slate-300 px-2 dark:border-slate-600">Найти</button>
          </form>
          {srdResults.map((r) => (
            <div key={r.key} className="flex items-center justify-between">
              <span>{r.name}</span>
              <button className="rounded border border-slate-300 px-1.5 dark:border-slate-600" onClick={() => handleAdd({ source: "srd", key: r.key, name: r.name })}>
                +
              </button>
            </div>
          ))}
        </div>
      )}

      {mode === "steinhart" && (
        <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
          {steinhartQuery.data?.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <span>{item.name}</span>
              <button
                className="rounded border border-slate-300 px-1.5 dark:border-slate-600"
                onClick={() => handleAdd({ source: "steinhart", key: item.id, name: item.name })}
              >
                +
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, relation, onChanged }: { item: CharacterItem; relation: "inventory" | "wishlist"; onChanged: () => void }) {
  return (
    <div className="flex items-center justify-between rounded border border-slate-100 px-2 py-1 text-xs dark:border-slate-800">
      <span>
        {item.itemName}
        {item.quantity > 1 ? ` ×${item.quantity}` : ""}
      </span>
      <div className="flex items-center gap-2">
        {relation === "inventory" && (
          <>
            <button
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              onClick={() => updateCharacterItemQuantity(item.id, Math.max(1, item.quantity - 1)).then(onChanged)}
            >
              −
            </button>
            <button
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              onClick={() => updateCharacterItemQuantity(item.id, item.quantity + 1).then(onChanged)}
            >
              +
            </button>
          </>
        )}
        {relation === "wishlist" && (
          <button className="text-emerald-600 hover:underline dark:text-emerald-400" onClick={() => markAcquired(item.id).then(onChanged)}>
            Получено
          </button>
        )}
        <button className="text-slate-400 hover:text-red-600 dark:hover:text-red-400" onClick={() => removeCharacterItem(item.id).then(onChanged)}>
          ×
        </button>
      </div>
    </div>
  );
}

export function CharacterItemsSection({
  characterId,
  campaignId,
  canEdit,
}: {
  characterId: string;
  campaignId: string;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const itemsQuery = useQuery({ queryKey: ["character-items", characterId], queryFn: () => listCharacterItems(characterId) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["character-items", characterId] });

  const inventory = (itemsQuery.data ?? []).filter((i) => i.relation === "inventory");
  const wishlist = (itemsQuery.data ?? []).filter((i) => i.relation === "wishlist");

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Инвентарь</h3>
        <div className="flex flex-col gap-1">
          {inventory.length ? inventory.map((i) => <ItemRow key={i.id} item={i} relation="inventory" onChanged={invalidate} />) : (
            <p className="text-xs text-slate-400 dark:text-slate-500">Пусто.</p>
          )}
          {canEdit && <AddItemForm characterId={characterId} campaignId={campaignId} relation="inventory" onAdded={invalidate} />}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Вишлист</h3>
        <div className="flex flex-col gap-1">
          {wishlist.length ? wishlist.map((i) => <ItemRow key={i.id} item={i} relation="wishlist" onChanged={invalidate} />) : (
            <p className="text-xs text-slate-400 dark:text-slate-500">Пусто.</p>
          )}
          {canEdit && <AddItemForm characterId={characterId} campaignId={campaignId} relation="wishlist" onAdded={invalidate} />}
        </div>
      </div>
    </div>
  );
}
