import type {Campaign} from '../../../entities/campaign/model/types';
import type {Character} from '../../../entities/character/model/types';

export function getParty(campaign: Campaign, characters: Character[]): Character[] {
  return campaign.partyCharacterIds
    .map((id) => characters.find((character) => character.id === id))
    .filter((character): character is Character => Boolean(character));
}
