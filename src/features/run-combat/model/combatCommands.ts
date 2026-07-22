import {
  createCombatInitiative,
  resolveAttackAgainstArmor,
  resolvePendingDamage,
  rollDamage,
  rollDie,
} from '../../../entities/combat/model/combatRules';
import type {
  CombatActionDefinition,
  CombatDefinition,
  CombatEncounterDefinition,
  CombatEventInput,
  CombatHeroSource,
  CombatState,
  CombatStat,
} from '../../../entities/combat/model/types';
import {getDamageRoll, resolveDamageTotal} from '../../../shared/lib/dice/diceExpression';

interface CombatCommandContext {
  combat: CombatState;
  definition: CombatDefinition;
  heroes: CombatHeroSource[];
  heroHp: Record<string, number>;
}
export function combatActionsConflict(
  first: CombatActionDefinition,
  second: CombatActionDefinition,
) {
  const firstHeals = first.effects.some((effect) => effect.type === 'healing');
  const secondHeals = second.effects.some((effect) => effect.type === 'healing');
  const firstExposesWeakness = first.effects.some((effect) => effect.type === 'expose-weakness');
  const secondExposesWeakness = second.effects.some((effect) => effect.type === 'expose-weakness');
  return firstHeals || secondHeals || (firstExposesWeakness && secondExposesWeakness);
}

export function createStartCombatCommand(
  encounter: CombatEncounterDefinition,
  heroes: CombatHeroSource[],
  roll: (sides: number) => number = rollDie,
): CombatEventInput {
  return {
    type: 'combat-started',
    encounterId: encounter.id,
    initiativeOrder: createCombatInitiative(encounter, heroes, roll),
  };
}

export function createHeroAttackCommand(
  context: CombatCommandContext,
  heroId: string,
  targetEnemyId: string,
  providedRoll?: number,
): CombatEventInput[] | null {
  const {combat, definition, heroes} = context;
  const encounter = definition.encounters.find((item) => item.id === combat.encounterId);
  const attack = encounter?.heroAttacks.find((item) => item.characterId === heroId);
  const target = combat.enemies[targetEnemyId];
  if (!encounter || combat.pendingAttack || !attack || !target || target.hp <= 0) return null;
  if (combat.initiativeOrder[combat.turnIndex] !== heroId) return null;

  const selectedWeaknessActions = definition.combatActions.filter((action) => (
    combat.selectedActionIds.includes(action.id)
    && action.characterId === heroId
    && (action.source === 'ability' || combat.equippedItems[heroId] === action.id)
    && action.effects.some((effect) => effect.type === 'expose-weakness')
    && action.encounterIds.includes(combat.encounterId)
    && (combat.actionUses[action.id] ?? 0) < action.uses.max
  ));
  const selectedActions = selectedWeaknessActions.slice(0, 1);
  const targetAc = selectedActions.length > 0 ? encounter.weakness.reducedAc : target.ac;
  const natural = providedRoll ?? rollDie(20);
  const attackRoll = resolveAttackAgainstArmor(natural, attack.bonus, targetAc);
  if (!attackRoll) return null;

  const actorName = heroes.find((hero) => hero.id === heroId)?.name ?? 'Герой';
  const {critical, hit, total} = attackRoll;
  const selectedActionsLabel = selectedActions.map((action) => `«${action.name}»`).join(' + ');
  const events: CombatEventInput[] = [
    ...selectedActions.map((action): CombatEventInput => ({type: 'combat-action-used', actionId: action.id})),
    ...selectedWeaknessActions.map((action): CombatEventInput => ({
      type: 'combat-action-selected',
      actionId: action.id,
      selected: false,
    })),
    {
      type: 'combat-attack-resolved',
      hit,
      attack: {
        actorId: heroId,
        actorName,
        targetId: target.id,
        targetName: target.name,
        attackName: attack.name,
        natural,
        bonus: attack.bonus,
        total,
        targetAc,
        critical,
        damageExpression: attack.damage,
      },
      text: hit
        ? `${actorName}: ${selectedActionsLabel ? `${selectedActionsLabel} → ` : ''}${attack.name} против ${target.name}. ${natural} + ${attack.bonus} = ${total}; броня пробита${critical ? ', критическое попадание' : ''}. Нужен бросок урона.`
        : `${actorName}: ${selectedActionsLabel ? `${selectedActionsLabel} → ` : ''}${attack.name} против ${target.name}. ${natural} + ${attack.bonus} = ${total} против AC ${targetAc}; ${natural === 1 ? 'натуральная 1, автоматический промах' : 'промах'}.`,
    },
  ];
  if (!hit) events.push({type: 'turn-advanced'});
  return events;
}

