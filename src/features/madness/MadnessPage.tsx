import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCampaignStore } from "@/stores/campaignStore";
import { useActiveCampaign } from "@/features/campaigns/useActiveCampaign";
import { advanceDay, setMadnessThresholds } from "@/features/campaigns/campaignApi";
import type { MadnessThresholds } from "@/types/campaign";
import { useAuth } from "@/features/auth/useAuth";
import { listCharacterSummaries } from "@/features/characters/charactersApi";
import { getMoonCatalog, getMoonState, listMoonHistory } from "@/features/moons/moonsApi";
import {
  addMadnessEvent,
  computeEscalations,
  computeExpiredEvents,
  listMadnessEvents,
  resolveMadnessEvent,
  rollLongTermDurationDays,
  type MadnessEvent,
  type MadnessTier,
} from "./madnessApi";
import { addDisease, computeExpiredDiseases, listDiseases, resolveDisease, type Disease } from "./diseasesApi";
import { MadnessTimeline } from "./MadnessTimeline";
import { EventDetailModal } from "./EventDetailModal";
import { DiseaseDetailModal } from "./DiseaseDetailModal";

function ThresholdsSettings({
  campaignId,
  thresholds,
  onSaved,
}: {
  campaignId: string;
  thresholds: MadnessThresholds;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(thresholds);
  const [busy, setBusy] = useState(false);

  const field = (key: keyof MadnessThresholds, label: string) => (
    <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
      {label}
      <input
        type="number"
        min={1}
        value={draft[key]}
        onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}
        className="w-14 rounded border border-slate-300 bg-white px-1 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-800"
      />
    </label>
  );

  return (
    <details className="rounded border border-slate-200 p-3 text-sm dark:border-slate-700">
      <summary className="cursor-pointer text-xs font-semibold text-slate-500 dark:text-slate-400">Пороги эскалации (по правилам книги, можно подкрутить)</summary>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        {field("shortCount", "кратковр.")}
        <span className="text-xs text-slate-400 dark:text-slate-500">за</span>
        {field("shortWindowDays", "дней → долговр.")}
        {field("longCount", "долговр.")}
        <span className="text-xs text-slate-400 dark:text-slate-500">за</span>
        {field("longWindowDays", "дней → бессрочное")}
        <button
          disabled={busy}
          className="rounded bg-slate-800 px-2 py-1 text-xs text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
          onClick={() => {
            setBusy(true);
            setMadnessThresholds(campaignId, draft)
              .then(onSaved)
              .finally(() => setBusy(false));
          }}
        >
          Сохранить
        </button>
      </div>
    </details>
  );
}

const TIER_LABEL: Record<MadnessTier, string> = {
  short: "Кратковременное",
  long: "Долговременное",
  permanent: "Бессрочное",
};

function EventHistoryRow({
  event,
  isGm,
  onResolved,
  onOpen,
}: {
  event: MadnessEvent;
  isGm: boolean;
  onResolved: () => void;
  onOpen: (event: MadnessEvent) => void;
}) {
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState("");

  return (
    <div className="rounded border border-slate-100 px-2 py-1 text-sm dark:border-slate-800">
      <div className="flex items-center justify-between">
        <button type="button" className="text-left hover:underline" onClick={() => onOpen(event)}>
          День {event.campaignDay} · {event.characterName} · {TIER_LABEL[event.tier]} — {event.title}
          {event.status !== "active" && (
            <span className="text-xs text-slate-400 dark:text-slate-500"> ({event.status === "cured" ? "излечено" : "разрешено"})</span>
          )}
        </button>
        {event.status === "active" && isGm && !resolving && (
          <button className="text-xs text-slate-500 underline dark:text-slate-400" onClick={() => setResolving(true)}>
            Разрешить
          </button>
        )}
      </div>
      {resolving && (
        <div className="mt-1 flex items-center gap-2">
          <input
            placeholder="Заметка об излечении (необязательно)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
          />
          <button
            className="rounded bg-slate-800 px-2 py-1 text-xs text-white dark:bg-slate-200 dark:text-slate-900"
            onClick={() => resolveMadnessEvent(event.id, "cured", note).then(onResolved)}
          >
            Излечено
          </button>
          <button
            className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600"
            onClick={() => resolveMadnessEvent(event.id, "resolved", note).then(onResolved)}
          >
            Разрешено иначе
          </button>
          <button className="text-xs text-slate-400 dark:text-slate-500" onClick={() => setResolving(false)}>
            Отмена
          </button>
        </div>
      )}
    </div>
  );
}

