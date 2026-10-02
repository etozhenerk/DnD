import {resolveAsset} from '../../../shared/lib/assets';
import type {AdvisorMood} from '../model/types';

export type AdvisorAnimation = {
  row: number;
  durations: readonly number[];
  loop: boolean;
};

export const advisorSprites = resolveAsset('assets/concepts/ui/character-creator/advisor/advisor-sprites-v1.webp');
export const advisorBranch = resolveAsset('assets/concepts/ui/character-creator/advisor/advisor-branch-v1.webp');
export const spriteGeometry = {
  width: 384, height: 352, columns: 6, rows: 7,
  insetX: 70, insetY: 40, viewportWidth: 304, viewportHeight: 300,
};
export const advisorViewport = `${spriteGeometry.insetX} ${spriteGeometry.insetY} ${spriteGeometry.viewportWidth} ${spriteGeometry.viewportHeight}`;
export const advisorClawsOutline = '108,232 223,232 221,274 214,285 207,295 198,304 108,304';

const greeting: AdvisorAnimation = {row: 3, durations: [180, 140, 160, 240, 160, 240], loop: false};

export const advisorAnimations: Record<AdvisorMood, AdvisorAnimation> = {
  idle: {row: 0, durations: [2600, 180, 140, 1300], loop: true},
  thinking: {row: 1, durations: [500, 420, 360, 600], loop: true},
  speaking: {row: 2, durations: [150, 140, 160, 200], loop: true},
  greeting,
  happy: greeting,
  error: {row: 4, durations: [180, 340, 360, 400], loop: false},
  curious: {row: 5, durations: [180, 300, 650, 350], loop: false},
  playful: {row: 6, durations: [160, 240, 620, 220], loop: false},
};
