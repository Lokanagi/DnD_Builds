import { supabase } from "@/lib/supabase/client";

export type MoonCatalogEntry = {
  id: string;
  name: string;
  description: string | null;
  bookPage: number | null;
  defaultDurationNights: number;
  rangeLower: number;
  rangeUpperExclusive: number;
};

export type MoonState = {
  campaignId: string;
  currentMoonId: string | null;
  remainingDurationNights: number;
  summonCounter: number;
  startedDay: number | null;
};

export type MoonHistoryEntry = {
  id: string;
  moonId: string;
  moonName: string;
  startedDay: number | null;
  endedDay: number | null;
  durationNights: number | null;
  triggeredMethod: "random_d100" | "summon_counter" | "manual";
  note: string | null;
};

// Postgres int4range comes back from PostgREST as a text literal like "[1,21)".
function parseRange(range: string): { lower: number; upperExclusive: number } {
  const match = /^\[(\d+),(\d+)\)$/.exec(range);
  if (!match) throw new Error(`Не удалось разобрать диапазон d100: ${range}`);
  return { lower: Number(match[1]), upperExclusive: Number(match[2]) };
}

export async function getMoonCatalog(): Promise<MoonCatalogEntry[]> {
  const { data, error } = await supabase.from("moon_catalog").select("*").order("name");
  if (error) throw error;
  return data.map((row) => {
    const { lower, upperExclusive } = parseRange(row.d100_range as unknown as string);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      bookPage: row.book_page,
      defaultDurationNights: row.default_duration_nights,
      rangeLower: lower,
      rangeUpperExclusive: upperExclusive,
    };
  });
}

export async function getMoonState(campaignId: string): Promise<MoonState | null> {
  const { data, error } = await supabase.from("moon_state").select("*").eq("campaign_id", campaignId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    campaignId: data.campaign_id,
    currentMoonId: data.current_moon_id,
    remainingDurationNights: data.remaining_duration_nights,
    summonCounter: data.summon_counter,
    startedDay: data.started_day,
  };
}

export async function adjustDuration(campaignId: string, delta: number) {
  const state = await getMoonState(campaignId);
  const next = Math.max(0, (state?.remainingDurationNights ?? 0) + delta);
  const { error } = await supabase
    .from("moon_state")
    .upsert({ campaign_id: campaignId, remaining_duration_nights: next }, { onConflict: "campaign_id" });
  if (error) throw error;
}

export async function setSummonCounter(campaignId: string, value: number) {
  const clamped = Math.max(0, Math.min(1000, value));
  const { error } = await supabase
    .from("moon_state")
    .upsert({ campaign_id: campaignId, summon_counter: clamped }, { onConflict: "campaign_id" });
  if (error) throw error;
}

function rollMoonFromCatalog(catalog: MoonCatalogEntry[]): MoonCatalogEntry {
  const roll = 1 + Math.floor(Math.random() * 100); // 1..100
  const moon = catalog.find((m) => roll >= m.rangeLower && roll < m.rangeUpperExclusive);
  if (!moon) throw new Error(`Бросок d100=${roll} не попал ни в один диапазон лун`);
  return moon;
}

/**
 * Closes the current moon (if any) into moon_history, rolls/picks the next
 * one, and opens it as the new moon_state. `method` "random_d100" uses the
 * book's d100 table; "manual" requires `manualMoonId`. `currentDay` is the
 * campaign's current day (campaigns.current_day) — nights-elapsed and the
 * madness timeline overlay (7.1) both key off this, not real wall-clock
 * time, since a GM can trigger the next moon seconds apart in real life to
 * represent many in-game nights.
 */
export async function triggerNextMoon(
  campaignId: string,
  method: "random_d100" | "manual",
  currentDay: number,
  manualMoonId?: string,
) {
  const catalog = await getMoonCatalog();
  const current = await getMoonState(campaignId);

  if (current?.currentMoonId) {
    const startedDay = current.startedDay ?? currentDay;
    await supabase.from("moon_history").insert({
      campaign_id: campaignId,
      moon_id: current.currentMoonId,
      started_day: startedDay,
      ended_day: currentDay,
      duration_nights: Math.max(currentDay - startedDay, 1),
      triggered_method: method,
    });
  }

  const nextMoon =
    method === "manual"
      ? catalog.find((m) => m.id === manualMoonId) ?? (() => { throw new Error("Луна не выбрана"); })()
      : rollMoonFromCatalog(catalog);

  const { error } = await supabase.from("moon_state").upsert(
    {
      campaign_id: campaignId,
      current_moon_id: nextMoon.id,
      remaining_duration_nights: nextMoon.defaultDurationNights,
      started_day: currentDay,
    },
    { onConflict: "campaign_id" },
  );
  if (error) throw error;

  return nextMoon;
}

