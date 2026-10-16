import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteCharacter,
  getFullCharacter,
  listResources,
  setCharacterOwner,
  setResourceCurrent,
  updateCoins,
  updateVitals,
  upsertCharacterFromImport,
} from "./charactersApi";
import { addCondition, clearCondition, listConditions } from "./conditionsApi";
import { parseLssJson } from "./import/lssMapper";
import { tiptapToPlainText } from "./import/tiptapText";
import { useAuth } from "@/features/auth/useAuth";
import { listCampaignMembers } from "@/features/campaigns/campaignApi";
import { useActiveCampaign } from "@/features/campaigns/useActiveCampaign";
import { CharacterItemsSection } from "@/features/items/CharacterItemsSection";
import { ABILITY_FULL_LABELS, SKILL_LABELS } from "@/lib/dndRu";
import type { AbilityScores, Coins } from "@/types/character";

const ABILITY_ORDER: (keyof AbilityScores)[] = ["str", "dex", "con", "int", "wis", "cha"];
const abilityMod = (score: number) => Math.floor((score - 10) / 2);
const fmtMod = (n: number) => (n >= 0 ? `+${n}` : String(n));

const COIN_LABELS: { key: keyof Coins; label: string }[] = [
  { key: "pp", label: "ПМ" },
  { key: "gp", label: "ЗМ" },
  { key: "ep", label: "ЭМ" },
  { key: "sp", label: "СМ" },
  { key: "cp", label: "ММ" },
];

