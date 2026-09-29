import type {CSSProperties} from 'react';
import type {CombatPortraitPresentation} from '../../../../entities/combat/model/view';

export function combatPortraitStyle(portrait: CombatPortraitPresentation) {
  return {
    '--portrait-scale': portrait.scale ?? 1,
    '--portrait-shift-y': `${portrait.shiftYPercent ?? 0}%`,
  } as CSSProperties;
}
