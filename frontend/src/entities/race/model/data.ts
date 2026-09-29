import conceptManifestData from '../../../../assets/concepts/manifest.json';
import racesData from '../../../../content/races.json';
import type {Race, RaceConcept} from './types';

export const races = racesData as Race[];
export const raceConcepts = conceptManifestData.races as RaceConcept[];
