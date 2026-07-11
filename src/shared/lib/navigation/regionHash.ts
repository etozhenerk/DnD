const REGION_HASH = /^#\/region\/([a-z0-9-]+)$/;
const HEROES_HASH = '#/heroes';

export type AppView = 'atlas' | 'heroes' | 'region';

export function getRegionIdFromHash(hash: string): string | null {
  return hash.match(REGION_HASH)?.[1] ?? null;
}

export function createRegionHash(regionId: string): string {
  return `/region/${regionId}`;
}

export function createAtlasHash(): string {
  return '/';
}

export function createHeroesHash(): string {
  return '/heroes';
}

export function getViewFromHash(hash: string): AppView {
  if (REGION_HASH.test(hash)) return 'region';
  if (hash === HEROES_HASH) return 'heroes';
  return 'atlas';
}
