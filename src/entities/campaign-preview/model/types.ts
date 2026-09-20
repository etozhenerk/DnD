export type CampaignPreviewStatus = 'preview';
export type CampaignPreviewSpeakerKind = 'narrator' | 'character';

export interface CampaignPreviewSpeaker {
  kind: CampaignPreviewSpeakerKind;
  label: string;
  characterId?: string;
}

export interface CampaignPreviewSlide {
  id: string;
  order: number;
  image: string;
  alt: string;
  speaker: CampaignPreviewSpeaker;
  text: string;
}

export interface CampaignPreview {
  version: number;
  id: string;
  campaignId: string;
  regionId: string;
  title: string;
  eyebrow: string;
  status: CampaignPreviewStatus;
  music?: CampaignPreviewMusic;
  outro?: CampaignPreviewOutro;
  slides: CampaignPreviewSlide[];
}

export interface CampaignPreviewMusic {
  id: string;
  title: string;
  source: string;
  volume: number;
  fadeOutMs: number;
}

export interface CampaignPreviewOutro {
  video: {
    id: string;
    title: string;
    source: string;
  };
  titleCard: {
    text: string;
    durationMs: number;
  };
  nextSceneId: string;
}
