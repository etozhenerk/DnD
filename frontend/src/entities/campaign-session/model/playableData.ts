import {penisuelaSessionPreview as preview, penisuelaGalleryGameplay as gameplay, penisuelaDialogueBank as dialogue} from './data';
import {createPlayableCampaign} from './playableCampaign';

const playable = createPlayableCampaign(preview, gameplay, dialogue);
export const penisuelaSessionPreview = playable.preview;
export const penisuelaGalleryGameplay = playable.gameplay;
export const penisuelaDialogueBank = playable.dialogue;
export {penisuelaGalleryHeroes, homebrewConditions} from './data';
