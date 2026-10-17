import { useState } from "react";
import type { CharacterSummary } from "@/features/characters/charactersApi";
import { resolveDisease, updateDisease, type Disease } from "./diseasesApi";

export function DiseaseDetailModal({
  disease,
  characters,
  isGm,
  onClose,
  onChanged,
}: {
  disease: Disease;
  characters: CharacterSummary[];
  isGm: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [title, setTitle] = useState(disease.title);
  const [causeNote, setCauseNote] = useState(disease.causeNote ?? "");
  const [day, setDay] = useState(disease.campaignDay);
  const [durationDays, setDurationDays] = useState(disease.durationDays ?? 0);
  const [resolutionNote, setResolutionNote] = useState("");
  const [busy, setBusy] = useState(false);

  const characterName = characters.find((c) => c.id === disease.characterId)?.name ?? disease.characterName;

  const handleSave = async () => {
    setBusy(true);
    try {
      await updateDisease(disease.id, { title, causeNote, campaignDay: day, durationDays: durationDays || null });
      onChanged();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleResolve = async (status: "cured" | "resolved") => {
    setBusy(true);
    try {
      await resolveDisease(disease.id, status, resolutionNote);
      onChanged();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {!editing ? (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold">{disease.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {characterName} · Болезнь · день {disease.campaignDay}
                  {disease.durationDays ? ` (${disease.durationDays} дн.)` : ""}
                </p>
              </div>
              <button className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" onClick={onClose}>
                ×
              </button>
            </div>

            {disease.causeNote && <p className="mt-2 text-sm">{disease.causeNote}</p>}

            <p className="mt-2 text-xs text-slate-400">
              Статус: {disease.status === "active" ? "активна" : disease.status === "cured" ? "излечена" : "разрешена"}
            </p>
            {disease.resolutionNote && <p className="text-xs text-slate-400">Заметка: {disease.resolutionNote}</p>}

            {isGm && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="rounded border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                  onClick={() => setEditing(true)}
                >
                  Редактировать
                </button>
                {disease.status === "active" && !resolving && (
                  <button
                    className="rounded border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                    onClick={() => setResolving(true)}
                  >
                    Разрешить
                  </button>
                )}
              </div>
            )}

            {resolving && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  placeholder="Заметка (необязательно)"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                />
                <button disabled={busy} className="rounded bg-slate-800 px-2 py-1 text-xs text-white dark:bg-slate-200 dark:text-slate-900" onClick={() => handleResolve("cured")}>
                  Излечено
                </button>
                <button disabled={busy} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600" onClick={() => handleResolve("resolved")}>
                  Иначе
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Редактировать болезнь</h3>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название"
              className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
            <input
              value={causeNote}
              onChange={(e) => setCauseNote(e.target.value)}
              placeholder="Причина / симптомы"
              className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1">
                День
                <input
                  type="number"
                  min={1}
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                  className="w-16 rounded border border-slate-300 px-1 py-0.5 dark:border-slate-600 dark:bg-slate-800"
                />
              </label>
              <label className="flex items-center gap-1">
                Длительность (дн., 0 = неизвестно)
                <input
                  type="number"
                  min={0}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-16 rounded border border-slate-300 px-1 py-0.5 dark:border-slate-600 dark:bg-slate-800"
                />
              </label>
            </div>
            <div className="mt-2 flex gap-2">
              <button disabled={busy} className="rounded bg-slate-800 px-3 py-1 text-xs text-white dark:bg-slate-200 dark:text-slate-900" onClick={handleSave}>
                Сохранить
              </button>
              <button className="rounded border border-slate-300 px-3 py-1 text-xs dark:border-slate-600" onClick={() => setEditing(false)}>
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
