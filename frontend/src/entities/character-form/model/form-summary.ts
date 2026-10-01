import type {CharacterForm} from './types';

export function getFormName(form: CharacterForm): string {
  const appearance = form.formData.appearance;
  if (typeof appearance === 'object' && appearance !== null && 'displayName' in appearance
    && typeof appearance.displayName === 'string' && appearance.displayName.trim()) {
    return appearance.displayName;
  }
  return 'Ваш будущий герой';
}
