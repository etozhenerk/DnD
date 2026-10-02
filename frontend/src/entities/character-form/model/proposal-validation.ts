import type {CharacterFormData} from './build-types';
import {validateForm} from './form-validation';

export function canApplyCharacterProposal(data: CharacterFormData): boolean {
  return validateForm(data, new Set(['abilities', 'equipment'])).valid;
}
