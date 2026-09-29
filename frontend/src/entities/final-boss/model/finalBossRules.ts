import type {
  FinalBossDefinition,
  FinalBossPhaseDefinition,
  FinalBossPlanCheckResolution,
  FinalBossPlanDefinition,
} from './types';
import {resolveAttackAgainstArmor} from '../../combat/model/combatRules';
import {getDamageRoll, getRawDiceRange, resolveDamageTotal} from '../../../shared/lib/dice/diceExpression';

interface FinalBossAvailabilityState {
  flags: Record<string, boolean>;
  counters: Record<'timePressure' | 'preFinalCombats', number>;
}

export interface FinalBossInitiativeParticipant {
  id: string;
  name: string;
  modifier: number;
}

export interface FinalBossInitiativeEntry extends FinalBossInitiativeParticipant {
  natural: number;
  total: number;
}

export interface FinalBossAttackRollResolution {
  natural: number;
  bonus: number;
  total: number;
  targetAc: number;
  critical: boolean;
  hit: boolean;
}

export interface FinalBossDamageRollResolution {
  expression: string;
  critical: boolean;
  rawDiceTotal: number;
  modifier: number;
  amount: number;
  min: number;
  max: number;
}

export interface FinalBossSavingThrowResolution {
  natural: number;
  modifier: number;
  total: number;
  dc: number;
  success: boolean;
}

export interface FinalBossStrikeRollInput {
  targetId: string;
  natural: number;
  rawDamage?: number;
}

export interface FinalBossSavingThrowTurnInput {
  rawDamage: number;
  saves: Array<{
    heroId: string;
    natural: number;
  }>;
}

export type FinalBossEnemyTurnRollInput =
  | {kind: 'attacks'; strikes: FinalBossStrikeRollInput[]}
  | {kind: 'saving-throws'; resolution: FinalBossSavingThrowTurnInput};

export interface FinalBossPlanReactionInput {
  natural: number;
  rawDamage?: number;
}

export function isFinalBossD20(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 20;
}

export function resolveFinalBossInitiative(
  participants: FinalBossInitiativeParticipant[],
  rolls: Record<string, number>,
): {entries: FinalBossInitiativeEntry[]; order: string[]} | null {
  if (
    participants.length === 0
    || new Set(participants.map((participant) => participant.id)).size !== participants.length
  ) return null;
  const entries = participants.map((participant) => {
    const natural = rolls[participant.id];
    return isFinalBossD20(natural) && Number.isFinite(participant.modifier)
      ? {...participant, natural, total: natural + participant.modifier}
      : null;
  });
  if (entries.some((entry) => entry === null)) return null;
  const resolvedEntries = entries as FinalBossInitiativeEntry[];
  const sorted = resolvedEntries.slice().sort((left, right) => (
    right.total - left.total
    || right.modifier - left.modifier
    || left.id.localeCompare(right.id)
  ));
  return {entries: resolvedEntries, order: sorted.map((entry) => entry.id)};
}

export function getFinalBossEffectiveAttackBonus(
  actionBonus: number,
  canonicalPhaseBonus: number,
  currentEnemyBonus: number,
  temporaryModifier = 0,
) {
  return actionBonus + (currentEnemyBonus - canonicalPhaseBonus) + temporaryModifier;
}

export function getFinalBossRuntimeAttackBonus(
  definition: FinalBossDefinition,
  phaseNumber: number,
) {
  if (phaseNumber === 1) return definition.encounter.attack.bonus;
  return definition.encounter.phaseTransitions?.find(
    (transition) => transition.phase === phaseNumber,
  )?.attack.bonus ?? definition.phases.find(
    (phase) => phase.number === phaseNumber,
  )?.attack.bonus ?? definition.encounter.attack.bonus;
}

export function getFinalBossEffectiveHeroAttackBonus(
  canonicalBonus: number,
  manualOverride: number | undefined,
  temporaryModifier = 0,
  conditionModifier = 0,
) {
  return (manualOverride ?? canonicalBonus) + temporaryModifier + conditionModifier;
}

export function resolveFinalBossAttackRoll(
  natural: number,
  bonus: number,
  targetAc: number,
): FinalBossAttackRollResolution | null {
  return resolveAttackAgainstArmor(natural, bonus, targetAc);
}

export function getFinalBossDamageRange(expression: string, critical = false) {
  const damage = getDamageRoll(expression, critical);
  return damage ? getRawDiceRange(damage) : null;
}

