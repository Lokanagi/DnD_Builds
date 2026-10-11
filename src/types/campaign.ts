export type MemberRole = "gm" | "player";

export type MadnessThresholds = {
  shortCount: number;
  shortWindowDays: number;
  longCount: number;
  longWindowDays: number;
};

export const DEFAULT_MADNESS_THRESHOLDS: MadnessThresholds = {
  shortCount: 5,
  shortWindowDays: 2, // ~48h, expressed in whole campaign days
  longCount: 3,
  longWindowDays: 30,
};

export type Campaign = {
  id: string;
  name: string;
  gmUserId: string;
  inviteCode: string;
  createdAt: string;
  currentDay: number;
  madnessThresholds: MadnessThresholds;
};

export type CampaignMember = {
  id: string;
  campaignId: string;
  userId: string;
  role: MemberRole;
  displayName: string;
  joinedAt: string;
};
