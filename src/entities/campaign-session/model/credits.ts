import creditsData from '../../../../content/campaigns/penisuela-credits.json';

export interface CampaignCreditsPhoto {
  id: string;
  source: string;
  alt: string;
  caption: string;
  creditIds: string[];
}

export interface CampaignCreditsDefinition {
  version: number;
  campaignId: string;
  title: string;
  partyCharacterIds: string[];
  cast: {id: string; characterName: string; prototypeName?: string}[];
  gameMasterIds?: string[];
  aiModels: {id: string; name: string}[];
  photos: CampaignCreditsPhoto[];
  closingText: string;
  music?: {id: string; title: string; source: string; volume: number};
  postCreditsVideo?: {id: string; title: string; source: string; volume: number; delayMs: number};
  entries: {sceneId: string; requiredFlags: string[]}[];
}

export const penisuelaCredits: CampaignCreditsDefinition = creditsData;

export function canShowCampaignCredits(
  definition: CampaignCreditsDefinition,
  sceneId: string,
  flags: Record<string, boolean>,
): boolean {
  return definition.entries.some((entry) => entry.sceneId === sceneId
    && entry.requiredFlags.every((flag) => flags[flag]));
}
