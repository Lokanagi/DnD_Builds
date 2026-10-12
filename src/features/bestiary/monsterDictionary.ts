/**
 * open5e only has English monster/item names, but the party searches in
 * Russian. This maps common Russian D&D terms to the English search term
 * open5e expects — standard bestiary vocabulary (not specific to any one
 * sourcebook), covering the monster families a GM is most likely to type.
 */
export const RU_EN_SEARCH_TERMS: [ru: string, en: string][] = [
  ["гоблин", "goblin"],
  ["хобгоблин", "hobgoblin"],
  ["багбир", "bugbear"],
  ["орк", "orc"],
  ["кобольд", "kobold"],
  ["зомби", "zombie"],
  ["скелет", "skeleton"],
  ["вампир", "vampire"],
  ["оборотень", "werewolf"],
  ["ликантроп", "lycanthrope"],
  ["призрак", "ghost"],
  ["привидение", "specter"],
  ["личность", "wraith"],
  ["нежить", "undead"],
  ["лич", "lich"],
  ["дракон", "dragon"],
  ["драконид", "kobold"],
  ["виверна", "wyvern"],
  ["гидра", "hydra"],
  ["тролль", "troll"],
  ["огр", "ogre"],
  ["великан", "giant"],
  ["гигант", "giant"],
  ["циклоп", "cyclops"],
  ["элементаль", "elemental"],
  ["демон", "demon"],
  ["дьявол", "devil"],
  ["бес", "imp"],
  ["ангел", "angel"],
  ["паук", "spider"],
  ["волк", "wolf"],
  ["медведь", "bear"],
  ["лев", "lion"],
  ["тигр", "tiger"],
  ["грифон", "griffon"],
  ["пегас", "pegasus"],
  ["единорог", "unicorn"],
  ["химера", "chimera"],
  ["мантикора", "manticore"],
  ["минотавр", "minotaur"],
  ["гарпия", "harpy"],
  ["горгулья", "gargoyle"],
  ["голем", "golem"],
  ["слизь", "ooze"],
  ["желеобразный", "gelatinous"],
  ["фея", "fey"],
  ["дриада", "dryad"],
  ["сатир", "satyr"],
  ["пикси", "pixie"],
  ["эльф", "elf"],
  ["дроу", "drow"],
  ["гном", "gnome"],
  ["дворф", "dwarf"],
  ["полурослик", "halfling"],
  ["человек", "human"],
  ["бандит", "bandit"],
  ["культист", "cultist"],
  ["страж", "guard"],
  ["рыцарь", "knight"],
  ["маг", "mage"],
  ["чародей", "archmage"],
  ["жрец", "priest"],
  ["друид", "druid"],
  ["ассасин", "assassin"],
  ["мимик", "mimic"],
  ["бехолдер", "beholder"],
  ["иллитид", "mind flayer"],
  ["кракен", "kraken"],
  ["акула", "shark"],
  ["крыса", "rat"],
  ["ворон", "raven"],
  ["летучая мышь", "bat"],
  ["змея", "snake"],
  ["ящер", "lizard"],
  ["саламандра", "salamander"],
  ["элементаль огня", "fire elemental"],
  ["элементаль воды", "water elemental"],
  ["элементаль земли", "earth elemental"],
  ["элементаль воздуха", "air elemental"],
  ["мертвец", "zombie"],
  ["ужас", "horror"],
  ["чудовище", "monstrosity"],
  ["абберация", "aberration"],
  ["аберрация", "aberration"],
];

/** Returns English search candidates for a Cyrillic query, or [] if nothing matches. */
export function translateMonsterQuery(ruQuery: string): string[] {
  const lower = ruQuery.toLowerCase().trim();
  if (!lower) return [];
  const matches = RU_EN_SEARCH_TERMS.filter(([ru]) => lower.includes(ru) || ru.includes(lower));
  return [...new Set(matches.map(([, en]) => en))];
}

export function hasCyrillic(text: string): boolean {
  return /[Ѐ-ӿ]/.test(text);
}
