import type {CombatEventInput} from '../../../entities/combat/model/types';
import {
  createEnemyAttackCommand,
  createResolveCombatSavingThrowCommand,
  resolveAlliedCombatSavingThrowReactions,
  type CombatCommandContext,
} from './combatCommands';

/** Preview the real command without applying events or spending the reaction. */
export function getCombatHelpingReaction(
  context: CombatCommandContext,
  targetId: string,
  roll: number,
  rerolledFrom?: number,
): {description: string} | undefined {
  if (!Number.isInteger(roll) || roll < 1 || roll > 20 || context.combat.pendingAttack) return;
  const {combat} = context;
  const helping = combat.statuses.find((status) => status.kind === 'helping-reaction' && status.charges > 0);
  if (!helping) return;
  const save = combat.pendingSavingThrow;
  const enemy = combat.enemies[combat.initiativeOrder[combat.turnIndex]];
  const target = context.heroes.find((hero) => hero.id === targetId);
  if (!save && enemy?.attack.savingThrow && target) {
    if (combat.statuses.some((status) => status.targetId === enemy.id && status.kind === 'jammed' && status.charges > 0)) return;
    const check = enemy.attack.savingThrow;
    const result = resolveAlliedCombatSavingThrowReactions(context, targetId, roll, target.stats[check.stat] ?? 0, check.dc, true);
    return result ? {description: `${target.name}: спасбросок ${result.total - 2} → ${result.total} против DC ${check.dc}. Провал станет успехом.`} : undefined;
  }
  let events: CombatEventInput[] | null;
  if (save) events = createResolveCombatSavingThrowCommand(context, roll, rerolledFrom, true);
  else events = createEnemyAttackCommand(context, targetId, roll, undefined, true);
  if (!events?.some((event) => event.type === 'combat-status-removed' && event.statusId === helping.id
    || event.type === 'combat-status-applied' && event.status.id === helping.id && event.status.charges < helping.charges)) return;
  const attack = events.find((event) => event.type === 'combat-attack-resolved');
  if (attack?.type === 'combat-attack-resolved') return {
    description: `${attack.attack.targetName}: AC ${attack.attack.targetAc - 2} → ${attack.attack.targetAc} только против этой атаки. Попадание ${attack.attack.total} станет промахом.`,
  };
  if (save?.kind === 'enemy-skill') {
    const result = resolveAlliedCombatSavingThrowReactions(context, save.targetId, roll, save.modifier, save.dc, true);
    if (result) return {description: `${save.targetName}: спасбросок ${result.total - 2} → ${result.total} против DC ${save.dc}. Провал станет успехом.`};
  }
}