// ---------------------------------------------------------------------------
// Summon Counter Method forecast generator — book's table (p. 283-284).
// The counter (0-1000) picks a cadence; each cadence trigger rolls a dice
// count of moons and that many d100 picks (rerolling duplicates within the
// same trigger, per the book's "same moon can't appear twice" rule for the
// Lunar Method, applied here too for consistency).
// ---------------------------------------------------------------------------

type DiceCount = 1 | 2 | 3; // "1d4" / "2d4" / "3d4"

type SummonTier =
  | { kind: "none" } // 0-49: all moons vanish
  | { kind: "dormant_only"; everyDays: number } // 50-99: Dormant Moon, 1/year
  | { kind: "periodic"; everyDays: number; dice: DiceCount; rerollBloodMoon?: boolean }
  | { kind: "nightly_chance"; chanceNumerator: number; chanceDenominator: number } // 800-899: 1d2, "1" rises
  | { kind: "nightly_always" } // 900-999
  | { kind: "apocalypse" }; // 1000

export function summonTierFor(counter: number): SummonTier {
  if (counter <= 49) return { kind: "none" };
  if (counter <= 99) return { kind: "dormant_only", everyDays: 365 };
  if (counter <= 199) return { kind: "periodic", everyDays: 365, dice: 1, rerollBloodMoon: true };
  if (counter <= 299) return { kind: "periodic", everyDays: 365, dice: 2 };
  if (counter <= 399) return { kind: "periodic", everyDays: 365, dice: 3 };
  if (counter <= 499) return { kind: "periodic", everyDays: 30, dice: 1 };
  if (counter <= 599) return { kind: "periodic", everyDays: 14, dice: 1 };
  if (counter <= 699) return { kind: "periodic", everyDays: 7, dice: 1 };
  if (counter <= 799) return { kind: "periodic", everyDays: 4, dice: 1 };
  if (counter <= 899) return { kind: "nightly_chance", chanceNumerator: 1, chanceDenominator: 2 };
  if (counter <= 999) return { kind: "nightly_always" };
  return { kind: "apocalypse" };
}

/** Plain-language state of the current counter tier, shown live in the UI
 * instead of pointing the GM at the book — this is the book's table (p.
 * 283-284) already implemented as data in summonTierFor, just phrased out. */
export function describeSummonTier(counter: number): string {
  const tier = summonTierFor(counter);
  const diceLabel = (n: DiceCount) => `${n}d4`;
  switch (tier.kind) {
    case "none":
      return "Все Потусторонние луны исчезли — ни одна не взойдёт, пока счётчик не поднимется выше 49.";
    case "dormant_only":
      return "Восходит только Дремлющая Луна, примерно раз в год.";
    case "periodic": {
      const period = tier.everyDays === 365 ? "раз в год" : tier.everyDays === 30 ? "раз в месяц" : `каждые ${tier.everyDays} дн.`;
      const reroll = tier.rerollBloodMoon ? " (Кровавая Луна Перерождения в этой группе переигрывается)" : "";
      return `${period}: восходит ${diceLabel(tier.dice)} луны одновременно${reroll}.`;
    }
    case "nightly_chance":
      return `Каждую ночь шанс ${tier.chanceNumerator}/${tier.chanceDenominator}, что взойдёт новая луна.`;
    case "nightly_always":
      return "Каждую ночь восходит новая луна.";
    case "apocalypse":
      return "Счётчик достиг 1000 — Луярна поглощается Великими. Особый сюжетный исход, не для авто-генерации.";
  }
}

const rollD4 = () => 1 + Math.floor(Math.random() * 4);
const rollDice = (count: DiceCount) => Array.from({ length: count }, rollD4).reduce((a, b) => a + b, 0);

export type ForecastEvent = { day: number; moon: MoonCatalogEntry };

/**
 * Forecasts upcoming moon rises for `daysAhead` days from `startDay`, using
 * the Summon Counter Method tier the current counter value falls into. Pure
 * preview — does not write anything; the GM still confirms each rise
 * through the normal "Призвать следующую луну" action when that day comes.
 *
 * The 700+ tiers' "a moon can't rise again until all the others have"
 * constraint is tracked via a rotating cycle that resets early if the Blood
 * Moon of Rebirth comes up (book's own rule) or once all 12 have appeared.
 */
