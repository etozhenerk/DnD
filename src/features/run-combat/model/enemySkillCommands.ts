import type {CombatActionDefinition, CombatEventInput, CombatPendingSavingThrow} from '../../../entities/combat/model/types';
import {getCombatStatModifier} from '../../../entities/combat/model/combatRules.ts';
import {mitigateCombatDamage, createColdHitReactions} from '../../../entities/combat/model/combatDamage';
import {getDamageRoll, resolveDamageTotal} from '../../../shared/lib/dice/diceExpression.ts';
import {createCombatActionUsageEvent, resolveAlliedCombatSavingThrowReactions, type CombatCommandContext} from './combatCommands.ts';

export function getEnemySkillTargets(context: Pick<CombatCommandContext, 'heroes' | 'heroHp' | 'participantConditions'>, max: number, selectedId?: string) {
  return context.heroes.filter((hero) => (context.heroHp[hero.id] ?? 0) > 0
    && !(context.participantConditions[hero.id] ?? []).includes('downed'))
    .sort((a, b) => Number(b.id === selectedId) - Number(a.id === selectedId)
      || (context.heroHp[b.id] ?? 0) - (context.heroHp[a.id] ?? 0) || a.id.localeCompare(b.id))
    .slice(0, max);
}

export function createEnemySkillEffects(context: CombatCommandContext, action: CombatActionDefinition, selectedId?: string, roll?: number): CombatEventInput[] | null {
  const {combat} = context;
  const enemy = combat.enemies[action.characterId];
  if (!enemy || enemy.hp <= 0 || enemy.kind === 'object') return null;
  const summon = action.effects.find((effect) => effect.type === 'enemy-summon');
  const save = action.effects.find((effect) => effect.type === 'enemy-saving-throw');
  const events: CombatEventInput[] = [createCombatActionUsageEvent(action), {type: 'combat-action-selected', actionId: action.id, selected: false}];
  const area = action.effects.find((effect) => effect.type === 'enemy-area-damage');
  const crown = action.effects.find((effect) => effect.type === 'enemy-crown');
  if (area || crown) {
    const dice = getDamageRoll(area?.damage ?? crown!.retaliationDice);
    const damage = dice && roll !== undefined && Number.isInteger(roll) ? resolveDamageTotal(dice, roll) : null;
    if (damage === null) return null;
    if (crown) events.push({type: 'combat-status-applied', status: {
      id: `${action.id}-shield`, kind: 'retaliating-crown', sourceActorId: enemy.id, targetId: enemy.id,
      charges: 1, amount: crown.acBonus, retaliationDamage: damage, expiresAtTurnStartOf: enemy.id,
    }, text: `${enemy.name}: «${action.name}». +${crown.acBonus} AC; ответный урон ${crown.retaliationDice} = ${damage}.`});
    if (area) {
      const targets = getEnemySkillTargets(context, area.maxTargets);
      if (!targets.length) return null;
      for (const hero of targets) {
        const {amount, explanation} = mitigateCombatDamage(combat, hero.id, area.damageType, damage);
        events.push({type: 'combat-damage-resolved', targetId: hero.id, amount,
          text: `${enemy.name}: «${action.name}» → ${hero.name}; ${area.damage} = ${damage}, применено ${amount}${explanation ? `; ${explanation}` : ''}. Без спасброска.`},
          ...createColdHitReactions(combat, hero.id, area.damageType, amount));
      }
    }
    events.push({type: 'turn-advanced'});
    return events;
  }
  if (summon && summon.unit.attack) {
    const unit = summon.unit;
    events.push({type: 'combat-enemies-summoned', enemies: Array.from({length: summon.count}, (_, index) => ({
      id: `${unit.id}-${index + 1}`, name: `${unit.name} ${index + 1}`, hp: unit.hp ?? 8, maxHp: unit.hp ?? 8,
      ac: unit.ac ?? 12, initiative: unit.initiative ?? 2, attack: unit.attack!, token: summon.tokens?.[index] ?? unit.token,
      summonedBy: enemy.id, remainingTurns: summon.turns,
    })), text: `${enemy.name}: «${action.name}». Два ассистента вступают в очередь; каждый действует ${summon.turns} раза.`}, {type: 'turn-advanced'});
    return events;
  }
  if (!save) return null;
  const targets = getEnemySkillTargets(context, save.maxTargets, selectedId);
  if (!targets.length || (action.target === 'enemy' && !targets.some((hero) => hero.id === selectedId))) return null;
  const dice = save.damage ? getDamageRoll(save.damage) : null;
  const damage = dice && roll !== undefined && Number.isInteger(roll) ? resolveDamageTotal(dice, roll) : save.damage ? null : 0;
  if (damage === null) return null;
  const [first, ...remaining] = targets;
  events.push({type: 'combat-log-added', text: `${enemy.name}: «${action.name}». Цели: ${targets.map((hero) => hero.name).join(', ')}${dice ? `; общий урон ${damage}` : ''}.`}, {
    type: 'combat-saving-throw-requested', savingThrow: {
      kind: 'enemy-skill', sourceActorId: enemy.id, sourceName: enemy.name, targetId: first.id, targetName: first.name,
      stat: save.stat, modifier: (first.stats[save.stat] ?? 0) + getCombatStatModifier(combat, first.id, save.stat), dc: save.dc,
      failureConditions: save.failureCondition ? [save.failureCondition] : [], duration: 'next-attack', rollExpression: '1d20',
      enemySkill: {actionId: action.id, actionName: action.name, remainingTargetIds: remaining.map((hero) => hero.id), damage,
        damageType: save.damageType, successAttackBonus: save.successAttackBonus},
    },
  });
  return events;
}

