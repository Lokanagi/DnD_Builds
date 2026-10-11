import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFullCharacter, listResources, setResourceCurrent, upsertCharacterFromImport } from "./charactersApi";
import { addCondition, clearCondition, listConditions } from "./conditionsApi";
import { parseLssJson } from "./import/lssMapper";
import { tiptapToPlainText } from "./import/tiptapText";
import { useAuth } from "@/features/auth/useAuth";

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

export function CharacterDetail({ characterId, campaignId }: { characterId: string; campaignId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const reimportRef = useRef<HTMLInputElement>(null);
  const [reimportError, setReimportError] = useState<string | null>(null);
  const [newCondition, setNewCondition] = useState("");

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
  if (!character) return <p className="p-4 text-sm text-slate-500 dark:text-slate-400">Нет доступа к полному листу.</p>;

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
        {isOwner && (
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
      </div>
      {reimportError && <p className="text-sm text-red-600 dark:text-red-400">{reimportError}</p>}

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
          <p className="text-slate-400 dark:text-slate-500">HP</p>
          <p>
            {character.hp_current}/{character.hp_max}
            {character.hp_temp ? ` (+${character.hp_temp})` : ""}
          </p>
        </div>
        <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
          <p className="text-slate-400 dark:text-slate-500">КД</p>
          <p>{character.ac}</p>
        </div>
        <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
          <p className="text-slate-400 dark:text-slate-500">Кость хитов</p>
          <p>{character.hit_die}</p>
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
