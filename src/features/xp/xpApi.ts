import { supabase } from "@/lib/supabase/client";

export type XpEntry = {
  id: string;
  characterId: string;
  characterName: string;
  amount: number;
  reason: string | null;
  createdAt: string;
};

export type CharacterXpTotal = {
  characterId: string;
  characterName: string;
  levelFromSheet: number | null;
  total: number;
  levelFromXp: number;
};

// Standard 5e XP-to-level thresholds (index 0 unused, level = index).
const XP_THRESHOLDS = [
  0, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000,
  225000, 265000, 305000, 355000,
];

function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i;
  }
  return level;
}

export async function listXpLedger(campaignId: string): Promise<XpEntry[]> {
  const { data, error } = await supabase
    .from("xp_ledger")
    .select("*, characters(name)")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    characterId: row.character_id,
    characterName: (row.characters as { name: string } | null)?.name ?? "?",
    amount: row.amount,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

/** Totals computed client-side from the ledger — xp_ledger is the source of
 * truth (sum of rows), never a separately-maintained running counter. */
export async function getCharacterXpTotals(campaignId: string): Promise<CharacterXpTotal[]> {
  const [{ data: characters, error: charError }, { data: ledger, error: ledgerError }] = await Promise.all([
    supabase.from("characters").select("id, name, level_from_sheet, level_override").eq("campaign_id", campaignId),
    supabase.from("xp_ledger").select("character_id, amount").eq("campaign_id", campaignId),
  ]);
  if (charError) throw charError;
  if (ledgerError) throw ledgerError;

  const totals = new Map<string, number>();
  for (const entry of ledger) {
    totals.set(entry.character_id, (totals.get(entry.character_id) ?? 0) + entry.amount);
  }

  return characters.map((c) => {
    const total = totals.get(c.id) ?? 0;
    return {
      characterId: c.id,
      characterName: c.name,
      levelFromSheet: c.level_override ?? c.level_from_sheet,
      total,
      levelFromXp: levelForXp(total),
    };
  });
}

export async function awardXp(
  campaignId: string,
  characterIds: string[],
  amount: number,
  reason: string,
  awardedBy: string,
) {
  const rows = characterIds.map((characterId) => ({
    campaign_id: campaignId,
    character_id: characterId,
    amount,
    reason: reason || null,
    awarded_by: awardedBy,
  }));
  const { error } = await supabase.from("xp_ledger").insert(rows);
  if (error) throw error;
}
