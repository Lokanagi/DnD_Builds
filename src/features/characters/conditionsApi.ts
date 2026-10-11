import { supabase } from "@/lib/supabase/client";

export type Condition = {
  id: string;
  name: string;
  source: "5e_standard" | "madness" | "custom";
  isActive: boolean;
  note: string | null;
};

export async function listConditions(characterId: string): Promise<Condition[]> {
  const { data, error } = await supabase
    .from("conditions")
    .select("*")
    .eq("character_id", characterId)
    .order("applied_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    source: row.source,
    isActive: row.is_active,
    note: row.note,
  }));
}

export async function addCondition(characterId: string, name: string) {
  const { error } = await supabase.from("conditions").insert({ character_id: characterId, name, source: "custom" });
  if (error) throw error;
}

export async function clearCondition(conditionId: string) {
  const { error } = await supabase.from("conditions").update({ is_active: false }).eq("id", conditionId);
  if (error) throw error;
}
