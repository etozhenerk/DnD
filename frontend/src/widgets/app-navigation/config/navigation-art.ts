import type {CSSProperties} from 'react';
import {resolveAsset} from '../../../shared/lib/assets';

export const navigationLogo = resolveAsset('assets/concepts/ui/character-creator/chronicles-logo.png');

export const navigationArt = {
  '--navigation-art': `url("${resolveAsset('assets/concepts/ui/character-creator/reference-trim.png')}")`,
} as CSSProperties;
