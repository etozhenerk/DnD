import creationRules from '../../../../../content/character-creation.json';
import abilityRules from '../../../../../content/character-abilities.json';
import racesData from '../../../../../content/races.json';

export {creationRules, abilityRules};
export const playableRaces = racesData.filter(
  (race): race is typeof racesData[number] & {feature: {name: string; effect: string}} =>
    race.status === 'playable' && race.feature !== undefined,
);
export const classProfiles = creationRules.classProfiles;
export type ClassProfile = typeof classProfiles[number];
export type PlayableRace = typeof playableRaces[number];

export function getSelectedClass(formData: Record<string, unknown>): ClassProfile | undefined {
  const selection = formData.class;
  if (!selection || typeof selection !== 'object' || !('classId' in selection)) return undefined;
  return classProfiles.find((profile) => profile.id === selection.classId);
}

export function getSelectedRace(formData: Record<string, unknown>): PlayableRace | undefined {
  const selection = formData.race;
  if (!selection || typeof selection !== 'object' || !('raceId' in selection)) return undefined;
  return playableRaces.find((race) => race.id === selection.raceId);
}
