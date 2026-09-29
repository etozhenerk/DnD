export type RegionStatus = 'completed' | 'ready' | 'planned';

export interface RegionTeaser {
  image: string;
  eyebrow: string;
  title: string;
  description: string;
}

export interface Region {
  order: number;
  id: string;
  name: string;
  subtitle?: string;
  description: string;
  image: string;
  imageLayers?: string[];
  gameMasterCharacterId?: string;
  teaser?: RegionTeaser;
  campaignId: string | null;
  status: RegionStatus;
  polygon: [number, number][];
  additionalPolygons?: [number, number][][];
}

export interface WorldMap {
  id: string;
  image: string;
  viewBox: {width: number; height: number};
  interaction: 'polygon';
  regions: Region[];
}
