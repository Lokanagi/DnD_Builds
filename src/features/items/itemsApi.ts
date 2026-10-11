import { supabase } from "@/lib/supabase/client";

export type SrdItemSummary = {
  key: string;
  name: string;
  rarity: string | null;
  source: string | null;
};

export type SrdItemDetail = Record<string, unknown> & { key: string; name: string };

const OPEN5E_BASE = "https://api.open5e.com/v2";

export async function searchSrdMagicItems(query: string): Promise<SrdItemSummary[]> {
  if (!query.trim()) return [];
  const res = await fetch(`${OPEN5E_BASE}/magicitems/?name__icontains=${encodeURIComponent(query)}&limit=20`);
  if (!res.ok) throw new Error("Не удалось найти в open5e");
  const data = await res.json();
  return (data.results as Array<Record<string, unknown>>).map((item) => ({
    key: item.key as string,
    name: item.name as string,
    rarity: (item.rarity as { name?: string } | undefined)?.name ?? null,
    source: (item.document as { name?: string } | undefined)?.name ?? null,
  }));
}

export type SteinhartItem = {
  id: string;
  name: string;
  category: string | null;
  rarity: string | null;
  bookPage: number | null;
  summary: string | null;
};

export async function listSteinhartItems(): Promise<SteinhartItem[]> {
  const { data, error } = await supabase.from("steinhart_items").select("*").order("name");
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    rarity: row.rarity,
    bookPage: row.book_page,
    summary: row.summary,
  }));
}

export type CampaignItem = {
  id: string;
  name: string;
  category: string | null;
  rarity: string | null;
  description: string | null;
  createdBy: string;
};

export async function listCampaignItems(campaignId: string): Promise<CampaignItem[]> {
  const { data, error } = await supabase.from("campaign_items").select("*").eq("campaign_id", campaignId).order("name");
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    rarity: row.rarity,
    description: row.description,
    createdBy: row.created_by,
  }));
}

export async function addCampaignItem(
  campaignId: string,
  userId: string,
  item: { name: string; category: string; rarity: string; description: string },
): Promise<CampaignItem> {
  const { data, error } = await supabase
    .from("campaign_items")
    .insert({
      campaign_id: campaignId,
      name: item.name,
      category: item.category || null,
      rarity: item.rarity || null,
      description: item.description || null,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    category: data.category,
    rarity: data.rarity,
    description: data.description,
    createdBy: data.created_by,
  };
}

export async function removeCampaignItem(itemId: string) {
  const { error } = await supabase.from("campaign_items").delete().eq("id", itemId);
  if (error) throw error;
}

export type CharacterItem = {
  id: string;
  relation: "inventory" | "wishlist";
  itemSource: "srd" | "steinhart" | "custom";
  itemKey: string | null;
  itemName: string;
  quantity: number;
  note: string | null;
};

export async function listCharacterItems(characterId: string): Promise<CharacterItem[]> {
  const { data, error } = await supabase
    .from("character_items")
    .select("*")
    .eq("character_id", characterId)
    .order("created_at");
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    relation: row.relation,
    itemSource: row.item_source,
    itemKey: row.item_key,
    itemName: row.item_name,
    quantity: row.quantity,
    note: row.note,
  }));
}

export async function addCharacterItem(
  characterId: string,
  relation: "inventory" | "wishlist",
  item: { source: "srd" | "steinhart" | "custom"; key: string | null; name: string },
  quantity = 1,
) {
  const { error } = await supabase.from("character_items").insert({
    character_id: characterId,
    relation,
    item_source: item.source,
    item_key: item.key,
    item_name: item.name,
    quantity,
  });
  if (error) throw error;
}

/** Moves an item from the wishlist to inventory — "got it", per item #2. */
export async function markAcquired(characterItemId: string) {
  const { error } = await supabase.from("character_items").update({ relation: "inventory" }).eq("id", characterItemId);
  if (error) throw error;
}

export async function updateCharacterItemQuantity(characterItemId: string, quantity: number) {
  const { error } = await supabase.from("character_items").update({ quantity }).eq("id", characterItemId);
  if (error) throw error;
}

export async function removeCharacterItem(characterItemId: string) {
  const { error } = await supabase.from("character_items").delete().eq("id", characterItemId);
  if (error) throw error;
}
