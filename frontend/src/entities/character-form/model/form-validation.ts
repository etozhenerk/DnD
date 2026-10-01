import {getAttributeBalance} from './attribute-balance';
import {getSkillBalance} from './skill-balance';
import {getSelectedClass, getSelectedRace} from './creation-catalog';
import type {CharacterFormData} from './build-types';
import type {FormValidation} from './types';

export function validateForm(data: CharacterFormData, confirmed: ReadonlySet<string>): FormValidation {
  const issues: FormValidation['issues'] = [];
  const add = (path: string, message: string) => issues.push({path, message, code: 'invalid'});
  if (!data.appearance?.displayName.trim()) add('appearance.displayName', 'Введите имя героя.');
  if ((data.appearance?.personality.length ?? 0) > 20) add('appearance.personality', 'Не более 20 черт характера.');
  if (!getSelectedRace(data)) add('race', 'Выберите расу.');
  if (!getSelectedClass(data)) add('class', 'Выберите класс.');
  getAttributeBalance(data.attributes, getSelectedClass(data)).issues.forEach((message) => add('attributes', message));
  if (!data.abilities || !confirmed.has('abilities')) add('abilities', 'Подтвердите набор навыков.');
  if (data.abilities) getSkillBalance(data.abilities).issues.forEach((message) => add('abilities', message));
  if (!data.equipment || !confirmed.has('equipment')) add('equipment', 'Подтвердите снаряжение.');
  if (data.equipment?.items.some((item) => !item.name.trim())) add('equipment', 'Назовите каждый предмет.');
  if ((data.equipment?.items.length ?? 0) > 20) add('equipment', 'Не более 20 предметов.');
  return {valid: issues.length === 0, issues};
}