function DiseaseHistoryRow({
  disease,
  isGm,
  onResolved,
  onOpen,
}: {
  disease: Disease;
  isGm: boolean;
  onResolved: () => void;
  onOpen: (disease: Disease) => void;
}) {
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState("");

  return (
    <div className="rounded border border-emerald-100 px-2 py-1 text-sm dark:border-emerald-900">
      <div className="flex items-center justify-between">
        <button type="button" className="text-left hover:underline" onClick={() => onOpen(disease)}>
          День {disease.campaignDay} · {disease.characterName} · Болезнь — {disease.title}
          {disease.status !== "active" && (
            <span className="text-xs text-slate-400 dark:text-slate-500"> ({disease.status === "cured" ? "излечено" : "разрешено"})</span>
          )}
        </button>
        {disease.status === "active" && isGm && !resolving && (
          <button className="text-xs text-slate-500 underline dark:text-slate-400" onClick={() => setResolving(true)}>
            Разрешить
          </button>
        )}
      </div>
      {resolving && (
        <div className="mt-1 flex items-center gap-2">
          <input
            placeholder="Заметка об излечении (необязательно)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
          />
          <button
            className="rounded bg-slate-800 px-2 py-1 text-xs text-white dark:bg-slate-200 dark:text-slate-900"
            onClick={() => resolveDisease(disease.id, "cured", note).then(onResolved)}
          >
            Излечено
          </button>
          <button
            className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600"
            onClick={() => resolveDisease(disease.id, "resolved", note).then(onResolved)}
          >
            Разрешено иначе
          </button>
          <button className="text-xs text-slate-400 dark:text-slate-500" onClick={() => setResolving(false)}>
            Отмена
          </button>
        </div>
      )}
    </div>
  );
}

function AddEventForm({
  campaignId,
  currentDay,
  prefill,
  onAdded,
}: {
  campaignId: string;
  currentDay: number;
  prefill?: { characterId: string; tier: MadnessTier };
  onAdded: () => void;
}) {
  const { user } = useAuth();
  const charactersQuery = useQuery({
    queryKey: ["characters", campaignId],
    queryFn: () => listCharacterSummaries(campaignId),
  });
  const [characterId, setCharacterId] = useState(prefill?.characterId ?? "");
  const [tier, setTier] = useState<MadnessTier>(prefill?.tier ?? "short");
  const [title, setTitle] = useState("");
  const [causeNote, setCauseNote] = useState("");
  const [day, setDay] = useState(currentDay);
  const [durationDays, setDurationDays] = useState<number>(() =>
    (prefill?.tier ?? "short") === "long" ? rollLongTermDurationDays() : 0,
  );
  const [busy, setBusy] = useState(false);

  const handleTierChange = (next: MadnessTier) => {
    setTier(next);
    if (next === "long") setDurationDays(rollLongTermDurationDays());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !characterId || !title) return;
    setBusy(true);
    try {
      await addMadnessEvent(
        campaignId,
        characterId,
        tier,
        title,
        causeNote,
        user.id,
        day,
        tier === "long" ? durationDays : null,
      );
      setTitle("");
      setCauseNote("");
      onAdded();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Добавить событие</h3>
      <div className="flex gap-2">
        <select
          required
          value={characterId}
          onChange={(e) => setCharacterId(e.target.value)}
          className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
        >
          <option value="">Персонаж...</option>
          {charactersQuery.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={tier}
          onChange={(e) => handleTierChange(e.target.value as MadnessTier)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
        >
          <option value="short">Кратковременное</option>
          <option value="long">Долговременное</option>
          <option value="permanent">Бессрочное</option>
        </select>
        <input
          type="number"
          min={1}
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          title="День кампании"
          className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
        />
      </div>
      {tier === "long" && (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <label className="flex items-center gap-1">
            Длительность (дней)
            <input
              type="number"
              min={1}
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-16 rounded border border-slate-300 bg-white px-1 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          <button
            type="button"
            className="underline dark:text-slate-300"
            onClick={() => setDurationDays(rollLongTermDurationDays())}
          >
            Перебросить (1d4×7)
          </button>
          <span>кончится в день {day + durationDays}</span>
        </div>
      )}
      <input
        required
        placeholder="Название"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
      />
      <input
        placeholder="Причина (необязательно)"
        value={causeNote}
        onChange={(e) => setCauseNote(e.target.value)}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
      />
      <button
        disabled={busy}
        className="w-fit rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
      >
        Добавить
      </button>
    </form>
  );
}

function AddDiseaseForm({ campaignId, currentDay, onAdded }: { campaignId: string; currentDay: number; onAdded: () => void }) {
  const { user } = useAuth();
  const charactersQuery = useQuery({
    queryKey: ["characters", campaignId],
    queryFn: () => listCharacterSummaries(campaignId),
  });
  const [characterId, setCharacterId] = useState("");
  const [title, setTitle] = useState("");
  const [causeNote, setCauseNote] = useState("");
  const [day, setDay] = useState(currentDay);
  const [durationDays, setDurationDays] = useState(0);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !characterId || !title) return;
    setBusy(true);
    try {
      await addDisease(campaignId, characterId, title, causeNote, user.id, day, durationDays || null);
      setTitle("");
      setCauseNote("");
      setDurationDays(0);
      onAdded();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-emerald-200 p-4 dark:border-emerald-900">
      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Добавить болезнь</h3>
      <div className="flex gap-2">
        <select
          required
          value={characterId}
          onChange={(e) => setCharacterId(e.target.value)}
          className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
        >
          <option value="">Персонаж...</option>
          {charactersQuery.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          title="День кампании"
          className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <label className="flex items-center gap-1">
          Длительность (дней, 0 = неизвестно)
          <input
            type="number"
            min={0}
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value))}
            className="w-16 rounded border border-slate-300 bg-white px-1 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
        {durationDays > 0 && <span>кончится в день {day + durationDays}</span>}
      </div>
      <input
        required
        placeholder="Название"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
      />
      <input
        placeholder="Причина / симптомы (необязательно)"
        value={causeNote}
        onChange={(e) => setCauseNote(e.target.value)}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
      />
      <button
        disabled={busy}
        className="w-fit rounded bg-emerald-700 px-3 py-1.5 text-sm text-white hover:bg-emerald-800 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
      >
        Добавить
      </button>
    </form>
  );
}

