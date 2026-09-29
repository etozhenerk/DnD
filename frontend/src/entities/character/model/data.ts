import charactersData from '../../../../content/characters.json';
import type {Character} from './types';

export const characters = charactersData as Character[];

export function getCharacterById(characterId?: string): Character | undefined {
  return characterId ? characters.find((character) => character.id === characterId) : undefined;
}
