import type {CharacterForm} from './types';
import {readAppearance} from './appearance';
import type {CharacterAppearance} from './appearance';

export function updateAppearance(form: CharacterForm, changes: Partial<CharacterAppearance>): CharacterForm {
  const appearance = {...readAppearance(form.formData), ...changes};
  const issues = form.validation.issues.filter((issue) => !issue.path.startsWith('appearance.'));
  if (!appearance.displayName.trim()) {
    issues.push({path: 'appearance.displayName', code: 'required', message: 'Введите имя героя'});
  }
  return {
    formData: {...form.formData, appearance},
    validation: {valid: false, issues},
  };
}