export function MadnessPage() {
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const { campaign, role } = useActiveCampaign(activeCampaignId);
  const isGm = role === "gm";
  const queryClient = useQueryClient();
  const [prefill, setPrefill] = useState<{ characterId: string; tier: MadnessTier } | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<MadnessEvent | null>(null);
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);

  const charactersQuery = useQuery({
    queryKey: ["characters", activeCampaignId],
    queryFn: () => listCharacterSummaries(activeCampaignId!),
    enabled: !!activeCampaignId,
  });
  const eventsQuery = useQuery({
    queryKey: ["madness-events", activeCampaignId],
    queryFn: () => listMadnessEvents(activeCampaignId!),
    enabled: !!activeCampaignId,
  });
  const diseasesQuery = useQuery({
    queryKey: ["diseases", activeCampaignId],
    queryFn: () => listDiseases(activeCampaignId!),
    enabled: !!activeCampaignId,
  });
  const moonCatalogQuery = useQuery({ queryKey: ["moon-catalog"], queryFn: getMoonCatalog });
  const moonStateQuery = useQuery({
    queryKey: ["moon-state", activeCampaignId],
    queryFn: () => getMoonState(activeCampaignId!),
    enabled: !!activeCampaignId,
  });
  const moonHistoryQuery = useQuery({
    queryKey: ["moon-history", activeCampaignId],
    queryFn: () => listMoonHistory(activeCampaignId!),
    enabled: !!activeCampaignId,
  });

  if (!activeCampaignId || !campaign) return null;

  // 7.1: overlay which moon was active on which campaign day. Closed
  // periods come from moon_history (started/ended); the currently active
  // moon (if any) is still open-ended, so its band runs through today.
  const moonPeriods = [
    ...(moonHistoryQuery.data ?? [])
      .filter((h) => h.startedDay !== null && h.endedDay !== null)
      .map((h) => ({ name: h.moonName, startDay: h.startedDay as number, endDay: h.endedDay as number })),
    ...(moonStateQuery.data?.currentMoonId && moonStateQuery.data.startedDay !== null
      ? [
          {
            name: moonCatalogQuery.data?.find((m) => m.id === moonStateQuery.data!.currentMoonId)?.name ?? "?",
            startDay: moonStateQuery.data.startedDay,
            endDay: campaign.currentDay,
          },
        ]
      : []),
  ];

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["madness-events", activeCampaignId] });
    void queryClient.invalidateQueries({ queryKey: ["diseases", activeCampaignId] });
    void queryClient.invalidateQueries({ queryKey: ["campaign", activeCampaignId] });
  };

  const events = eventsQuery.data ?? [];
  const diseases = diseasesQuery.data ?? [];
  const escalations = computeEscalations(events, campaign.currentDay, campaign.madnessThresholds);
  const expiredEvents = computeExpiredEvents(events, campaign.currentDay);
  const expiredDiseases = computeExpiredDiseases(diseases, campaign.currentDay);
  const activeEvents = [...events].sort((a, b) => b.campaignDay - a.campaignDay);
  const activeDiseases = [...diseases].sort((a, b) => b.campaignDay - a.campaignDay);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Таймлайн безумия и болезней</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 dark:text-slate-400">День {campaign.currentDay}</span>
          {isGm && (
            <>
              <button
                className="h-6 w-6 rounded border border-slate-300 text-xs hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                onClick={() => advanceDay(activeCampaignId, -1).then(invalidate)}
              >
                −
              </button>
              <button
                className="h-6 w-6 rounded border border-slate-300 text-xs hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                onClick={() => advanceDay(activeCampaignId, 1).then(invalidate)}
              >
                +
              </button>
            </>
          )}
        </div>
      </div>

      {isGm && (
        <ThresholdsSettings campaignId={activeCampaignId} thresholds={campaign.madnessThresholds} onSaved={invalidate} />
      )}

      {expiredEvents.length > 0 && (
        <div className="flex flex-col gap-1">
          {expiredEvents.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950"
            >
              <span>
                <strong>{e.characterName}</strong>: долговременное «{e.title}» должно было закончиться в день{" "}
                {e.endDay} (сейчас день {campaign.currentDay}).
              </span>
              {isGm && (
                <button
                  className="rounded bg-amber-700 px-2 py-1 text-xs text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700"
                  onClick={() => resolveMadnessEvent(e.id, "cured", `Срок истёк (день ${e.endDay})`).then(invalidate)}
                >
                  Разрешить
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {expiredDiseases.length > 0 && (
        <div className="flex flex-col gap-1">
          {expiredDiseases.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-800 dark:bg-emerald-950"
            >
              <span>
                <strong>{d.characterName}</strong>: болезнь «{d.title}» должна была закончиться в день {d.endDay}{" "}
                (сейчас день {campaign.currentDay}).
              </span>
              {isGm && (
                <button
                  className="rounded bg-emerald-700 px-2 py-1 text-xs text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                  onClick={() => resolveDisease(d.id, "cured", `Срок истёк (день ${d.endDay})`).then(invalidate)}
                >
                  Разрешить
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {escalations.length > 0 && (
        <div className="flex flex-col gap-1">
          {escalations.map((esc) => (
            <div
              key={`${esc.characterId}-${esc.triggerTier}`}
              className="flex items-center justify-between rounded border border-red-200 bg-red-50 px-3 py-2 text-sm dark:border-red-900 dark:bg-red-950"
            >
              <span>
                <strong>{esc.characterName}</strong>: {esc.count}{" "}
                {esc.triggerTier === "permanent" ? "долговременных" : "кратковременных"} в окне — должен получить{" "}
                {esc.triggerTier === "permanent" ? "бессрочное" : "долговременное"} безумие.
              </span>
              {isGm && (
                <button
                  className="rounded bg-red-700 px-2 py-1 text-xs text-white hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700"
                  onClick={() => setPrefill({ characterId: esc.characterId, tier: esc.triggerTier })}
                >
                  Добавить {esc.triggerTier === "permanent" ? "бессрочное" : "долговременное"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <MadnessTimeline
        characters={charactersQuery.data ?? []}
        events={events}
        diseases={diseases}
        currentDay={campaign.currentDay}
        moonPeriods={moonPeriods}
        onEventClick={setSelectedEvent}
        onDiseaseClick={setSelectedDisease}
      />

      {isGm && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AddEventForm
            // Remount on prefill change — the form's state is only ever
            // seeded from `prefill` at mount, so a second escalation banner
            // click while the form is already open needs a fresh instance.
            key={prefill ? `${prefill.characterId}:${prefill.tier}` : "blank"}
            campaignId={activeCampaignId}
            currentDay={campaign.currentDay}
            prefill={prefill}
            onAdded={() => {
              setPrefill(undefined);
              invalidate();
            }}
          />
          <AddDiseaseForm campaignId={activeCampaignId} currentDay={campaign.currentDay} onAdded={invalidate} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {activeEvents.map((event) => (
          <EventHistoryRow key={event.id} event={event} isGm={isGm} onResolved={invalidate} onOpen={setSelectedEvent} />
        ))}
        {activeDiseases.map((disease) => (
          <DiseaseHistoryRow key={disease.id} disease={disease} isGm={isGm} onResolved={invalidate} onOpen={setSelectedDisease} />
        ))}
      </div>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          characters={charactersQuery.data ?? []}
          isGm={isGm}
          onClose={() => setSelectedEvent(null)}
          onChanged={invalidate}
        />
      )}
      {selectedDisease && (
        <DiseaseDetailModal
          disease={selectedDisease}
          characters={charactersQuery.data ?? []}
          isGm={isGm}
          onClose={() => setSelectedDisease(null)}
          onChanged={invalidate}
        />
      )}
    </div>
  );
}
