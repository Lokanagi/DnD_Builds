export type AbilityScores = {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
};

export type ResourceType = "counter" | "dice_pool" | "slot" | "custom";

export type CharacterResource = {
  name: string;
  current: number;
  max: number;
  resourceType: ResourceType;
  dieSize?: string; // e.g. "d6" — only for resourceType "dice_pool"
  visibleToPlayers: boolean;
  note?: string;
};

export type Coins = {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
};

export type NormalizedCharacter = {
  name: string;
  charClass: string;
  subclass: string;
  levelFromSheet: number;
  background: string;
  playerName: string;
  experience: number;
  stats: AbilityScores;
  saves: Record<string, number>;
  skills: Record<string, number>;
  proficiency: number;
  hpCurrent: number;
  hpMax: number;
  hpTemp: number;
  ac: number;
  hitDie: string;
  isDying: boolean;
  deathFails: number;
  deathSuccesses: number;
  inspiration: boolean;
  coins: Coins;
  importSource: "lss_json" | "pdf" | "manual";
  rawImport: unknown;
};
