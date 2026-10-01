import {prepareImage} from '../../../shared/lib/local-images';
import type {LocalImage} from '../../../shared/lib/local-images';
import type {CharacterSubmission} from './submission';

export type CharacterMedia = {
  portrait?: LocalImage;
  icons: {abilityId: string; image: LocalImage}[];
};

export function getMediaSignature(media: CharacterMedia): string {
  return JSON.stringify([media.portrait?.id, ...media.icons.map(({abilityId, image}) => [abilityId, image.id])]);
}

export async function prepareCharacterUpload(submission: CharacterSubmission, media: CharacterMedia) {
  const body = new FormData();
  body.append('character', new Blob([JSON.stringify(submission)], {type: 'application/json'}));
  if (media.portrait) {
    const portrait = await prepareImage(media.portrait.file, 1600, 1024 * 1024);
    body.append('portrait', portrait, portrait.type === 'image/png' ? 'portrait.png' : 'portrait.jpg');
  }
  for (const {abilityId, image} of media.icons) {
    const icon = await prepareImage(image.file, 512, 128 * 1024);
    body.append('icon:' + abilityId, icon, icon.type === 'image/png' ? 'icon.png' : 'icon.jpg');
  }
  return body;
}