export function generateMoonForecast(
  summonCounter: number,
  startDay: number,
  daysAhead: number,
  catalog: MoonCatalogEntry[],
): { events: ForecastEvent[]; note: string } {
  const tier = summonTierFor(summonCounter);
  const bloodMoon = catalog.find((m) => m.name === "Кровавая Луна Перерождения");
  const dormantMoon = catalog.find((m) => m.name === "Дремлющая Луна");

  if (tier.kind === "none") {
    return { events: [], note: "Счётчик 0-49: все Потусторонние луны исчезают — восходов не будет." };
  }
  if (tier.kind === "apocalypse") {
    return { events: [], note: "Счётчик = 1000: Луярна поглощается Великими и стирается из мира — особый сюжетный исход, не для авто-генерации." };
  }

  const events: ForecastEvent[] = [];
  let cycleUsed = new Set<string>();

  const pickMoon = (restrictToUnused: boolean): MoonCatalogEntry => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const roll = 1 + Math.floor(Math.random() * 100);
      const moon = catalog.find((m) => roll >= m.rangeLower && roll < m.rangeUpperExclusive);
      if (!moon) continue;
      if (restrictToUnused && cycleUsed.has(moon.id) && cycleUsed.size < catalog.length) continue;
      return moon;
    }
    return catalog[0];
  };

  if (tier.kind === "dormant_only" && dormantMoon) {
    for (let day = startDay; day < startDay + daysAhead; day++) {
      if ((day - startDay) % tier.everyDays === 0 && day !== startDay) {
        events.push({ day, moon: dormantMoon });
      }
    }
    return { events, note: "Счётчик 50-99: Дремлющая луна восходит ~раз в год — на коротком окне событий может не быть, это нормально." };
  }

  if (tier.kind === "periodic") {
    for (let day = startDay; day < startDay + daysAhead; day++) {
      if ((day - startDay) % tier.everyDays !== 0) continue;
      const count = rollDice(tier.dice);
      const monthUsed = new Set<string>(); // no repeats within the same trigger
      for (let i = 0; i < count; i++) {
        let moon = pickMoon(false);
        let guard = 0;
        while (monthUsed.has(moon.id) && guard++ < 20) moon = pickMoon(false);
        if (tier.rerollBloodMoon && bloodMoon && moon.id === bloodMoon.id) {
          guard = 0;
          while (moon.id === bloodMoon.id && guard++ < 20) moon = pickMoon(false);
        }
        monthUsed.add(moon.id);
        events.push({ day, moon });
      }
    }
    const periodLabel = tier.everyDays === 365 ? "в год" : tier.everyDays === 30 ? "в месяц" : `каждые ${tier.everyDays} дн.`;
    return {
      events,
      note: tier.everyDays >= 30
        ? `Частота ~раз ${periodLabel} — на коротком окне событий может не быть, это нормально.`
        : `Срабатывает ${periodLabel}.`,
    };
  }

  if (tier.kind === "nightly_chance" || tier.kind === "nightly_always") {
    for (let day = startDay; day < startDay + daysAhead; day++) {
      const rises =
        tier.kind === "nightly_always" ||
        Math.floor(Math.random() * tier.chanceDenominator) < tier.chanceNumerator;
      if (!rises) continue;
      const moon = pickMoon(true);
      if (bloodMoon && moon.id === bloodMoon.id) {
        cycleUsed = new Set(); // book: Blood Moon resets the rotation
      } else {
        cycleUsed.add(moon.id);
        if (cycleUsed.size >= catalog.length) cycleUsed = new Set();
      }
      events.push({ day, moon });
    }
    return { events, note: "Каждая луна не повторится, пока не взойдут все остальные (сброс — Кровавая Луна Перерождения)." };
  }

  return { events, note: "" };
}

export async function listMoonHistory(campaignId: string): Promise<MoonHistoryEntry[]> {
  const { data, error } = await supabase
    .from("moon_history")
    .select("*, moon_catalog(name)")
    .eq("campaign_id", campaignId)
    .order("started_day", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    moonId: row.moon_id,
    moonName: (row.moon_catalog as { name: string } | null)?.name ?? "?",
    startedDay: row.started_day,
    endedDay: row.ended_day,
    durationNights: row.duration_nights,
    triggeredMethod: row.triggered_method,
    note: row.note,
  }));
}
