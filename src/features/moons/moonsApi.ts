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
  startedAt: string | null;
};

export type MoonHistoryEntry = {
  id: string;
  moonId: string;
  moonName: string;
  startedAt: string;
  endedAt: string | null;
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
    startedAt: data.started_at,
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
 * book's d100 table; "manual" requires `manualMoonId`.
 */
export async function triggerNextMoon(
  campaignId: string,
  method: "random_d100" | "manual",
  manualMoonId?: string,
) {
  const catalog = await getMoonCatalog();
  const current = await getMoonState(campaignId);

  if (current?.currentMoonId) {
    const startedAt = current.startedAt ?? new Date().toISOString();
    const durationNights = Math.round(
      (Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    await supabase.from("moon_history").insert({
      campaign_id: campaignId,
      moon_id: current.currentMoonId,
      started_at: startedAt,
      ended_at: new Date().toISOString(),
      duration_nights: Math.max(durationNights, 1),
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
      started_at: new Date().toISOString(),
    },
    { onConflict: "campaign_id" },
  );
  if (error) throw error;

  return nextMoon;
}

export async function listMoonHistory(campaignId: string): Promise<MoonHistoryEntry[]> {
  const { data, error } = await supabase
    .from("moon_history")
    .select("*, moon_catalog(name)")
    .eq("campaign_id", campaignId)
    .order("started_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    moonId: row.moon_id,
    moonName: (row.moon_catalog as { name: string } | null)?.name ?? "?",
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationNights: row.duration_nights,
    triggeredMethod: row.triggered_method,
    note: row.note,
  }));
}
