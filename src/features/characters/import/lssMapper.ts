import type { AbilityScores, NormalizedCharacter } from "@/types/character";

/**
 * Long Story Short (LSS) character JSON export has two layers:
 * the outer wrapper (sharing/room metadata) and an inner sheet object
 * serialized as a JSON *string* in `data`. Confirmed on a real export —
 * not optional, the inner object never comes pre-parsed.
 */
type LssOuter = {
  data: string;
  [key: string]: unknown;
};

type LssValue<T> = { value: T };
type LssStat = { name: string; score: number };
type LssSave = { name: string; isProf: boolean };
type LssSkill = { name: string; baseStat: keyof AbilityScores; isProf?: 0 | 1 | 2 };

type LssInner = {
  jsonType: "character";
  name: LssValue<string>;
  info: {
    charClass: LssValue<string>;
    charSubclass: LssValue<string>;
    level: LssValue<number>;
    background: LssValue<string>;
    playerName: LssValue<string>;
    experience?: LssValue<number>;
  };
  proficiency: number;
  stats: Record<keyof AbilityScores, LssStat>;
  saves: Record<keyof AbilityScores, LssSave>;
  skills: Record<string, LssSkill>;
  vitality: {
    ac: LssValue<string | number>;
    "hp-max": LssValue<number>;
    "hp-current": LssValue<number>;
    "hp-temp": LssValue<number>;
    "hit-die": LssValue<string>;
    isDying: boolean;
    deathFails: number;
    deathSuccesses: number;
  };
  resources: Record<string, unknown>;
  conditions: unknown[];
  inspiration: boolean;
};

const abilityMod = (score: number): number => Math.floor((score - 10) / 2);

/** Parses an LSS JSON export file's raw text into the internal character model. */
export function parseLssJson(rawFileText: string): NormalizedCharacter {
  const outer = JSON.parse(rawFileText) as LssOuter;
  if (typeof outer.data !== "string") {
    throw new Error("Не похоже на экспорт LSS: отсутствует строковое поле data");
  }
  const inner = JSON.parse(outer.data) as LssInner;
  if (inner.jsonType !== "character") {
    throw new Error(`Неожиданный jsonType в экспорте LSS: ${String(inner.jsonType)}`);
  }

  const stats: AbilityScores = {
    str: inner.stats.str.score,
    dex: inner.stats.dex.score,
    con: inner.stats.con.score,
    int: inner.stats.int.score,
    wis: inner.stats.wis.score,
    cha: inner.stats.cha.score,
  };

  const saves: Record<string, number> = {};
  for (const [ability, save] of Object.entries(inner.saves)) {
    const mod = abilityMod(stats[ability as keyof AbilityScores]);
    saves[ability] = mod + (save.isProf ? inner.proficiency : 0);
  }

  const skills: Record<string, number> = {};
  for (const [skillName, skill] of Object.entries(inner.skills)) {
    const mod = abilityMod(stats[skill.baseStat]);
    const profMultiplier = skill.isProf ?? 0; // 0 = none, 1 = proficient, 2 = expertise
    skills[skillName] = mod + profMultiplier * inner.proficiency;
  }

  return {
    name: inner.name.value,
    charClass: inner.info.charClass.value,
    subclass: inner.info.charSubclass.value,
    levelFromSheet: inner.info.level.value,
    background: inner.info.background.value,
    playerName: inner.info.playerName.value,
    experience: inner.info.experience?.value ?? 0,
    stats,
    saves,
    skills,
    proficiency: inner.proficiency,
    hpCurrent: inner.vitality["hp-current"].value,
    hpMax: inner.vitality["hp-max"].value,
    hpTemp: inner.vitality["hp-temp"].value,
    ac: Number(inner.vitality.ac.value),
    hitDie: inner.vitality["hit-die"].value,
    isDying: inner.vitality.isDying,
    deathFails: inner.vitality.deathFails,
    deathSuccesses: inner.vitality.deathSuccesses,
    inspiration: inner.inspiration,
    importSource: "lss_json",
    rawImport: inner,
  };
}

/**
 * LSS's own `resources` bag is confirmed empty even for custom-class sheets
 * (the book's Hunter class has no LSS template support), so we never read
 * character_resources from it. Instead, when the imported class matches a
 * sourcebook custom class, pre-fill the starting resources from the class
 * table — applied only on first import (see charactersApi), never silently
 * overwriting a resource the player has already been spending in-app.
 */
export function suggestStarterResources(character: NormalizedCharacter) {
  if (character.charClass.trim().toLowerCase() !== "егерь") return [];

  const level = character.levelFromSheet;
  const impulseDie = level >= 17 ? "d10" : level >= 11 ? "d8" : "d6";
  // Concentration Units per the Hunter class table (levels 1/2/5/9/13/17).
  const concentrationUnits =
    level >= 17 ? 6 : level >= 13 ? 5 : level >= 9 ? 4 : level >= 5 ? 3 : level >= 2 ? 2 : 1;
  // Impulse Die pool max = proficiency bonus + the higher of STR/DEX modifier.
  const abilityMod = (score: number) => Math.floor((score - 10) / 2);
  const impulseMax = Math.max(
    0,
    character.proficiency + Math.max(abilityMod(character.stats.str), abilityMod(character.stats.dex)),
  );

  return [
    {
      name: "Единицы Концентрации",
      current: concentrationUnits,
      max: concentrationUnits,
      resourceType: "counter" as const,
      visibleToPlayers: true,
    },
    {
      name: "Кость Импульса",
      current: 0,
      max: impulseMax,
      resourceType: "dice_pool" as const,
      dieSize: impulseDie,
      visibleToPlayers: true,
    },
  ];
}
