import { supabase } from "@/lib/supabase/client";
import { hasCyrillic, translateMonsterQuery } from "./monsterDictionary";

export type SrdCreatureSummary = {
  key: string;
  name: string;
  challengeRating: string | null;
  type: string | null;
  source: string | null;
};

export type SrdCreatureDetail = Record<string, unknown> & { key: string; name: string };

const OPEN5E_BASE = "https://api.open5e.com/v2";

/** Live search against open5e (OGL-licensed SRD + other open 5e content,
 * aggregated from several sourcebooks/game systems — `source` in the result
 * shows which, since not everything returned is core 5e). Nothing here is
 * stored locally until the GM/player explicitly saves it. */
async function fetchCreaturesByName(name: string): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(`${OPEN5E_BASE}/creatures/?name__icontains=${encodeURIComponent(name)}&limit=20`);
  if (!res.ok) throw new Error("Не удалось найти в open5e");
  const data = await res.json();
  return data.results as Array<Record<string, unknown>>;
}

/** open5e only has English names — a Cyrillic query is translated through a
 * built-in RU→EN dictionary of common monster terms before hitting the API. */
export async function searchSrdCreatures(query: string): Promise<SrdCreatureSummary[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const terms = hasCyrillic(trimmed) ? translateMonsterQuery(trimmed) : [trimmed];
  if (terms.length === 0) return [];

  const resultLists = await Promise.all(terms.map(fetchCreaturesByName));
  const seen = new Set<string>();
  const merged: Array<Record<string, unknown>> = [];
  for (const list of resultLists) {
    for (const c of list) {
      const key = c.key as string;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(c);
    }
  }

  return merged.map((c) => ({
    key: c.key as string,
    name: c.name as string,
    challengeRating: c.challenge_rating != null ? String(c.challenge_rating) : null,
    type: (c.type as { name?: string } | undefined)?.name ?? null,
    source: (c.document as { name?: string } | undefined)?.name ?? null,
  }));
}

export async function getSrdCreature(key: string): Promise<SrdCreatureDetail> {
  const res = await fetch(`${OPEN5E_BASE}/creatures/${encodeURIComponent(key)}/`);
  if (!res.ok) throw new Error("Не удалось загрузить статблок");
  return res.json();
}

export type SteinhartMonster = {
  id: string;
  name: string;
  challengeRating: string | null;
  creatureType: string | null;
  bookPage: number | null;
  summary: string | null;
};

export async function listSteinhartMonsters(): Promise<SteinhartMonster[]> {
  const { data, error } = await supabase.from("steinhart_monsters").select("*").order("name");
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    challengeRating: row.challenge_rating,
    creatureType: row.creature_type,
    bookPage: row.book_page,
    summary: row.summary,
  }));
}

export type BestiaryEntry = {
  id: string;
  source: "srd" | "steinhart" | "custom";
  sourceKey: string | null;
  name: string;
  challengeRating: string | null;
  data: unknown;
  savedBy: string;
  createdAt: string;
};

export async function listBestiaryEntries(campaignId: string): Promise<BestiaryEntry[]> {
  const { data, error } = await supabase
    .from("bestiary_entries")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    source: row.source,
    sourceKey: row.source_key,
    name: row.name,
    challengeRating: row.challenge_rating,
    data: row.data,
    savedBy: row.saved_by,
    createdAt: row.created_at,
  }));
}

export async function saveSrdCreatureToBestiary(campaignId: string, creature: SrdCreatureDetail, userId: string) {
  const { error } = await supabase.from("bestiary_entries").insert({
    campaign_id: campaignId,
    source: "srd",
    source_key: creature.key,
    name: creature.name,
    challenge_rating: creature.challenge_rating != null ? String(creature.challenge_rating) : null,
    data: creature,
    saved_by: userId,
  });
  if (error) throw error;
}

export async function saveSteinhartMonsterToBestiary(campaignId: string, monster: SteinhartMonster, userId: string) {
  const { error } = await supabase.from("bestiary_entries").insert({
    campaign_id: campaignId,
    source: "steinhart",
    source_key: monster.id,
    name: monster.name,
    challenge_rating: monster.challengeRating,
    data: monster,
    saved_by: userId,
  });
  if (error) throw error;
}

export async function saveCustomMonster(
  campaignId: string,
  userId: string,
  monster: { name: string; challengeRating: string; creatureType: string; summary: string },
) {
  const { error } = await supabase.from("bestiary_entries").insert({
    campaign_id: campaignId,
    source: "custom",
    source_key: null,
    name: monster.name,
    challenge_rating: monster.challengeRating || null,
    data: { creatureType: monster.creatureType, summary: monster.summary },
    saved_by: userId,
  });
  if (error) throw error;
}

export async function removeBestiaryEntry(entryId: string) {
  const { error } = await supabase.from("bestiary_entries").delete().eq("id", entryId);
  if (error) throw error;
}
