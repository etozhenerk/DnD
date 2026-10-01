import {getAttributeBalance, getAttributeCost, getAttributeLimitIssues} from './attribute-balance';
import {creationRules} from './creation-catalog';
import type {ClassProfile} from './creation-catalog';

export type AttributeAdjustment = {
  baseValue: number;
  bonusValue: number;
  bonusCost: number;
  nextCost: number;
  canIncrease: boolean;
  canDecrease: boolean;
};

export function getAttributeAdjustment(id: string, attributes: Record<string, number>, profile: ClassProfile): AttributeAdjustment {
  const baseValue = profile.baseStats[id as keyof typeof profile.baseStats];
  const value = attributes[id] ?? baseValue;
  const nextCost = getAttributeCost(value + 1) - getAttributeCost(value);
  const next = {...attributes, [id]: value + 1};
  return {
    baseValue,
    bonusValue: value - baseValue,
    bonusCost: getAttributeCost(value) - getAttributeCost(baseValue),
    nextCost,
    canDecrease: value > baseValue,
    canIncrease: value < creationRules.pointBuy.maximumModifier
      && nextCost <= getAttributeBalance(attributes, profile).remaining
      && getAttributeLimitIssues(next).length === 0,
  };
}
