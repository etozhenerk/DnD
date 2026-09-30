import type {CharacterDraft} from './types';

export function getDraftName(draft: CharacterDraft): string {
  const appearance = draft.formData.appearance;
  if (typeof appearance === 'object' && appearance !== null && 'displayName' in appearance
    && typeof appearance.displayName === 'string' && appearance.displayName.trim()) {
    return appearance.displayName;
  }
  return 'Ваш будущий герой';
}
