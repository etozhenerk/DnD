export type CampaignSessionPreviewStatus = 'preview';

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
  visualKind?: 'womanizer-case';
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

export interface CampaignSessionScene {
  id: string;
  title: string;
  eyebrow: string;
  background: string;
  backgroundLayout?: 'cover' | 'portrait';
  alt: string;
  readAloud: string;
  roomLegend?: string;
  introActionLabel?: string;
  inspectables: CampaignSceneInspectable[];
  exit: CampaignSceneExit | null;
}

export interface CampaignSessionPreview {
  version: number;
  id: string;
  campaignId: string;
  regionId: string;
  status: CampaignSessionPreviewStatus;
  initialSceneId: string;
  party: CampaignSessionPartyMember[];
  scenes: CampaignSessionScene[];
}