export function resolveFinalBossDamageRoll(
  expression: string,
  critical: boolean,
  rawDiceTotal: number,
): FinalBossDamageRollResolution | null {
  const damage = getDamageRoll(expression, critical);
  if (!damage) return null;
  const range = getRawDiceRange(damage);
  const amount = resolveDamageTotal(damage, rawDiceTotal);
  return amount === null ? null : {
    expression,
    critical,
    rawDiceTotal,
    modifier: damage.modifier,
    amount,
    ...range,
  };
}

export function resolveFinalBossSavingThrow(
  natural: number,
  modifier: number,
  dc: number,
): FinalBossSavingThrowResolution | null {
  if (!isFinalBossD20(natural) || !Number.isFinite(modifier) || !Number.isFinite(dc)) return null;
  const total = natural + modifier;
  return {
    natural,
    modifier,
    total,
    dc,
    success: natural === 20 || (natural !== 1 && total >= dc),
  };
}

export function getFinalBossPhase(
  definition: FinalBossDefinition,
  hp: number,
): FinalBossPhaseDefinition {
  const boundedHp = Math.max(0, Math.min(definition.encounter.hp, hp));
  return definition.phases.find((phase, index) => (
    boundedHp <= phase.hpFrom
    && (boundedHp > phase.hpTo || (boundedHp === 0 && index === definition.phases.length - 1))
  )) ?? definition.phases[definition.phases.length - 1];
}

export function getFinalBossPhaseIndex(definition: FinalBossDefinition, hp: number) {
  return definition.phases.findIndex((phase) => phase.id === getFinalBossPhase(definition, hp).id);
}

export function getFinalBossPhaseFloor(definition: FinalBossDefinition, hp: number) {
  return getFinalBossPhase(definition, hp).hpTo;
}

export function capFinalBossDamage(
  definition: FinalBossDefinition,
  hp: number,
  requestedDamage: number,
) {
  if (!Number.isFinite(requestedDamage) || requestedDamage <= 0) return 0;
  if (definition.overflowDamageCarries) return Math.min(hp, Math.floor(requestedDamage));
  const floor = getFinalBossPhaseFloor(definition, hp);
  return Math.min(Math.max(0, hp - floor), Math.floor(requestedDamage));
}

export function isFinalBossPlanAvailable(
  plan: FinalBossPlanDefinition,
  state: FinalBossAvailabilityState,
) {
  if (plan.condition.always) return true;
  if (plan.condition.allFlags?.some((flag) => !state.flags[flag])) return false;
  const counterLimit = plan.condition.counterLte;
  if (counterLimit && state.counters[counterLimit.counter] > counterLimit.value) return false;
  return true;
}

export function getFinalBossEndingOutcome(plan: FinalBossPlanDefinition) {
  return {endingFlag: plan.endingFlag, endingId: plan.endingId};
}

export function getFinalBossPlanDc(
  definition: FinalBossDefinition,
  plan: FinalBossPlanDefinition,
  hp: number,
  prepared = false,
) {
  if (!plan.check) return null;
  const phaseIndex = getFinalBossPhaseIndex(definition, hp);
  const phase = definition.phases[phaseIndex];
  if (plan.id === 'director' && prepared && phase.preparedDirectorDc !== undefined) {
    return phase.preparedDirectorDc;
  }
  return plan.check.dcByPhase?.[phaseIndex] ?? plan.check.dc ?? phase.directorDc;
}

export function getFinalBossSegmentProgress(definition: FinalBossDefinition, hp: number) {
  const phase = getFinalBossPhase(definition, hp);
  const segmentSize = Math.max(1, phase.hpFrom - phase.hpTo);
  return Math.max(0, Math.min(1, (hp - phase.hpTo) / segmentSize));
}

export function areAllHeroesDown(heroHp: Record<string, number>, heroIds: string[]) {
  return heroIds.length > 0 && heroIds.every((heroId) => (heroHp[heroId] ?? 0) <= 0);
}

export function resolveFinalBossPlanCheck(
  definition: FinalBossDefinition,
  plan: FinalBossPlanDefinition,
  hp: number,
  modifier: number,
  natural: number,
): FinalBossPlanCheckResolution | null {
  if (!plan.check || !Number.isInteger(natural) || natural < 1 || natural > 20) return null;
  const dc = getFinalBossPlanDc(
    definition,
    plan,
    hp,
    plan.id === 'director',
  );
  if (dc === null) return null;
  const total = natural + modifier;
  return {
    dc,
    modifier,
    natural,
    success: natural === 20 || (natural !== 1 && total >= dc),
    total,
  };
}
