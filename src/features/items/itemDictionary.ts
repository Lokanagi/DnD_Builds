/** Same idea as the bestiary's monster dictionary: open5e only has English
 * item names, so a Cyrillic search term is mapped to an English one first. */
export const RU_EN_ITEM_TERMS: [ru: string, en: string][] = [
  ["меч", "sword"],
  ["кинжал", "dagger"],
  ["топор", "axe"],
  ["молот", "hammer"],
  ["булава", "mace"],
  ["копьё", "spear"],
  ["копье", "spear"],
  ["лук", "bow"],
  ["арбалет", "crossbow"],
  ["посох", "staff"],
  ["жезл", "wand"],
  ["рог", "horn"],
  ["доспех", "armor"],
  ["броня", "armor"],
  ["щит", "shield"],
  ["шлем", "helm"],
  ["плащ", "cloak"],
  ["мантия", "robe"],
  ["сапоги", "boots"],
  ["ботинки", "boots"],
  ["перчатки", "gloves"],
  ["пояс", "belt"],
  ["кольцо", "ring"],
  ["амулет", "amulet"],
  ["ожерелье", "necklace"],
  ["зелье", "potion"],
  ["эликсир", "elixir"],
  ["свиток", "scroll"],
  ["книга", "book"],
  ["мешок", "bag"],
  ["сумка", "bag"],
  ["ковёр", "carpet"],
  ["ковер", "carpet"],
  ["флейта", "flute"],
  ["арфа", "harp"],
  ["фигурка", "figurine"],
  ["камень", "stone"],
  ["кристалл", "crystal"],
  ["маска", "mask"],
  ["корона", "crown"],
  ["зеркало", "mirror"],
  ["фонарь", "lantern"],
  ["верёвка", "rope"],
  ["веревка", "rope"],
  ["яд", "poison"],
  ["стрела", "arrow"],
  ["бомба", "bomb"],
];

export function translateItemQuery(ruQuery: string): string[] {
  const lower = ruQuery.toLowerCase().trim();
  if (!lower) return [];
  const matches = RU_EN_ITEM_TERMS.filter(([ru]) => lower.includes(ru) || ru.includes(lower));
  return [...new Set(matches.map(([, en]) => en))];
}

export function hasCyrillic(text: string): boolean {
  return /[Ѐ-ӿ]/.test(text);
}
