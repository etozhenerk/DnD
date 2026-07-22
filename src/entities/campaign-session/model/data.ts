import campaignSessionData from '../../../../content/campaigns/penisuela-session-preview.json';
import galleryGameplayData from '../../../../content/campaigns/penisuela-gallery-gameplay.json';
import charactersData from '../../../../content/characters.json';
import type {GalleryGameplayDefinition, GalleryHeroSource} from './galleryGameplay';
import type {CampaignSessionPreview} from './types';

export const penisuelaSessionPreview = campaignSessionData as CampaignSessionPreview;
export const penisuelaGalleryGameplay = galleryGameplayData as GalleryGameplayDefinition;

const partyIds = new Set(penisuelaSessionPreview.party.map((member) => member.characterId));

export const penisuelaGalleryHeroes = (charactersData as GalleryHeroSource[])
  .filter((character) => partyIds.has(character.id));
