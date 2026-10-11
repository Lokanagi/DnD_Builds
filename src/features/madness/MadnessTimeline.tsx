import { Fragment } from "react";
import type { CharacterSummary } from "@/features/characters/charactersApi";
import type { MadnessEvent, MadnessTier } from "./madnessApi";

const TIER_DOT: Record<MadnessTier, string> = {
  short: "bg-yellow-400",
  long: "bg-red-600",
  permanent: "bg-black dark:bg-white",
};

const TIER_LABEL: Record<MadnessTier, string> = {
  short: "Кратковременное",
  long: "Долговременное",
  permanent: "Бессрочное",
};

const DAY_COL_WIDTH = 28;
const LABEL_COL_WIDTH = 160;
const ROW_HEIGHT = 36;

export function MadnessTimeline({
  characters,
  events,
  currentDay,
  onEventClick,
}: {
  characters: CharacterSummary[];
  events: MadnessEvent[];
  currentDay: number;
  onEventClick: (event: MadnessEvent) => void;
}) {
  const earliestDay = events.length ? Math.min(1, ...events.map((e) => e.campaignDay)) : 1;
  const latestDay = Math.max(currentDay, ...events.map((e) => e.campaignDay), 1);
  const dayCount = latestDay - earliestDay + 1;
  const days = Array.from({ length: dayCount }, (_, i) => earliestDay + i);

  const eventsByCharacterAndDay = new Map<string, MadnessEvent[]>();
  for (const event of events) {
    const key = `${event.characterId}:${event.campaignDay}`;
    const bucket = eventsByCharacterAndDay.get(key) ?? [];
    bucket.push(event);
    eventsByCharacterAndDay.set(key, bucket);
  }

  if (characters.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500">Сначала импортируй персонажей.</p>;
  }

  return (
    <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `${LABEL_COL_WIDTH}px repeat(${dayCount}, ${DAY_COL_WIDTH}px)`,
          gridTemplateRows: `${ROW_HEIGHT}px repeat(${characters.length}, ${ROW_HEIGHT}px)`,
        }}
      >
        {/* corner */}
        <div
          className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
          style={{ gridColumn: 1, gridRow: 1 }}
        />
        {days.map((day, i) => (
          <div
            key={day}
            className={`flex items-center justify-center border-b border-slate-100 text-[10px] text-slate-400 dark:border-slate-800 dark:text-slate-500 ${day === currentDay ? "bg-slate-100 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300" : ""}`}
            style={{ gridColumn: i + 2, gridRow: 1 }}
          >
            {day}
          </div>
        ))}

        {characters.map((character, rowIndex) => {
          const durationBars = events.filter(
            (e) => e.characterId === character.id && e.tier === "long" && e.durationDays !== null,
          );
          return (
            <Fragment key={character.id}>
              <div
                className="sticky left-0 z-10 flex items-center truncate border-r border-slate-200 bg-white px-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                style={{ gridColumn: 1, gridRow: rowIndex + 2 }}
                title={character.name}
              >
                {character.name}
              </div>
              {durationBars.map((e) => {
                const endDay = Math.min(e.campaignDay + (e.durationDays as number), latestDay);
                const colStart = e.campaignDay - earliestDay + 2;
                const colEnd = endDay - earliestDay + 2 + 1;
                if (colEnd <= colStart) return null;
                return (
                  <div
                    key={`${e.id}-bar`}
                    title={`Долговременное «${e.title}»: день ${e.campaignDay} → ${e.campaignDay + (e.durationDays as number)}`}
                    className={`h-1 self-end justify-self-stretch rounded-full ${e.status === "active" ? "bg-red-300 dark:bg-red-900" : "bg-red-100 dark:bg-red-950"}`}
                    style={{ gridColumn: `${colStart} / ${colEnd}`, gridRow: rowIndex + 2, marginBottom: 4 }}
                  />
                );
              })}
              {days.map((day, colIndex) => {
                const dayEvents = eventsByCharacterAndDay.get(`${character.id}:${day}`);
                return (
                  <div
                    key={`${character.id}-${day}`}
                    className="relative border-b border-l border-slate-50 dark:border-slate-800"
                    style={{ gridColumn: colIndex + 2, gridRow: rowIndex + 2 }}
                  >
                    {dayEvents && (
                      <div className="absolute inset-0 flex items-center justify-center gap-0.5">
                        {dayEvents.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            title={`${TIER_LABEL[e.tier]}: ${e.title}${e.status !== "active" ? " (разрешено)" : ""}`}
                            onClick={() => onEventClick(e)}
                            className={`h-2.5 w-2.5 rounded-full ring-offset-1 hover:ring-2 hover:ring-slate-400 ${TIER_DOT[e.tier]} ${e.status !== "active" ? "opacity-40" : ""}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