export function resolveEnemySkillSave(context: CombatCommandContext, roll?: number, useHelpingReaction = false): CombatEventInput[] | null {
  const {combat} = context;
  const save = combat.pendingSavingThrow;
  const skill = save?.enemySkill;
  if (!save || save.kind !== 'enemy-skill' || !skill || roll === undefined || combat.pendingAttack
    || combat.initiativeOrder[combat.turnIndex] !== save.sourceActorId
    || (combat.enemies[save.sourceActorId]?.hp ?? 0) <= 0 || (context.heroHp[save.targetId] ?? 0) <= 0) return null;
  const result = resolveAlliedCombatSavingThrowReactions(context, save.targetId, roll, save.modifier, save.dc, useHelpingReaction);
  if (!result) return null;
  const events: CombatEventInput[] = [...result.events, {type: 'combat-saving-throw-resolved',
    text: `${save.targetName}: ${roll} + ${result.modifier} = ${result.total} против DC ${save.dc}; ${result.success ? 'успех' : 'провал'} (${skill.actionName}).`}];
  if (skill.damage > 0) {
    const afterSave = result.success ? Math.floor(skill.damage / 2) : skill.damage;
    const {amount, explanation} = mitigateCombatDamage(combat, save.targetId, skill.damageType, afterSave);
    events.push({type: 'combat-damage-resolved', targetId: save.targetId, amount,
      text: `${save.targetName}: ${amount} урона${result.success ? ', спасбросок уменьшил урон вдвое' : ''}${explanation ? `; ${explanation}` : ''}.`},
      ...createColdHitReactions(combat, save.targetId, skill.damageType, amount));
  }
  if (!result.success) for (const condition of save.failureConditions) events.push({type: 'combat-condition-changed', participantId: save.targetId,
    condition, active: true, text: `${save.targetName}: ${condition === 'prone' ? 'падение; любые атаки по цели с преимуществом до начала её очереди, затем подъём без штрафа' : 'помеха на следующую атаку'}.`});
  if (result.success && skill.successAttackBonus) events.push({type: 'combat-attack-modifier-applied', modifier: {
    id: `${skill.actionId}-${save.targetId}`, sourceActorId: save.sourceActorId, targetIds: [save.targetId],
    againstTargetIds: [save.sourceActorId], amount: skill.successAttackBonus, consumeOnAttack: true,
  }, text: `${save.targetName} посылает Нетака: +${skill.successAttackBonus} к следующей атаке по нему.`});
  const next = skill.remainingTargetIds.map((id) => context.heroes.find((hero) => hero.id === id))
    .filter((hero) => hero && (context.heroHp[hero.id] ?? 0) > 0);
  const first = next[0];
  if (first) {
    const pending: CombatPendingSavingThrow = {...save, targetId: first.id, targetName: first.name,
      modifier: (first.stats[save.stat] ?? 0) + getCombatStatModifier(combat, first.id, save.stat),
      enemySkill: {...skill, remainingTargetIds: next.slice(1).map((hero) => hero!.id)}};
    events.push({type: 'combat-saving-throw-requested', savingThrow: pending});
  } else events.push({type: 'turn-advanced'});
  return events;
}