export function createSelectCombatActionCommand(
  context: CombatCommandContext,
  actionId: string,
): CombatEventInput[] | null {
  const {combat, definition} = context;
  const activeHeroId = combat.initiativeOrder[combat.turnIndex];
  const action = definition.combatActions.find((item) => item.id === actionId);
  if (combat.pendingAttack || !action || action.characterId !== activeHeroId) return null;
  if (!action.encounterIds.includes(combat.encounterId)) return null;
  if (action.source === 'item' && combat.equippedItems[activeHeroId] !== action.id) return null;
  if ((combat.actionUses[action.id] ?? 0) >= action.uses.max) return null;

  const selected = combat.selectedActionIds.includes(action.id);
  const events: CombatEventInput[] = [];
  if (!selected) {
    definition.combatActions
      .filter((candidate) => (
        candidate.id !== action.id
        && candidate.characterId === activeHeroId
        && combat.selectedActionIds.includes(candidate.id)
        && combatActionsConflict(action, candidate)
      ))
      .forEach((candidate) => events.push({
        type: 'combat-action-selected',
        actionId: candidate.id,
        selected: false,
      }));
  }
  events.push({type: 'combat-action-selected', actionId: action.id, selected: !selected});
  return events;
}

export function createUseCombatActionCommand(
  context: CombatCommandContext,
  actionId: string,
  selectedTargetId?: string,
  providedRoll?: number,
): CombatEventInput[] | null {
  const {combat, definition, heroes, heroHp} = context;
  const activeHeroId = combat.initiativeOrder[combat.turnIndex];
  const action = definition.combatActions.find((item) => item.id === actionId);
  if (combat.pendingAttack || !action || action.characterId !== activeHeroId) return null;
  if (!action.encounterIds.includes(combat.encounterId)) return null;
  if (action.source === 'item' && combat.equippedItems[activeHeroId] !== action.id) return null;
  if (!combat.selectedActionIds.includes(action.id)) return null;
  if ((combat.actionUses[action.id] ?? 0) >= action.uses.max) return null;

  const healingEffect = action.effects.find((effect) => effect.type === 'healing');
  if (!healingEffect) return null;
  const actor = heroes.find((hero) => hero.id === activeHeroId);
  const selectedTarget = heroes.find((hero) => hero.id === selectedTargetId);
  const healingTarget = action.target === 'self' ? actor : selectedTarget;
  if (!actor || !healingTarget || (heroHp[healingTarget.id] ?? 0) >= healingTarget.maxHp) return null;

  const dice = getDamageRoll(healingEffect.dice);
  const amount = providedRoll === undefined
    ? rollDamage(healingEffect.dice)
    : dice ? resolveDamageTotal(dice, providedRoll) : null;
  if (amount === null) return null;

  return [
    {type: 'combat-action-used', actionId: action.id},
    {
      type: 'healing-applied',
      targetId: healingTarget.id,
      amount,
      maxHp: healingTarget.maxHp,
      text: `${actor.name}: «${action.name}» → ${healingTarget.name} восстанавливает ${amount} HP.`,
    },
    {type: 'combat-action-selected', actionId: action.id, selected: false},
    {type: 'turn-advanced'},
  ];
}

export function createEquipCombatItemCommand(
  context: CombatCommandContext,
  actionId: string | null,
): CombatEventInput[] | null {
  const {combat, definition} = context;
  const activeHeroId = combat.initiativeOrder[combat.turnIndex];
  if (combat.pendingAttack || !activeHeroId || combat.enemies[activeHeroId]) return null;
  const action = actionId ? definition.combatActions.find((item) => item.id === actionId) : undefined;
  if (actionId && (!action || action.source !== 'item' || action.characterId !== activeHeroId)) return null;
  if (action && !action.encounterIds.includes(combat.encounterId)) return null;

  const previouslyEquippedId = combat.equippedItems[activeHeroId];
  const events: CombatEventInput[] = [{type: 'combat-item-equipped', heroId: activeHeroId, actionId}];
  if (previouslyEquippedId && previouslyEquippedId !== actionId) {
    events.push({type: 'combat-action-selected', actionId: previouslyEquippedId, selected: false});
  }
  if (action) {
    definition.combatActions
      .filter((candidate) => (
        candidate.id !== action.id
        && candidate.characterId === activeHeroId
        && combat.selectedActionIds.includes(candidate.id)
        && combatActionsConflict(action, candidate)
      ))
      .forEach((candidate) => events.push({
        type: 'combat-action-selected',
        actionId: candidate.id,
        selected: false,
      }));
    events.push({type: 'combat-action-selected', actionId: action.id, selected: true});
  }
  return events;
}

