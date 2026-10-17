import { supabase } from "@/lib/supabase/client";

export type MoonCatalogEntry = {
  id: string;
  name: string;
  description: string | null;
  bookPage: number | null;
  defaultDurationNights: number;
  rangeLower: number;
  rangeUpperExclusive: number;
  isMundane: boolean;
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
// An empty range (used for the mundane moon, which should never match a d100
// roll) canonicalizes to the literal string "empty" on the way out, no
// matter how it was written — not "[0,0)".
function parseRange(range: string): { lower: number; upperExclusive: number } {
  if (range === "empty") return { lower: 0, upperExclusive: 0 };
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
      isMundane: row.is_mundane,
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

export async function setSummonCounter(campaignId: string, value: number) {
  const clamped = Math.max(0, Math.min(1000, value));
  const { error } = await supabase
    .from("moon_state")
    .upsert({ campaign_id: campaignId, summon_counter: clamped }, { onConflict: "campaign_id" });
  if (error) throw error;
}

function rollMoonFromCatalog(catalog: MoonCatalogEntry[]): MoonCatalogEntry {
  const rollable = catalog.filter((m) => !m.isMundane);
  const roll = 1 + Math.floor(Math.random() * 100); // 1..100
  const moon = rollable.find((m) => roll >= m.rangeLower && roll < m.rangeUpperExclusive);
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
  | { kind: "dormant_only" } // 50-99: Dormant Moon, 1/year
  | { kind: "yearly_spread"; dice: DiceCount; rerollBloodMoon?: boolean } // 100-399: total Xd4/year, max 1/month, spread out
  | { kind: "periodic"; everyDays: number; dice: DiceCount } // 400-699: simultaneous Xd4 every N days
  | { kind: "periodic_restricted"; everyDays: number } // 700-799: every 4 days, no repeats until all risen
  | { kind: "nightly_chance"; chanceNumerator: number; chanceDenominator: number } // 800-899: 1d2, "1" rises
  | { kind: "nightly_always" } // 900-999
  | { kind: "apocalypse" }; // 1000

export function summonTierFor(counter: number): SummonTier {
  if (counter <= 49) return { kind: "none" };
  if (counter <= 99) return { kind: "dormant_only" };
  if (counter <= 199) return { kind: "yearly_spread", dice: 1, rerollBloodMoon: true };
  if (counter <= 299) return { kind: "yearly_spread", dice: 2 };
  if (counter <= 399) return { kind: "yearly_spread", dice: 3 };
  if (counter <= 499) return { kind: "periodic", everyDays: 30, dice: 1 };
  if (counter <= 599) return { kind: "periodic", everyDays: 14, dice: 1 };
  if (counter <= 699) return { kind: "periodic", everyDays: 7, dice: 1 };
  if (counter <= 799) return { kind: "periodic_restricted", everyDays: 4 };
  if (counter <= 899) return { kind: "nightly_chance", chanceNumerator: 1, chanceDenominator: 2 };
  if (counter <= 999) return { kind: "nightly_always" };
  return { kind: "apocalypse" };
}

/** Plain-language state of the current counter tier, shown live in the UI
 * instead of pointing the GM at the book — this is the book's table (p.
 * 283-284) already implemented as data in summonTierFor, just phrased out. */
export function describeSummonTier(counter: number): string {
  const tier = summonTierFor(counter);
  switch (tier.kind) {
    case "none":
      return "Все Потусторонние луны исчезли — ни одна не взойдёт, пока счётчик не поднимется выше 49.";
    case "dormant_only":
      return "Восходит только Дремлющая Луна, примерно раз в год — на путешествия и существ не влияет.";
    case "yearly_spread": {
      const reroll = tier.rerollBloodMoon ? " Кровавая Луна Перерождения в этой группе переигрывается." : "";
      const intellectNote =
        tier.dice < 3
          ? " Луны не влияют на путешествия и на существ с Интеллектом ниже 18 — для них это обычные спутники."
          : " Луны влияют на путешествия и на всех существ, вне зависимости от Интеллекта.";
      return `За год взойдёт ${tier.dice}d4 луны в сумме, не чаще 1 в месяц.${reroll}${intellectNote}`;
    }
    case "periodic": {
      const period = tier.everyDays === 30 ? "месяц" : `${tier.everyDays} ночей`;
      return `Каждые ${period} одновременно восходит 1d4 луны.`;
    }
    case "periodic_restricted":
      return "Жёлтая Корона затмевает небо каждый день. Каждые 4 дня восходит 1d4 луны — повторно та же луна не взойдёт, пока не пройдут все остальные (сброс — Кровавая Луна Перерождения).";
    case "nightly_chance":
      return `Жёлтая Корона в небе. Каждую ночь шанс ${tier.chanceNumerator}/${tier.chanceDenominator}, что взойдёт новая луна — без повторов, пока не пройдут все остальные.`;
    case "nightly_always":
      return "Жёлтая Корона в небе. Каждую ночь восходит новая луна — без повторов, пока не пройдут все остальные.";
    case "apocalypse":
      return "Счётчик достиг 1000 — Луярна поглощается Великими, которых она привлекла, и стирается из мира. Особый сюжетный исход, не для авто-генерации.";
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

  const rollableCatalog = catalog.filter((m) => !m.isMundane);
  const pickMoon = (restrictToUnused: boolean): MoonCatalogEntry => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const roll = 1 + Math.floor(Math.random() * 100);
      const moon = rollableCatalog.find((m) => roll >= m.rangeLower && roll < m.rangeUpperExclusive);
      if (!moon) continue;
      if (restrictToUnused && cycleUsed.has(moon.id) && cycleUsed.size < rollableCatalog.length) continue;
      return moon;
    }
    return rollableCatalog[0];
  };

  if (tier.kind === "dormant_only" && dormantMoon) {
    for (let day = startDay; day < startDay + daysAhead; day++) {
      if ((day - startDay) % 365 === 0 && day !== startDay) {
        events.push({ day, moon: dormantMoon });
      }
    }
    return { events, note: "Счётчик 50-99: Дремлющая луна восходит ~раз в год — на коротком окне событий может не быть, это нормально." };
  }

  // 100-399: total of Xd4 moons rise over the year, spread out at no more
  // than 1/month — not all at once (book, p. 283), so each year's quota is
  // distributed across a random subset of that year's 12 months.
  if (tier.kind === "yearly_spread") {
    for (let yearStart = startDay; yearStart < startDay + daysAhead; yearStart += 365) {
      const total = rollDice(tier.dice);
      const months = Array.from({ length: 12 }, (_, i) => i);
      for (let i = months.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [months[i], months[j]] = [months[j], months[i]];
      }
      const chosenMonths = months.slice(0, total).sort((a, b) => a - b);
      for (const month of chosenMonths) {
        const day = yearStart + month * 30 + 1;
        if (day < startDay || day >= startDay + daysAhead) continue;
        let moon = pickMoon(false);
        if (tier.rerollBloodMoon && bloodMoon) {
          let guard = 0;
          while (moon.id === bloodMoon.id && guard++ < 20) moon = pickMoon(false);
        }
        events.push({ day, moon });
      }
    }
    return { events, note: `За год — ${tier.dice}d4 луны в сумме, не чаще 1/месяц. На коротком окне событий может не быть, это нормально.` };
  }

  if (tier.kind === "periodic") {
    for (let day = startDay; day < startDay + daysAhead; day++) {
      if ((day - startDay) % tier.everyDays !== 0) continue;
      const count = rollDice(tier.dice);
      const dayUsed = new Set<string>(); // no repeats within the same trigger
      for (let i = 0; i < count; i++) {
        let moon = pickMoon(false);
        let guard = 0;
        while (dayUsed.has(moon.id) && guard++ < 20) moon = pickMoon(false);
        dayUsed.add(moon.id);
        events.push({ day, moon });
      }
    }
    const periodLabel = tier.everyDays === 30 ? "месяц" : `${tier.everyDays} ночей`;
    return { events, note: `Срабатывает каждые ${periodLabel}.` };
  }

  if (tier.kind === "periodic_restricted") {
    for (let day = startDay; day < startDay + daysAhead; day++) {
      if ((day - startDay) % tier.everyDays !== 0) continue;
      const moon = pickMoon(true);
      if (bloodMoon && moon.id === bloodMoon.id) {
        cycleUsed = new Set();
      } else {
        cycleUsed.add(moon.id);
        if (cycleUsed.size >= rollableCatalog.length) cycleUsed = new Set();
      }
      events.push({ day, moon });
    }
    return { events, note: "Жёлтая Корона: срабатывает каждые 4 дня, луна не повторится, пока не взойдут все остальные (сброс — Кровавая Луна Перерождения)." };
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
        if (cycleUsed.size >= rollableCatalog.length) cycleUsed = new Set();
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
