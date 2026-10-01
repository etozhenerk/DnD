import {abilityRules} from './creation-catalog';
import type {CharacterSkills} from './build-types';

export function createEmptySkills(attributes: Record<string, number> = {}): CharacterSkills {
  const modifierStat = [...abilityRules.modifierStats].sort((left, right) => (attributes[right] ?? 0) - (attributes[left] ?? 0))[0];
  return {basicAction: {name: 'Базовая атака', description: '', modifierStat}, items: [], narrativeItems: []};
}

export function getSkillBalance(skills: CharacterSkills) {
  const issues: string[] = [];
  if (!skills.basicAction.name.trim()) issues.push('Назовите базовую атаку.');
  const actions = [skills.basicAction, ...skills.items];
  if (actions.some((action) => !abilityRules.modifierStats.includes(action.modifierStat))) issues.push('Выберите характеристику каждого действия.');
  if (skills.items.some((item) => !item.name.trim())) issues.push('Назовите каждый активный навык.');
  const profiles = skills.items.map((item) => abilityRules.profiles.find((profile) => profile.id === item.profileId));
  if (profiles.some((profile) => !profile)) issues.push('Выберите эффект каждого навыка.');
  if (new Set(skills.items.map((item) => item.profileId)).size !== skills.items.length) issues.push('Один профиль эффекта можно использовать только один раз.');
  const spent = profiles.reduce((sum, profile) => sum + (profile?.points ?? 0), 0);
  if (spent > abilityRules.budget.points) issues.push('Уменьшите стоимость навыков до доступного бюджета.');
  if (skills.items.length > abilityRules.budget.maximumCustomAbilities) issues.push('Слишком много активных навыков.');
  if (skills.narrativeItems.length > abilityRules.narrativeAbilities.maximum) issues.push('Слишком много повествовательных особенностей.');
  if (skills.narrativeItems.some((item) => !item.name.trim() || !item.description.trim())) issues.push('Заполните имя и описание каждой особенности.');
  return {spent, remaining: abilityRules.budget.points - spent, issues};
}

export function getProfileLabel(profileId: string): string {
  const profile = abilityRules.profiles.find((item) => item.id === profileId);
  if (!profile) return 'Выберите эффект';
  const kind = profile.kind === 'damage' ? 'Урон' : 'Лечение';
  return `${kind}: ${profile.dice.count}d${profile.dice.sides} · ${profile.uses.max} за бой · ${profile.points} очк.`;
}