export function createEnemyAttackCommand(
  context: CombatCommandContext,
  targetId: string,
  providedRoll?: number,
): CombatEventInput[] | null {
  const {combat, heroes, heroHp} = context;
  const target = heroes.find((hero) => hero.id === targetId);
  const activeEnemy = combat.enemies[combat.initiativeOrder[combat.turnIndex]];
  if (combat.pendingAttack || !target || !activeEnemy || activeEnemy.hp <= 0) return null;
  if ((heroHp[targetId] ?? 0) <= 0) return null;

  const natural = providedRoll ?? rollDie(20);
  const attackRoll = resolveAttackAgainstArmor(natural, activeEnemy.attack.bonus, target.ac);
  if (!attackRoll) return null;
  const {critical, hit, total} = attackRoll;
  const events: CombatEventInput[] = [{
    type: 'combat-attack-resolved',
    hit,
    attack: {
      actorId: activeEnemy.id,
      actorName: activeEnemy.name,
      targetId,
      targetName: target.name,
      attackName: activeEnemy.attack.name,
      natural,
      bonus: activeEnemy.attack.bonus,
      total,
      targetAc: target.ac,
      critical,
      damageExpression: activeEnemy.attack.damage,
    },
    text: hit
      ? `${activeEnemy.name}: ${activeEnemy.attack.name} → ${target.name}. ${natural} + ${activeEnemy.attack.bonus} = ${total}; броня пробита${critical ? ', критическое попадание' : ''}. Нужен бросок урона.`
      : `${activeEnemy.name}: ${activeEnemy.attack.name} → ${target.name}. ${natural} + ${activeEnemy.attack.bonus} = ${total} против AC ${target.ac}; ${natural === 1 ? 'натуральная 1, автоматический промах' : 'промах'}.`,
  }];
  if (!hit) events.push({type: 'turn-advanced'});
  return events;
}

export function createApplyCombatDamageCommand(
  context: CombatCommandContext,
  rawDiceTotal: number,
): {events: CombatEventInput[]; victory: boolean} | null {
  const {combat, definition} = context;
  const attack = combat.pendingAttack;
  if (!attack || combat.initiativeOrder[combat.turnIndex] !== attack.actorId) return null;
  const resolved = resolvePendingDamage(attack, rawDiceTotal);
  if (!resolved) return null;

  const modifierText = resolved.dice.modifier === 0
    ? ''
    : ` ${resolved.dice.modifier > 0 ? '+' : '−'} ${Math.abs(resolved.dice.modifier)}`;
  const events: CombatEventInput[] = [{
    type: 'combat-damage-resolved',
    targetId: attack.targetId,
    amount: resolved.amount,
    text: `${attack.actorName}: ${attack.attackName} → ${attack.targetName}; кубики ${rawDiceTotal}${modifierText} = ${resolved.amount} урона.`,
  }];

  const enemyTarget = combat.enemies[attack.targetId];
  const victory = Boolean(enemyTarget) && Object.values(combat.enemies).every((enemy) => (
    enemy.id === attack.targetId ? Math.max(0, enemy.hp - resolved.amount) : enemy.hp
  ) <= 0);
  if (victory) {
    const encounter = definition.encounters.find((item) => item.id === combat.encounterId);
    events.push({type: 'combat-ended', text: encounter?.victoryText ?? 'Противник побеждён.'});
  } else events.push({type: 'turn-advanced'});
  return {events, victory};
}

export function resolveCombatWeaknessManeuver(
  context: CombatCommandContext,
  heroId: string,
  stat: CombatStat,
  providedRoll?: number,
) {
  const {combat, definition, heroes} = context;
  const hero = heroes.find((item) => item.id === heroId);
  const encounter = definition.encounters.find((item) => item.id === combat.encounterId);
  if (combat.pendingAttack || !hero || combat.initiativeOrder[combat.turnIndex] !== heroId) return null;
  if (!encounter?.weakness.stats.includes(stat)) return null;
  const natural = providedRoll ?? rollDie(20);
  const modifier = hero.stats[stat] ?? 0;
  const total = natural + modifier;
  const success = natural === 20 || (natural !== 1 && total >= encounter.weakness.dc);
  const events: CombatEventInput[] = [];
  if (success && !combat.weaknessExposed) events.push({
    type: 'combat-weakness-exposed',
    text: `${hero.name} раскрывает слабость: AC противника снижается до ${encounter.weakness.reducedAc}.`,
  });
  events.push({type: 'turn-advanced'});
  return {natural, modifier, total, success, encounter, events};
}