function ResourceRow({ resource, onChange }: { resource: Awaited<ReturnType<typeof listResources>>[number]; onChange: (next: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 dark:border-slate-700">
      <div>
        <p className="text-sm font-medium">{resource.name}</p>
        {resource.dieSize && <p className="text-xs text-slate-400">{resource.dieSize}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button
          className="h-6 w-6 rounded border border-slate-300 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
          onClick={() => onChange(Math.max(0, resource.current - 1))}
        >
          −
        </button>
        <span className="w-12 text-center text-sm">
          {resource.current}/{resource.max}
        </span>
        <button
          className="h-6 w-6 rounded border border-slate-300 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
          onClick={() => onChange(Math.min(resource.max, resource.current + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function CharacterDetail({
  characterId,
  campaignId,
  onDeleted,
}: {
  characterId: string;
  campaignId: string;
  onDeleted: () => void;
}) {
  const { user } = useAuth();
  const { role } = useActiveCampaign(campaignId);
  const queryClient = useQueryClient();
  const reimportRef = useRef<HTMLInputElement>(null);
  const [reimportError, setReimportError] = useState<string | null>(null);
  const [newCondition, setNewCondition] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const characterQuery = useQuery({
    queryKey: ["character", characterId],
    queryFn: () => getFullCharacter(characterId),
  });
  const resourcesQuery = useQuery({
    queryKey: ["character-resources", characterId],
    queryFn: () => listResources(characterId),
  });
  const conditionsQuery = useQuery({
    queryKey: ["conditions", characterId],
    queryFn: () => listConditions(characterId),
  });
  const invalidateConditions = () => queryClient.invalidateQueries({ queryKey: ["conditions", characterId] });

  const character = characterQuery.data;
  const isOwner = character?.owner_user_id === user?.id;
  const isGm = role === "gm";
  const membersQuery = useQuery({
    queryKey: ["campaign-members", campaignId],
    queryFn: () => listCampaignMembers(campaignId),
    enabled: isGm,
  });
  const canEdit = isOwner || isGm;
  const invalidateCharacter = () => queryClient.invalidateQueries({ queryKey: ["character", characterId] });

  const skills = (character?.skills as Record<string, number> | undefined) ?? {};
  const saves = (character?.saves as Record<string, number> | undefined) ?? {};
  const stats = (character?.stats as AbilityScores | undefined) ?? null;
  const passivePerception = 10 + (skills.perception ?? 0);
  const coins = (character?.coins as Coins | undefined) ?? { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };

  const handleDelete = async () => {
    await deleteCharacter(characterId);
    await queryClient.invalidateQueries({ queryKey: ["characters", campaignId] });
    onDeleted();
  };

  const handleReimport = async (file: File) => {
    setReimportError(null);
    try {
      const text = await file.text();
      const normalized = parseLssJson(text);
      if (!user) throw new Error("Нет сессии");
      await upsertCharacterFromImport(campaignId, user.id, normalized, characterId);
      await queryClient.invalidateQueries({ queryKey: ["character", characterId] });
      await queryClient.invalidateQueries({ queryKey: ["characters", campaignId] });
    } catch (e) {
      setReimportError(e instanceof Error ? e.message : "Не удалось переимпортировать");
    }
  };

  if (characterQuery.isLoading) return <p className="p-4 text-sm text-slate-500 dark:text-slate-400">Загружаю...</p>;
  if (!character)
    return (
      <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
        Нет доступа к полному листу — попроси мастера проверить, на кого записан этот персонаж (экран персонажа → поле
        "Владелец").
      </p>
    );

  const rawImport = character.raw_import as Record<string, unknown> | null;
  const text = rawImport?.text as Record<string, { value?: unknown }> | undefined;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">{character.name}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {character.class}
            {character.subclass ? ` · ${character.subclass}` : ""} · ур.{" "}
            {character.level_override ?? character.level_from_sheet}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <button
                className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                onClick={() => reimportRef.current?.click()}
              >
                Переимпортировать
              </button>
              <input
                ref={reimportRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleReimport(file);
                  e.target.value = "";
                }}
              />
            </>
          )}
          {canEdit && !confirmingDelete && (
            <button
              className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              onClick={() => setConfirmingDelete(true)}
            >
              Удалить
            </button>
          )}
          {confirmingDelete && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-red-600 dark:text-red-400">Точно?</span>
              <button className="rounded bg-red-700 px-2 py-1 text-white" onClick={handleDelete}>
                Да
              </button>
              <button className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" onClick={() => setConfirmingDelete(false)}>
                Нет
              </button>
            </div>
          )}
        </div>
      </div>
      {reimportError && <p className="text-sm text-red-600 dark:text-red-400">{reimportError}</p>}

      {isGm && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 dark:text-slate-400">Владелец:</span>
          <select
            value={character.owner_user_id ?? ""}
            onChange={(e) =>
              setCharacterOwner(characterId, e.target.value || null).then(() => {
                invalidateCharacter();
                queryClient.invalidateQueries({ queryKey: ["characters", campaignId] });
              })
            }
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            <option value="">— без владельца (NPC) —</option>
            {membersQuery.data?.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.displayName} {m.role === "gm" ? "(мастер)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
          <p className="text-slate-400 dark:text-slate-500">HP</p>
          {canEdit ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                defaultValue={character.hp_current}
                key={`hp-current-${character.hp_current}`}
                onBlur={(e) => updateVitals(characterId, { hpCurrent: Number(e.target.value) }).then(invalidateCharacter)}
                className="w-12 rounded border border-slate-300 bg-white px-1 py-0.5 text-sm dark:border-slate-600 dark:bg-slate-800"
              />
              <span>/</span>
              <input
                type="number"
                defaultValue={character.hp_max}
                key={`hp-max-${character.hp_max}`}
                onBlur={(e) => updateVitals(characterId, { hpMax: Number(e.target.value) }).then(invalidateCharacter)}
                className="w-12 rounded border border-slate-300 bg-white px-1 py-0.5 text-sm dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
          ) : (
            <p>
              {character.hp_current}/{character.hp_max}
            </p>
          )}
        </div>
        <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
          <p className="text-slate-400 dark:text-slate-500">Врем. хиты</p>
          {canEdit ? (
            <input
              type="number"
              defaultValue={character.hp_temp}
              key={`hp-temp-${character.hp_temp}`}
              onBlur={(e) => updateVitals(characterId, { hpTemp: Number(e.target.value) }).then(invalidateCharacter)}
              className="w-14 rounded border border-slate-300 bg-white px-1 py-0.5 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          ) : (
            <p>{character.hp_temp}</p>
          )}
        </div>
        <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
          <p className="text-slate-400 dark:text-slate-500">КД</p>
          <p>{character.ac}</p>
        </div>
        <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
          <p className="text-slate-400 dark:text-slate-500">Пас. восприятие</p>
          <p>{passivePerception}</p>
        </div>
        <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
          <p className="text-slate-400 dark:text-slate-500">Кость хитов</p>
          <p>{character.hit_die || "—"}</p>
        </div>
        <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
          <p className="text-slate-400 dark:text-slate-500">Вдохновение</p>
          <p>{character.inspiration ? "да" : "нет"}</p>
        </div>
        {character.is_dying && (
          <div className="rounded border border-red-200 p-2 dark:border-red-900">
            <p className="text-red-500 dark:text-red-400">При смерти</p>
            <p>
              успехи {character.death_successes}/3 · провалы {character.death_fails}/3
            </p>
          </div>
        )}
      </div>

      {stats && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Характеристики</h3>
          <div className="grid grid-cols-3 gap-2 text-center text-sm sm:grid-cols-6">
            {ABILITY_ORDER.map((k) => (
              <div key={k} className="rounded border border-slate-200 p-2 dark:border-slate-700">
                <p className="text-xs text-slate-400 dark:text-slate-500">{ABILITY_FULL_LABELS[k]}</p>
                <p className="text-base font-semibold">{stats[k]}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {fmtMod(abilityMod(stats[k]))} / спас {fmtMod(saves[k] ?? abilityMod(stats[k]))}
                </p>
              </div>
            ))}
          </div>
          {Object.keys(skills).length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
              {Object.entries(skills)
                .sort(([a], [b]) => (SKILL_LABELS[a] ?? a).localeCompare(SKILL_LABELS[b] ?? b, "ru"))
                .map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">{SKILL_LABELS[key] ?? key}</span>
                    <span className="text-slate-400 dark:text-slate-500">{fmtMod(value)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Деньги</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          {COIN_LABELS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-1">
              {label}
              <input
                type="number"
                min={0}
                defaultValue={coins[key]}
                key={`${key}-${coins[key]}`}
                disabled={!canEdit}
                onBlur={(e) =>
                  updateCoins(characterId, { ...coins, [key]: Number(e.target.value) }).then(invalidateCharacter)
                }
                className="w-16 rounded border border-slate-300 bg-white px-1 py-0.5 text-sm disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800"
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Ресурсы</h3>
        <div className="flex flex-col gap-2">
          {resourcesQuery.data?.length ? (
            resourcesQuery.data.map((r) => (
              <ResourceRow
                key={r.id}
                resource={r}
                onChange={(next) =>
                  setResourceCurrent(r.id, next).then(() =>
                    queryClient.invalidateQueries({ queryKey: ["character-resources", characterId] }),
                  )
                }
              />
            ))
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">Нет отслеживаемых ресурсов.</p>
          )}
        </div>
      </div>

      <CharacterItemsSection characterId={characterId} campaignId={campaignId} canEdit={canEdit} />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Состояния</h3>
        <div className="flex flex-wrap gap-2">
          {conditionsQuery.data?.filter((c) => c.isActive).map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {c.name}
              <button className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" onClick={() => clearCondition(c.id).then(invalidateConditions)}>
                ×
              </button>
            </span>
          ))}
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newCondition.trim()) return;
              addCondition(characterId, newCondition.trim()).then(() => {
                setNewCondition("");
                invalidateConditions();
              });
            }}
          >
            <input
              placeholder="+ состояние"
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
              className="w-28 rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
            />
          </form>
        </div>
      </div>

      {text && (
        <details className="rounded border border-slate-200 p-3 text-sm dark:border-slate-700">
          <summary className="cursor-pointer font-semibold text-slate-600 dark:text-slate-300">Полный лист</summary>
          <div className="mt-2 flex flex-col gap-3">
            {Object.entries({
              Предыстория: text.background?.value,
              Личность: text.personality?.value,
              Идеалы: text.ideals?.value,
              Узы: text.bonds?.value,
              Изъяны: text.flaws?.value,
              Снаряжение: text.equipment?.value,
              Черты: text.feats?.value,
            }).map(([label, value]) => {
              const plain = value ? tiptapToPlainText(value) : "";
              if (!plain) return null;
              return (
                <div key={label}>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">{label}</p>
                  <p className="whitespace-pre-wrap text-sm">{plain}</p>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
