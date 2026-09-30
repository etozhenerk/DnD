import type {CSSProperties} from 'react';
import {resolveAsset} from '../../lib/assets';

export const pageBackground = {
  '--creator-backdrop': `url("${resolveAsset('assets/concepts/ui/character-creator/moonlit-forest.png')}")`,
  '--creator-wood': `url("${resolveAsset('assets/concepts/style/atlas-background.webp')}")`,
} as CSSProperties;
