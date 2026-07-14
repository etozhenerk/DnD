export interface CampaignImageVisual {
  image: string;
  alt: string;
  video?: never;
  poster?: never;
}

export interface CampaignVideoVisual {
  video: string;
  alt: string;
  poster?: string;
  image?: never;
}

export type CampaignVisual = CampaignImageVisual | CampaignVideoVisual;

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
  groupTitle?: string;
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
  raceConceptIds?: string[];
  tags?: string[];
  description?: string;
  story?: string;
  motivation?: string;
  visual?: CampaignVisual;
}

export interface CampaignPartyMember {
  characterId: string;
  displayName: string;
  note?: string;
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
  gameMasterCharacterId?: string;
  groupVisual?: CampaignVisual;
  partyAtTime?: CampaignPartyMember[];
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
  ending: {
    readAloud: string;
    epilogues: string[];
    reward: string;
    featureTitle?: string;
    visual?: CampaignVisual;
    closingTitle?: string;
    closingCaption?: string;
    closingVisual?: CampaignVisual;
  };
}
