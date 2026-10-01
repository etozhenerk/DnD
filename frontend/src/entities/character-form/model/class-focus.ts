import type {ClassProfile} from './creation-catalog';

export function getClassFocus(profile: ClassProfile): string[] {
  const stats = Object.entries(profile.baseStats);
  const maximum = Math.max(...stats.map(([, value]) => value));
  return stats.filter(([, value]) => value === maximum).map(([stat]) => stat);
}
