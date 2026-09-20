import campaignSessionData from '../../../../content/campaigns/penisuela-session-preview.json';
import dialogueData from '../../../../content/campaigns/penisuela-dialogue.json';
import galleryGameplayData from '../../../../content/campaigns/penisuela-gallery-gameplay.json';
import charactersData from '../../../../content/characters.json';
import rulesData from '../../../../content/rules.json';
import type {GalleryGameplayDefinition, GalleryHeroSource} from './galleryGameplay';
import type {DialogueBankDefinition} from './dialoguePresets';
import type {CampaignSessionPreview} from './types';

export const penisuelaSessionPreview = campaignSessionData as CampaignSessionPreview;
export const penisuelaGalleryGameplay = galleryGameplayData as GalleryGameplayDefinition;
export const penisuelaDialogueBank = dialogueData as DialogueBankDefinition;

const partyIds = new Set(penisuelaSessionPreview.party.map((member) => member.characterId));

export const penisuelaGalleryHeroes = (charactersData as GalleryHeroSource[])
  .filter((character) => partyIds.has(character.id));

export const homebrewConditions = rulesData.conditions;
