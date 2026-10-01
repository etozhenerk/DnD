import manifest from '../../../../assets/concepts/manifest.json';
import {resolveAsset} from '../../../shared/lib/assets';

export function getClassArtwork(id: string): string | undefined {
  const concept = manifest.ui.find((asset) => asset.id === 'character-creator-class-' + id);
  return concept ? resolveAsset(concept.path) : undefined;
}
