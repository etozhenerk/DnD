export type CampaignSessionPreviewStatus = 'ready';

export interface CampaignSessionPartyMember {
  characterId: string;
  label: string;
  token: string;
}

export interface CampaignSceneInspectable {
  id: string;
  label: string;
  image?: string;
  icon?: string;
  visualKind?: 'womanizer-case' | 'alexis-fashion-certificate' | 'bungalow-pass' | 'grey-wiese-perfume' | 'olva-timeout';
  locationHint: string;
  summary: string;
  revealText: string;
  useText: string;
  order: number;
  inventoryOrder?: number;
  hotspotPosition?: {
    x: number;
    y: number;
  };
}

export interface CampaignSceneExit {
  label: string;
  nextSceneId: string;
  availableAfter: string[];
  presentation?: 'door' | 'control';
}

export type CampaignOutfitCategoryId = 'top' | 'bottom' | 'accent';

export interface CampaignOutfitOption {
  id: string;
  setId: string;
  label: string;
  image: string;
  alt: string;
}

export interface CampaignOutfitCategory {
  id: CampaignOutfitCategoryId;
  label: string;
  options: CampaignOutfitOption[];
}

export interface CampaignOutfitBuilder {
  pageSize: 2;
  categories: CampaignOutfitCategory[];
}

export interface CampaignSessionScene {
  id: string;
  title: string;
  eyebrow: string;
  background: string;
  backgroundLayout?: 'cover' | 'contain' | 'portrait';
  alt: string;
  readAloud: string;
  roomLegend?: string;
  introActionLabel?: string;
  interactionViews?: Array<{
    id: string;
    background: string;
    alt: string;
    readAloud?: string;
    outfitBuilder?: CampaignOutfitBuilder;
  }>;
  inspectables: CampaignSceneInspectable[];
  exit: CampaignSceneExit | null;
}

export interface CampaignSceneBlock {
  id: string;
  title: string;
  entrySceneId: string;
  sceneIds: string[];
}

export interface CampaignSessionPreview {
  sceneBlocks?: CampaignSceneBlock[];
  version: number;
  id: string;
  campaignId: string;
  regionId: string;
  status: CampaignSessionPreviewStatus;
  initialSceneId: string;
  party: CampaignSessionPartyMember[];
  scenes: CampaignSessionScene[];
}
