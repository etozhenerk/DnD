import type {ClassProfile} from '../../../entities/character-form';
import {getClassFocus} from '../../../entities/character-form';
import {getAttributeLabel} from '../../../entities/character';

export function getClassPresentation(profile: ClassProfile) {
  return {subtitle: getClassFocus(profile).map(getAttributeLabel).join(' · ')};
}
