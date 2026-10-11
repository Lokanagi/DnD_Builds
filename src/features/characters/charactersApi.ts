import { supabase } from "@/lib/supabase/client";
import type { CharacterResource, NormalizedCharacter } from "@/types/character";
import { suggestStarterResources } from "./import/lssMapper";

export type CharacterSummary = {
  id: string;
  campaignId: string;
  ownerUserId: string | null;
  name: string;
  class: string;
  subclass: string | null;
  level: number | null;
  hpCurrent: number | null;
  hpMax: number | null;
  ac: number | null;
};

/** Everyone in the campaign can call this — it only ever returns the limited
 * summary columns (see migration 0001's character_summaries() function). */
export async function listCharacterSummaries(campaignId: string): Promise<CharacterSummary[]> {
  const { data, error } = await supabase.rpc("character_summaries", { target_campaign_id: campaignId });
  if (error) throw error;
  type SummaryRow = {
    id: string;
    campaign_id: string;
    owner_user_id: string | null;
    name: string;
    class: string;
    subclass: string | null;
    level: number | null;
    hp_current: number | null;
    hp_max: number | null;
    ac: number | null;
  };
  return ((data ?? []) as SummaryRow[]).map((row) => ({
    id: row.id,
    campaignId: row.campaign_id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    class: row.class,
    subclass: row.subclass,
    level: row.level,
    hpCurrent: row.hp_current,
    hpMax: row.hp_max,
    ac: row.ac,
  }));
}

/** Full row — RLS only returns this for the owner or the GM; anyone else gets nothing. */
export async function getFullCharacter(characterId: string) {
  const { data, error } = await supabase.from("characters").select("*").eq("id", characterId).single();
  if (error) throw error;
  return data;
}

export async function listResources(characterId: string): Promise<(CharacterResource & { id: string })[]> {
  const { data, error } = await supabase
    .from("character_resources")
    .select("*")
    .eq("character_id", characterId)
    .order("sort_order");
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    current: r.current,
    max: r.max,
    resourceType: r.resource_type,
    dieSize: r.die_size ?? undefined,
    visibleToPlayers: r.visible_to_players,
    note: r.note ?? undefined,
  }));
}

export async function setResourceCurrent(resourceId: string, current: number) {
  const { error } = await supabase.from("character_resources").update({ current }).eq("id", resourceId);
  if (error) throw error;
}

export async function addResource(characterId: string, resource: CharacterResource) {
  const { error } = await supabase.from("character_resources").insert({
    character_id: characterId,
    name: resource.name,
    current: resource.current,
    max: resource.max,
    resource_type: resource.resourceType,
    die_size: resource.dieSize ?? null,
    visible_to_players: resource.visibleToPlayers,
    note: resource.note ?? null,
  });
  if (error) throw error;
}

/**
 * Creates a new character from an LSS import, or overwrites an existing one
 * (`existingCharacterId`) the caller explicitly picked — LSS exports carry no
 * stable character id, so re-import matching is deliberately manual (see plan).
 */
export async function upsertCharacterFromImport(
  campaignId: string,
  ownerUserId: string,
  character: NormalizedCharacter,
  existingCharacterId?: string,
) {
  const row = {
    campaign_id: campaignId,
    owner_user_id: ownerUserId,
    name: character.name,
    class: character.charClass,
    subclass: character.subclass,
    level_from_sheet: character.levelFromSheet,
    import_source: character.importSource,
    raw_import: character.rawImport,
    stats: character.stats,
    saves: character.saves,
    skills: character.skills,
    proficiency: character.proficiency,
    hp_current: character.hpCurrent,
    hp_max: character.hpMax,
    hp_temp: character.hpTemp,
    ac: character.ac,
    hit_die: character.hitDie,
    is_dying: character.isDying,
    death_fails: character.deathFails,
    death_successes: character.deathSuccesses,
    inspiration: character.inspiration,
    last_imported_at: new Date().toISOString(),
  };

  if (existingCharacterId) {
    const { data, error } = await supabase
      .from("characters")
      .update(row)
      .eq("id", existingCharacterId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase.from("characters").insert(row).select().single();
  if (error) throw error;

  if (character.experience > 0) {
    await supabase.from("xp_ledger").insert({
      campaign_id: campaignId,
      character_id: data.id,
      amount: character.experience,
      reason: "Импорт LSS (стартовое значение)",
      awarded_by: ownerUserId,
    });
  }

  // Only on first import, not re-import — re-importing shouldn't reset
  // resources the player has already been spending/tracking in-app.
  const starters = suggestStarterResources(character);
  if (starters.length > 0) {
    await supabase.from("character_resources").insert(
      starters.map((r, i) => ({
        character_id: data.id,
        name: r.name,
        current: r.current,
        max: r.max,
        resource_type: r.resourceType,
        die_size: r.dieSize ?? null,
        visible_to_players: r.visibleToPlayers,
        sort_order: i,
      })),
    );
  }

  return data;
}
