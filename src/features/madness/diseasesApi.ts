import { supabase } from "@/lib/supabase/client";
import type { MadnessStatus } from "./madnessApi";

export type Disease = {
  id: string;
  characterId: string;
  characterName: string;
  title: string;
  causeNote: string | null;
  status: MadnessStatus;
  campaignDay: number;
  durationDays: number | null;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
};

export async function listDiseases(campaignId: string): Promise<Disease[]> {
  const { data, error } = await supabase
    .from("diseases")
    .select("*, characters(name)")
    .eq("campaign_id", campaignId)
    .order("campaign_day", { ascending: true });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    characterId: row.character_id,
    characterName: (row.characters as { name: string } | null)?.name ?? "?",
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

export async function addDisease(
  campaignId: string,
  characterId: string,
  title: string,
  causeNote: string,
  createdBy: string,
  campaignDay: number,
  durationDays: number | null,
) {
  const { error } = await supabase.from("diseases").insert({
    campaign_id: campaignId,
    character_id: characterId,
    title,
    cause_note: causeNote || null,
    created_by: createdBy,
    campaign_day: campaignDay,
    duration_days: durationDays,
  });
  if (error) throw error;
}

export async function resolveDisease(diseaseId: string, status: "cured" | "resolved", resolutionNote: string) {
  const { error } = await supabase
    .from("diseases")
    .update({ status, resolved_at: new Date().toISOString(), resolution_note: resolutionNote || null })
    .eq("id", diseaseId);
  if (error) throw error;
}

export async function updateDisease(
  diseaseId: string,
  updates: { title: string; causeNote: string; campaignDay: number; durationDays: number | null },
) {
  const { error } = await supabase
    .from("diseases")
    .update({
      title: updates.title,
      cause_note: updates.causeNote || null,
      campaign_day: updates.campaignDay,
      duration_days: updates.durationDays,
    })
    .eq("id", diseaseId);
  if (error) throw error;
}

export type ExpiredDisease = Disease & { endDay: number };

/** Diseases whose set duration has elapsed — surfaced as a notification
 * only, same as long-term madness; the GM still clicks "Разрешить". */
export function computeExpiredDiseases(diseases: Disease[], currentDay: number): ExpiredDisease[] {
  return diseases
    .filter((d) => d.status === "active" && d.durationDays !== null && currentDay >= d.campaignDay + d.durationDays)
    .map((d) => ({ ...d, endDay: d.campaignDay + (d.durationDays as number) }));
}
