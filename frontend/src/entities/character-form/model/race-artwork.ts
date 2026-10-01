import manifest from '../../../../assets/concepts/manifest.json';
import {resolveAsset} from '../../../shared/lib/assets';

export function getRaceArtwork(id: string): string | undefined {
  const creatorArt = manifest.ui.find((asset) => asset.id === 'character-creator-race-' + id);
  if (creatorArt) return resolveAsset(creatorArt.path);
  const concept = manifest.races.find((race) => race.id === id);
  return concept ? resolveAsset(concept.path) : undefined;
}
