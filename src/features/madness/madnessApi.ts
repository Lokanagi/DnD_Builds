import { supabase } from "@/lib/supabase/client";
import type { MadnessThresholds } from "@/types/campaign";

export type MadnessTier = "short" | "long" | "permanent";
export type MadnessStatus = "active" | "cured" | "resolved";

export type MadnessEvent = {
  id: string;
  characterId: string;
  characterName: string;
  tier: MadnessTier;
  title: string;
  causeNote: string | null;
  status: MadnessStatus;
  campaignDay: number;
  durationDays: number | null;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
};

/** Book's alt rule for long-term madness duration when not using the moon
 * system: 1d4 x 7 days. Used as the auto-filled default — GM can edit it. */
export function rollLongTermDurationDays(): number {
  return (1 + Math.floor(Math.random() * 4)) * 7;
}

export async function listMadnessEvents(campaignId: string): Promise<MadnessEvent[]> {
  const { data, error } = await supabase
    .from("madness_events")
    .select("*, characters(name)")
    .eq("campaign_id", campaignId)
    .order("campaign_day", { ascending: true });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    characterId: row.character_id,
    characterName: (row.characters as { name: string } | null)?.name ?? "?",
    tier: row.tier,
    title: row.title,
    causeNote: row.cause_note,
    status: row.status,
    campaignDay: row.campaign_day,
    durationDays: row.duration_days,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    resolutionNote: row.resolution_note,
  }));
}

export async function addMadnessEvent(
  campaignId: string,
  characterId: string,
  tier: MadnessTier,
  title: string,
  causeNote: string,
  createdBy: string,
  campaignDay: number,
  durationDays: number | null,
) {
  const { error } = await supabase.from("madness_events").insert({
    campaign_id: campaignId,
    character_id: characterId,
    tier,
    title,
    cause_note: causeNote || null,
    created_by: createdBy,
    campaign_day: campaignDay,
    duration_days: durationDays,
  });
  if (error) throw error;
}

export async function resolveMadnessEvent(eventId: string, status: "cured" | "resolved", resolutionNote: string) {
  const { error } = await supabase
    .from("madness_events")
    .update({ status, resolved_at: new Date().toISOString(), resolution_note: resolutionNote || null })
    .eq("id", eventId);
  if (error) throw error;
}

export async function updateMadnessEvent(
  eventId: string,
  updates: {
    tier: MadnessTier;
    title: string;
    causeNote: string;
    campaignDay: number;
    durationDays: number | null;
  },
) {
  const { error } = await supabase
    .from("madness_events")
    .update({
      tier: updates.tier,
      title: updates.title,
      cause_note: updates.causeNote || null,
      campaign_day: updates.campaignDay,
      duration_days: updates.tier === "long" ? updates.durationDays : null,
    })
    .eq("id", eventId);
  if (error) throw error;
}

export type Escalation = {
  characterId: string;
  characterName: string;
  triggerTier: "long" | "permanent";
  count: number;
};

/**
 * Book's GM rule of thumb (explicitly adjustable, see campaigns.settings):
 * N short-term events within a day window -> should become long-term;
 * N long-term events within a day window -> should become permanent.
 *
 * Once the GM acts on an escalation (adds the long/permanent event it
 * pointed at), the events that triggered it are "spent" — only events
 * *after* the most recent long/permanent event count toward the next
 * escalation, otherwise the same old short/long events would trip the
 * banner forever even after the GM already escalated.
 */
export function computeEscalations(
  events: MadnessEvent[],
  currentDay: number,
  thresholds: MadnessThresholds,
): Escalation[] {
  const byCharacter = new Map<string, { name: string; events: MadnessEvent[] }>();
  for (const event of events) {
    const entry = byCharacter.get(event.characterId) ?? { name: event.characterName, events: [] };
    entry.events.push(event);
    byCharacter.set(event.characterId, entry);
  }

  const escalations: Escalation[] = [];
  for (const [characterId, { name, events: charEvents }] of byCharacter) {
    const lastLongDay = Math.max(0, ...charEvents.filter((e) => e.tier === "long").map((e) => e.campaignDay));
    const shortCount = charEvents.filter(
      (e) => e.tier === "short" && e.campaignDay > lastLongDay && currentDay - e.campaignDay <= thresholds.shortWindowDays,
    ).length;
    if (shortCount >= thresholds.shortCount) {
      escalations.push({ characterId, characterName: name, triggerTier: "long", count: shortCount });
    }

    const lastPermanentDay = Math.max(0, ...charEvents.filter((e) => e.tier === "permanent").map((e) => e.campaignDay));
    const longCount = charEvents.filter(
      (e) => e.tier === "long" && e.campaignDay > lastPermanentDay && currentDay - e.campaignDay <= thresholds.longWindowDays,
    ).length;
    if (longCount >= thresholds.longCount) {
      escalations.push({ characterId, characterName: name, triggerTier: "permanent", count: longCount });
    }
  }
  return escalations;
}

export type ExpiredEvent = MadnessEvent & { endDay: number };

/** Long-term events whose rolled duration has elapsed — surfaced as a
 * notification only, nothing auto-resolves; the GM still clicks "Разрешить". */
export function computeExpiredEvents(events: MadnessEvent[], currentDay: number): ExpiredEvent[] {
  return events
    .filter((e) => e.status === "active" && e.durationDays !== null && currentDay >= e.campaignDay + e.durationDays)
    .map((e) => ({ ...e, endDay: e.campaignDay + (e.durationDays as number) }));
}
