export type RegionStatus = 'completed' | 'ready' | 'planned';

export interface Region {
  order: number;
  id: string;
  aliases?: string[];
  name: string;
  description: string;
  image: string;
  imageLayers?: string[];
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
