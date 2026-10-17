export type MadnessSubEffect = {
  d10Min: number;
  d10Max: number;
  title: string;
  note: string;
};

export type MadnessRollEntry = {
  d100Min: number;
  d100Max: number;
  categoryTitle: string;
  subEffects: MadnessSubEffect[];
};
