type ArtworkBounds = readonly [left: number, top: number, right: number, bottom: number];

const artworkBounds: Record<string, ArtworkBounds> = {
  'cloud-island': [382, 40, 678, 321],
  'desert-lands': [592, 557, 985, 979],
  'great-tree-island': [37, 467, 242, 730],
  'green-peninsula': [0, 312, 553, 740],
  'mushroom-forest': [530, 430, 888, 709],
  'nor-il-skald': [0, 0, 402, 418],
  'waterfall-island': [599, 6, 1000, 427],
  'white-castle-island': [36, 618, 510, 1024],
};

export function getRegionArtworkViewBox(regionId: string, paddingRatio = 0.06): string {
  const bounds = artworkBounds[regionId];

  if (!bounds) {
    return '0 0 1024 1024';
  }

  const [left, top, right, bottom] = bounds;
  const width = right - left;
  const height = bottom - top;
  const size = Math.max(width, height) * (1 + paddingRatio * 2);
  const x = (left + right - size) / 2;
  const y = (top + bottom - size) / 2;

  return `${x} ${y} ${size} ${size}`;
}
