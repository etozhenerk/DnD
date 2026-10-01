import {creationRules, getSelectedClass} from './creation-catalog';
import type {ClassProfile} from './creation-catalog';

export function getAttributeCost(value: number): number {
  const costs: Record<string, number> = creationRules.pointBuy.costByModifier;
  return costs[String(value)] ?? 0;
}

export function getAttributeLimitIssues(attributes: Record<string, number> = {}) {
  const values = creationRules.stats.map((id) => attributes[id]);
  const rules = creationRules.pointBuy;
  const issues: string[] = [];
  if (values.some((value) => !Number.isInteger(value) || value < rules.minimumModifier || value > rules.maximumModifier)) {
    issues.push('Заполните все характеристики допустимыми значениями.');
  }
  if (values.filter((value) => value < 0).length > rules.maximumNegativeStats) issues.push('Отрицательными могут быть не более двух характеристик.');
  if (values.filter((value) => value < -2).length > rules.maximumStatsBelowMinusTwo) issues.push('Ниже −2 можно опустить только одну характеристику.');
  if (values.filter((value) => value === 4).length > rules.maximumStatsAtPlusFour) issues.push('Значение +4 можно назначить только одной характеристике.');
  return issues;
}

export function getAttributeBalance(attributes: Record<string, number> = {}, profile?: ClassProfile) {
  const totalSpent = creationRules.stats.reduce((sum, id) => sum + getAttributeCost(attributes[id]), 0);
  const spent = totalSpent - creationRules.classFoundation.baseBudget;
  const issues = getAttributeLimitIssues(attributes);
  if (!profile) issues.push('Выберите класс, чтобы получить основу характеристик.');
  if (profile && creationRules.stats.some((id) => attributes[id] < profile.baseStats[id as keyof typeof profile.baseStats])) {
    issues.push('Нельзя уменьшить характеристики ниже основы класса.');
  }
  const problems = [...issues];
  if (spent !== creationRules.classFoundation.bonusBudget) {
    issues.push(`Распределите ${creationRules.classFoundation.bonusBudget} дополнительных очка.`);
  }
  return {spent, totalSpent, remaining: creationRules.classFoundation.bonusBudget - spent, issues, problems};
}

export function getBuildVitals(formData: Record<string, unknown>, attributes: Record<string, number>) {
  const profile = getSelectedClass(formData);
  if (!profile) return null;
  const rules = creationRules.derivedStats;
  const contribution = Math.max(rules.baseAc.minimumDexterityContribution, Math.min(attributes.dexterity ?? 0, profile.dexterityAcCap));
  return {
    maxHp: profile.baseHp + rules.maxHp.constitutionMultiplier * (attributes.constitution ?? 0),
    baseAc: Math.max(rules.baseAc.minimum, Math.min(rules.baseAc.maximum, profile.baseAc + contribution)),
  };
}
