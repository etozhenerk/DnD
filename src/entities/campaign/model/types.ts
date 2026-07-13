export interface CampaignVisual {
  image: string;
  alt: string;
}

export interface CampaignPresentation {
  pageSubtitle: string;
  background: string;
  statusSeal: {primary: string; secondary: string};
  milestonesEyebrow: string;
  milestonesTitle: string;
  aftermathEyebrow: string;
  aftermathTitle: string;
  galleryEyebrow: string;
  galleryTitle: string;
  castTitle: string;
}

export interface CampaignLocation {
  id: string;
  order: number;
  name: string;
  mapLabel: string;
  summary: string;
  visual?: CampaignVisual;
}

export interface CampaignPerson {
  id: string;
  name: string;
  role?: string;
  description?: string;
  story?: string;
  visual?: CampaignVisual;
}

export interface Campaign {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  summary: string;
  campaignGoal: string;
  partyCharacterIds: string[];
  partyAtTime?: {characterId: string; displayName: string; note?: string}[];
  presentation?: CampaignPresentation;
  completedChronicle?: {
    template: string;
    statusLabel: string;
    completedSummary: string;
    finalResult: string;
    journeyTitle?: string;
    finaleTitle?: string;
    story: string[];
    trials: {id: string; title: string; locationId: string; result: string}[];
    defeatedEnemies: {enemyId: string; count: number; outcome: string}[];
    restored: {id: string; title: string; result: string}[];
  };
  locations: CampaignLocation[];
  npcs?: CampaignPerson[];
  enemies: (CampaignPerson & {tier: string; hp: number; ac: number; defeat?: string})[];
  ending: {readAloud: string; epilogues: string[]; reward: string; featureTitle?: string; visual?: CampaignVisual};
}
