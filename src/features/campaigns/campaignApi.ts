import { supabase } from "@/lib/supabase/client";
import type { Campaign, MadnessThresholds } from "@/types/campaign";
import { DEFAULT_MADNESS_THRESHOLDS } from "@/types/campaign";

function randomInviteCode(): string {
  // Short, easy to read aloud/type at the table — avoids ambiguous chars (0/O, 1/I).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

type CampaignRow = {
  id: string;
  name: string;
  gm_user_id: string;
  invite_code: string;
  created_at: string;
  current_day: number;
  settings: { madness_thresholds?: Partial<MadnessThresholds> } | null;
};

function mapCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    gmUserId: row.gm_user_id,
    inviteCode: row.invite_code,
    createdAt: row.created_at,
    currentDay: row.current_day,
    madnessThresholds: { ...DEFAULT_MADNESS_THRESHOLDS, ...row.settings?.madness_thresholds },
  };
}

export async function createCampaign(name: string, gmDisplayName: string): Promise<Campaign> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Нужно войти перед созданием кампании");

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({ name, gm_user_id: userData.user.id, invite_code: randomInviteCode() })
    .select()
    .single();
  if (campaignError) throw campaignError;

  const { error: memberError } = await supabase
    .from("campaign_members")
    .insert({ campaign_id: campaign.id, user_id: userData.user.id, role: "gm", display_name: gmDisplayName });
  if (memberError) throw memberError;

  return mapCampaign(campaign);
}

export async function joinCampaign(inviteCode: string, displayName: string): Promise<Campaign> {
  // Looking up a campaign by invite code and inserting the membership row
  // can't both be plain RLS-gated client calls — see migration 0005 for why
  // this has to be a SECURITY DEFINER RPC instead.
  const { data, error } = await supabase.rpc("join_campaign_by_code", {
    p_invite_code: inviteCode,
    p_display_name: displayName,
  });
  if (error) throw new Error(error.message.includes("не найдена") ? "Кампания с таким кодом не найдена" : error.message);
  return mapCampaign(data as CampaignRow);
}

export async function listMyCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase.from("campaigns").select("*, campaign_members!inner(user_id)");
  if (error) throw error;
  return data.map(mapCampaign);
}

export async function getCampaign(campaignId: string): Promise<Campaign | null> {
  const { data, error } = await supabase.from("campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (error) throw error;
  return data ? mapCampaign(data) : null;
}

export async function advanceDay(campaignId: string, delta: number) {
  const campaign = await getCampaign(campaignId);
  const next = Math.max(1, (campaign?.currentDay ?? 1) + delta);
  const { error } = await supabase.from("campaigns").update({ current_day: next }).eq("id", campaignId);
  if (error) throw error;
}

/** Cascades to every character, event, resource etc. in the campaign — irreversible. */
export async function deleteCampaign(campaignId: string) {
  const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
  if (error) throw error;
}

export async function setMadnessThresholds(campaignId: string, thresholds: MadnessThresholds) {
  const { data: current, error: fetchError } = await supabase
    .from("campaigns")
    .select("settings")
    .eq("id", campaignId)
    .single();
  if (fetchError) throw fetchError;
  const { error } = await supabase
    .from("campaigns")
    .update({ settings: { ...current.settings, madness_thresholds: thresholds } })
    .eq("id", campaignId);
  if (error) throw error;
}
