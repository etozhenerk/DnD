import type {CombatActionDefinition, CombatEventInput} from '../../../entities/combat/model/types';
import {isCombatAllyActive} from '../../../entities/combat/model/combatRules.ts';
import {getDamageRoll, resolveDamageTotal} from '../../../shared/lib/dice/diceExpression.ts';
import type {CombatCommandContext} from './combatCommands';

/** A rescued guest spends their single turn; the resulting status outlives that guest. */
export function createGuestSkillEffects(
  context: CombatCommandContext,
  action: CombatActionDefinition,
  selectedTargetId?: string,
  roll?: number,
): CombatEventInput[] | null {
  const {combat, heroes, heroHp} = context;
  const ally = combat.allies[action.characterId];
  const effect = action.effects.find((candidate) => candidate.type === 'guest-skill');
  if (!ally || ally.remainingTurns === undefined || !isCombatAllyActive(combat, ally.id)
    || combat.initiativeOrder[combat.turnIndex] !== ally.id || !effect) return null;
  const enemy = combat.enemies[effect.enemyId];
  if (!enemy || enemy.hp <= 0 || enemy.kind === 'object') return null;
  if (effect.kind === 'healing-note') {
    const dice = effect.dice ? getDamageRoll(effect.dice) : null;
    const amount = dice && roll !== undefined && Number.isInteger(roll) ? resolveDamageTotal(dice, roll) : null;
    if (amount === null || !heroes.some((hero) => (heroHp[hero.id] ?? 0) < hero.maxHp)) return null;
    return heroes.map((hero) => ({type: 'healing-applied', targetId: hero.id, amount, maxHp: hero.maxHp,
      text: `${ally.name}: «${action.name}» — ${hero.name} восстанавливает ${Math.min(amount, Math.max(0, hero.maxHp - (heroHp[hero.id] ?? 0)))} HP.`}));
  }
  const hero = heroes.find((candidate) => candidate.id === selectedTargetId && (heroHp[candidate.id] ?? 0) > 0
    && !(context.participantConditions[candidate.id] ?? []).includes('downed'));
  if (effect.kind === 'grease-trap' ? selectedTargetId !== enemy.id : !hero) return null;
  const targetId = effect.kind === 'grease-trap' ? enemy.id : hero!.id;
  return [{type: 'combat-status-applied', status: {
    id: `${action.id}-${targetId}`, kind: effect.kind === 'grease-trap' ? 'grease-trap' : 'guest-critical',
    sourceActorId: ally.id, targetId, charges: 1,
    ...(effect.kind === 'guaranteed-critical' ? {againstTargetId: enemy.id} : {}),
  }, text: effect.kind === 'grease-trap'
    ? `${ally.name}: «${action.name}». Следующая атака ${enemy.name} отразится в него самого.`
    : `${ally.name}: «${action.name}». Следующая атака ${hero!.name} по ${enemy.name} — гарантированный крит без d20.`}];
}
