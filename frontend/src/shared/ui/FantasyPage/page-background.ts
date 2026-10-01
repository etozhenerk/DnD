import type {CSSProperties} from 'react';
import {resolveAsset} from '../../lib/assets';

export const pageBackground = {
  '--creator-backdrop': `url("${resolveAsset('assets/concepts/ui/character-creator/reference-forest.png')}")`,
  '--creator-wood': `url("${resolveAsset('assets/concepts/ui/character-creator/reference-wood.png')}")`,
  '--creator-rail': `url("${resolveAsset('assets/concepts/ui/character-creator/reference-trim.png')}")`,
} as CSSProperties;
