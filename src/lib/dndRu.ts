/**
 * Shared Russian labels for standard 5e terminology (ability scores, skills,
 * creature sizes/types, alignment, action categories). This is generic
 * system vocabulary identical across every book/sourcebook, not specific
 * content from any one of them — safe to hardcode once and reuse for both
 * monster statblocks (bestiary) and character sheets.
 */

export const ABILITY_LABELS: Record<string, string> = {
  str: "Сил",
  dex: "Лов",
  con: "Тел",
  int: "Инт",
  wis: "Мдр",
  cha: "Хар",
  strength: "Сил",
  dexterity: "Лов",
  constitution: "Тел",
  intelligence: "Инт",
  wisdom: "Мдр",
  charisma: "Хар",
};

export const ABILITY_FULL_LABELS: Record<string, string> = {
  str: "Сила",
  dex: "Ловкость",
  con: "Телосложение",
  int: "Интеллект",
  wis: "Мудрость",
  cha: "Харизма",
  strength: "Сила",
  dexterity: "Ловкость",
  constitution: "Телосложение",
  intelligence: "Интеллект",
  wisdom: "Мудрость",
  charisma: "Харизма",
};

/** Keyed by the LSS export's own skill-name strings (lowercase, spaces kept). */
export const SKILL_LABELS: Record<string, string> = {
  acrobatics: "Акробатика",
  "animal handling": "Уход за животными",
  arcana: "Магия",
  athletics: "Атлетика",
  deception: "Обман",
  history: "История",
  insight: "Проницательность",
  intimidation: "Запугивание",
  investigation: "Расследование",
  medicine: "Медицина",
  nature: "Природа",
  perception: "Восприятие",
  performance: "Выступление",
  persuasion: "Убеждение",
  religion: "Религия",
  "sleight of hand": "Ловкость рук",
  stealth: "Скрытность",
  survival: "Выживание",
};

export const SIZE_RU: Record<string, string> = {
  tiny: "Крошечный",
  small: "Маленький",
  medium: "Средний",
  large: "Большой",
  huge: "Огромный",
  gargantuan: "Громадный",
};

export const CREATURE_TYPE_RU: Record<string, string> = {
  aberration: "Аберрация",
  beast: "Зверь",
  celestial: "Небожитель",
  construct: "Конструкт",
  dragon: "Дракон",
  elemental: "Элементаль",
  fey: "Фея",
  fiend: "Исчадие",
  giant: "Великан",
  humanoid: "Гуманоид",
  monstrosity: "Чудовище",
  ooze: "Слизь",
  plant: "Растение",
  undead: "Нежить",
  swarm: "Рой",
};

const ALIGNMENT_WORD_RU: Record<string, string> = {
  lawful: "законопослушный",
  neutral: "нейтральный",
  chaotic: "хаотичный",
  good: "добрый",
  evil: "злой",
  unaligned: "без мировоззрения",
  any: "любое мировоззрение",
};

export function translateAlignment(alignment: string | null | undefined): string {
  if (!alignment) return "";
  const lower = alignment.toLowerCase().trim();
  if (lower === "unaligned") return ALIGNMENT_WORD_RU.unaligned;
  if (lower.startsWith("any")) return ALIGNMENT_WORD_RU.any;
  return lower
    .split(/\s+/)
    .map((w) => ALIGNMENT_WORD_RU[w] ?? w)
    .join(" ");
}

export const ACTION_TYPE_RU: Record<string, string> = {
  ACTION: "Действие",
  BONUS_ACTION: "Бонусное действие",
  REACTION: "Реакция",
  LEGENDARY_ACTION: "Легендарное действие",
  LAIR_ACTION: "Действие логова",
};

export const DAMAGE_TYPE_RU: Record<string, string> = {
  acid: "кислотный",
  bludgeoning: "дробящий",
  cold: "холод",
  fire: "огонь",
  force: "силовое поле",
  lightning: "электричество",
  necrotic: "некротический",
  piercing: "колющий",
  poison: "яд",
  psychic: "психический",
  radiant: "излучение",
  slashing: "рубящий",
  thunder: "гром",
};
