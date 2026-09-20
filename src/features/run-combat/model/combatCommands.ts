import {mitigateCombatDamage, createColdHitReactions} from '../../../entities/combat/model/combatDamage';
import {createEnemySkillEffects, resolveEnemySkillSave} from './enemySkillCommands.ts';
import {createGuestSkillEffects} from './guestSkillCommands.ts';
import {getGuaranteedCritical} from '../../../entities/combat/model/guestSkills.ts';
import {isCombatCreature, isCombatVictory} from '../../../entities/combat/model/combatObjectives.ts';
import {
  createCombatInitiative,
  isCombatAllyActive,
  getCombatAttackRange,
  getCombatAttackBonusModifier,
  getCombatAttackRollMode,
  getCombatHeroAc,
  getCombatEnemyTargetId,
  getCombatEnemyAc,
  getCombatStatModifier,
  resolveAttackAgainstArmor,
  resolvePendingDamage,
  rollDie,
} from '../../../entities/combat/model/combatRules.ts';
import {formatCombatantIndex} from '../../../entities/combat/model/combatantIndex.ts';
import {getCombatStatusPresentation, getFirstCombatStatus} from '../../../entities/combat/model/combatStatus.ts';
import type {
  CombatActionActivation,
  CombatActionDefinition,
  CombatAllyState,
  CombatConditionId,
  CombatDefinition,
  CombatEncounterDefinition,
  CombatEventInput,
  CombatHeroSource,
  CombatInventoryItemState,
  CombatState,
  CombatStat,
  CombatStatusState,
} from '../../../entities/combat/model/types';
import {
  formatDamageCalculation,
  formatDicePoolExpression,
  formatDiceExpression,
  getDamageRoll,
  parseDiceExpression,
  resolveDamageTotal,
} from '../../../shared/lib/dice/diceExpression.ts';

export interface CombatCommandContext {
  combat: CombatState;
  definition: CombatDefinition;
  heroes: CombatHeroSource[];
  heroHp: Record<string, number>;
  inventoryState: Record<string, CombatInventoryItemState>;
  resourceUses: Record<string, number>;
  participantConditions: Record<string, string[]>;
}

export interface CombatSavingThrowReactionResolution {
  modifier: number;
  total: number;
  success: boolean;
  events: CombatEventInput[];
}

function isParticipantAbleToAct(context: CombatCommandContext, participantId: string) {
  if ((context.combat.conditions[participantId] ?? []).includes('stunned')) return false;
  const enemy = context.combat.enemies[participantId];
  if (enemy) return isCombatCreature(enemy) && enemy.hp > 0;
  const ally = context.combat.allies[participantId];
  if (ally) return isCombatAllyActive(context.combat, ally.id);
  return (context.heroHp[participantId] ?? 0) > 0
    && !(context.participantConditions[participantId] ?? []).includes('downed');
}

function getCombatConditionLabel(condition: CombatConditionId) {
  switch (condition) {
    case 'blinded': return 'ослепление';
    case 'attack-disadvantage': return 'помеха на следующую атаку';
    case 'prone': return 'падение';
    case 'stunned': return 'пропуск следующего действия';
  }
}

function getCombatStatLabel(stat: CombatStat) {
  switch (stat) {
    case 'strength': return 'Сила';
    case 'dexterity': return 'Ловкость';
    case 'constitution': return 'Телосложение';
    case 'wisdom': return 'Мудрость';
    case 'intelligence': return 'Интеллект';
    case 'charisma': return 'Харизма';
  }
}

function withDamageBonus(expression: string, amount: number) {
  const parsed = parseDiceExpression(expression);
  return parsed ? formatDiceExpression({...parsed, modifier: parsed.modifier + amount}) : expression;
}

function getRemovableConditions(combat: CombatState, participantId: string) {
  return (combat.conditions[participantId] ?? []).filter((condition) => (
    condition === 'blinded'
    || condition === 'attack-disadvantage'
    || condition === 'prone'
    || condition === 'stunned'
  ));
}

function createCleanseEvents(combat: CombatState, participantId: string, max = Number.POSITIVE_INFINITY): CombatEventInput[] {
  const conditions = getRemovableConditions(combat, participantId).slice(0, max);
  const statuses = combat.statuses.filter((status) => status.targetId === participantId
    && getCombatStatusPresentation(status).tone === 'negative').slice(0, max - conditions.length);
  return [
    ...conditions.map((condition): CombatEventInput => ({type: 'combat-condition-changed', participantId, condition, active: false})),
    ...statuses.map((status): CombatEventInput => ({type: 'combat-status-removed', statusId: status.id,
      text: `Снят эффект: ${getCombatStatusPresentation(status).shortLabel}.`})),
  ];
}

function participantNamesForCommand(context: CombatCommandContext) {
  return new Map<string, string>([
    ...context.heroes.map((hero) => [hero.id, hero.name] as const),
    ...Object.values(context.combat.allies).map((ally) => [ally.id, ally.name] as const),
    ...Object.values(context.combat.enemies).map((enemy) => [enemy.id, enemy.name] as const),
  ]);
}

function consumeStatusEvent(status: CombatStatusState, text?: string): CombatEventInput {
  if (status.charges <= 1) return {type: 'combat-status-removed', statusId: status.id, text};
  return {
    type: 'combat-status-applied',
    status: {...status, charges: status.charges - 1},
    text,
  };
}

export function resolveAlliedCombatSavingThrowReactions(
  context: CombatCommandContext,
  targetId: string,
  natural: number,
  baseModifier: number,
  dc: number,
  useHelpingReaction = false,
): CombatSavingThrowReactionResolution | null {
  if (!Number.isInteger(natural) || natural < 1 || natural > 20) return null;
  const targetName = participantNamesForCommand(context).get(targetId) ?? targetId;
  let modifier = baseModifier;
  let total = natural + modifier;
  let success = natural === 20 || (natural !== 1 && total >= dc);
  const events: CombatEventInput[] = [];
  const techRecalculation = (context.combat.statuses ?? []).find((status) => (
    status.kind === 'tech-recalculation'
    && status.targetId !== targetId
    && status.charges > 0
    && isParticipantAbleToAct(context, status.targetId)
  ));
  if (!success && techRecalculation) {
    modifier += 4;
    total += 4;
    success = natural === 20 || (natural !== 1 && total >= dc);
    events.push(consumeStatusEvent(
      techRecalculation,
      `Гений-технарь Ламберта пересчитывает провал ${targetName}: +4 к текущему спасброску${success ? ', теперь это успех' : ''}.`,
    ));
  }
  const helpingReaction = (context.combat.statuses ?? []).find((status) => (
    status.kind === 'helping-reaction'
    && status.targetId !== targetId
    && status.charges > 0
    && isParticipantAbleToAct(context, status.targetId)
  ));
  const canHelp = !success && natural !== 1 && helpingReaction && total + 2 >= dc;
  if (useHelpingReaction && !canHelp) return null;
  if (useHelpingReaction && canHelp) {
    modifier += 2;
    total += 2;
    success = true;
    events.push(consumeStatusEvent(
      helpingReaction,
      `Палочка-выручалочка Торина добавляет ${targetName} +2 к текущему спасброску и превращает провал в успех.`,
    ));
  }
  return {modifier, total, success, events};
}

function createStatusState(
  action: CombatActionDefinition,
  sourceActorId: string,
  targetId: string,
  status: Extract<CombatActionDefinition['effects'][number], {type: 'apply-status'}>,
): CombatStatusState {
  return {
    id: `${action.id}-${targetId}-${status.status}`,
    kind: status.status,
    sourceActorId,
    targetId,
    charges: status.charges ?? 1,
    amount: status.amount,
    expiresAtTurnStartOf: status.duration === 'until-source-next-turn' ? sourceActorId : undefined,
  };
}

export function getCombatActionActivation(action: CombatActionDefinition): CombatActionActivation {
  if (action.activation) return action.activation;
  if (action.effects.some((effect) => effect.type === 'passive')) return 'passive';
  if (action.effects.some((effect) => (
    effect.type === 'expose-weakness' || effect.type === 'replace-attack'
  ))) return 'attack';
  return 'action';
}

export function getCombatActionResourceKey(action: CombatActionDefinition) {
  return `${action.characterId}-${action.source}-${action.sourceId}`;
}

export function isCombatActionSourceAvailable(
  action: CombatActionDefinition,
  context: Pick<CombatCommandContext, 'inventoryState' | 'resourceUses'>,
) {
  const resourceKey = getCombatActionResourceKey(action);
  if ((context.resourceUses[resourceKey] ?? 0) >= action.uses.max) return false;
  if (action.source === 'ability') return true;
  const item = context.inventoryState[action.sourceId];
  return Boolean(
    item
    && item.ownerId === action.characterId
    && item.quantity > 0
    && (item.maxCharges === null || item.charges > 0),
  );
}

export function createCombatActionUsageEvent(action: CombatActionDefinition): CombatEventInput {
  return {
    type: 'combat-action-used',
    actionId: action.id,
    sourceId: action.sourceId,
    resourceKey: getCombatActionResourceKey(action),
    scope: action.uses.scope,
    max: action.uses.max,
  };
}
export function combatActionsConflict(
  first: CombatActionDefinition,
  second: CombatActionDefinition,
) {
  return getCombatActionActivation(first) !== 'passive'
    && getCombatActionActivation(second) !== 'passive';
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

export function createClearCombatCommand(combat: CombatState): CombatEventInput | null {
  // A GM correction can defeat the last enemy during an unfinished roll.
  // Victory is terminal: the obsolete roll must not trap the victory dialog.
  if (!isCombatVictory(combat)) return null;

  return {type: 'combat-cleared', encounterId: combat.encounterId};
}

export function createHeroAttackCommand(
  context: CombatCommandContext,
  heroId: string,
  targetEnemyId: string,
  providedRoll?: number,
  situationalBonus = 0,
  rerolledFrom?: number,
): CombatEventInput[] | null {
  const {combat, definition, heroes} = context;
  const encounter = definition.encounters.find((item) => item.id === combat.encounterId);
  const baseAttack = encounter?.heroAttacks.find((item) => item.characterId === heroId);
  const target = combat.enemies[targetEnemyId];
  if (
    !encounter
    || combat.pendingAttack
    || combat.pendingSavingThrow
    || !baseAttack
    || !target
    || target.hp <= 0
  ) return null;
  if (combat.initiativeOrder[combat.turnIndex] !== heroId) return null;
  if (!isParticipantAbleToAct(context, heroId)) return null;

  const selectedAttackActions = definition.combatActions.filter((action) => (
    combat.selectedActionIds.includes(action.id)
    && action.characterId === heroId
    && (action.source === 'ability' || combat.equippedItems[heroId] === action.id)
    && getCombatActionActivation(action) === 'attack'
    && action.encounterIds.includes(combat.encounterId)
    && isCombatActionSourceAvailable(action, context)
  )).slice(0, 1);
  const selectedAction = selectedAttackActions[0];
  const replacement = selectedAction?.effects.find((effect) => effect.type === 'replace-attack');
  const exposesWeakness = selectedAction?.effects.some((effect) => effect.type === 'expose-weakness') ?? false;
  const secondaryTarget = replacement?.splitAgainstMultiple
    ? Object.values(combat.enemies).find((enemy) => enemy.id !== targetEnemyId && enemy.hp > 0)
    : undefined;
  const splitAttack = Boolean(replacement?.splitAgainstMultiple && secondaryTarget);
  const attack = replacement
    ? {
        ...replacement.attack,
        ...(splitAttack ? {
          damage: replacement.splitAgainstMultiple!.secondaryDamage,
          armorPiercing: undefined,
        } : {}),
        characterId: heroId,
      }
    : baseAttack;
  const attackRange = getCombatAttackRange(attack);
  const currentTargetAc = getCombatEnemyAc(combat, target.id);
  const weaknessAc = exposesWeakness ? Math.min(target.ac, encounter.weakness.reducedAc) + (currentTargetAc - target.ac) : currentTargetAc;
  const criticalOpening = getFirstCombatStatus(combat, targetEnemyId, 'critical-opening');
  const targetAcBeforeOpening = attack.armorPiercing && target.ac >= attack.armorPiercing.minimumAc
    ? Math.max(0, weaknessAc - attack.armorPiercing.reduction)
    : weaknessAc;
  const targetAc = criticalOpening ? 0 : targetAcBeforeOpening;
  const guaranteedCritical = getGuaranteedCritical(combat, heroId, targetEnemyId);
  const natural = guaranteedCritical ? 20 : providedRoll ?? rollDie(20);
  const stanceModifier = getCombatAttackBonusModifier(combat, heroId, targetEnemyId);
  const effectiveBonus = attack.bonus + situationalBonus + stanceModifier;
  const primaryRoll = resolveAttackAgainstArmor(natural, effectiveBonus, targetAc);
  if (!primaryRoll) return null;
  const secondaryRoll = secondaryTarget ? resolveAttackAgainstArmor(natural, effectiveBonus, getCombatEnemyAc(combat, secondaryTarget.id)) : null;
  const resolvedTarget = !primaryRoll.hit && secondaryRoll?.hit ? secondaryTarget! : target;
  const attackRoll = resolvedTarget === target ? primaryRoll : secondaryRoll!;
  const secondaryHit = primaryRoll.hit && secondaryRoll?.hit ? secondaryTarget : undefined;

  const targetMarker = (combat.statuses ?? []).find((status) => (
    status.targetId === resolvedTarget.id
    && (status.kind === 'studied-target' || status.kind === 'resonance')
    && !(status.consumedByIds ?? []).includes(heroId)
  ));
  const bonusDamageStatuses = (combat.statuses ?? []).filter((status) => (
    status.targetId === heroId && status.kind === 'bonus-damage'
  ));
  const diveReady = getFirstCombatStatus(combat, heroId, 'dive-ready');
  const heatCharge = getFirstCombatStatus(combat, heroId, 'heat-charge');
  const criticalFocus = getFirstCombatStatus(combat, heroId, 'critical-focus');
  const attackAdvantageStatuses = (combat.statuses ?? []).filter((status) => (
    status.targetId === heroId
    && (
      status.kind === 'attack-advantage'
      || status.kind === 'guided-turn'
      || status.kind === 'commanded-strike'
    )
  ));
  const inspiredStatus = getFirstCombatStatus(combat, heroId, 'inspired');
  if (
    rerolledFrom !== undefined
    && (!inspiredStatus || !Number.isInteger(rerolledFrom) || rerolledFrom < 1 || rerolledFrom > 20)
  ) return null;
  const bonusDamageDice = [
    ...(targetMarker ? [{
      expression: '1d4',
      label: targetMarker.kind === 'resonance' ? 'Магический резонанс' : 'Изученная цель',
    }] : []),
    ...bonusDamageStatuses
      .filter((status) => status.amount === undefined)
      .map(() => ({expression: '1d4', label: 'Дополнительный урон'})),
    ...(diveReady ? [{expression: '1d6', label: 'Пикирование'}] : []),
  ];
  const creativeFlatBonus = bonusDamageStatuses.reduce((sum, status) => (
    sum + (status.amount ?? 0)
  ), 0);
  const heatBonus = attack.damageType === 'fire' ? heatCharge?.amount ?? 0 : 0;
  const flatBonusDamage = creativeFlatBonus + heatBonus;

  const actorName = heroes.find((hero) => hero.id === heroId)?.name ?? 'Герой';
  const {hit, total} = attackRoll;
  const critical = hit && (
    attackRoll.critical
    || Boolean(criticalOpening && resolvedTarget === target)
    || Boolean(criticalFocus && natural >= 19)
  );
  const selectedActionsLabel = selectedAttackActions.map((action) => `«${action.name}»`).join(' + ');
  const rollMode = getCombatAttackRollMode(combat, heroId, targetEnemyId, attackRange);
  const consumedConditions = (combat.conditions[heroId] ?? []).filter((condition) => (
    condition === 'blinded' || condition === 'attack-disadvantage'
  ));
  const rollModeLabel = rollMode === 'disadvantage' ? ' с помехой' : rollMode === 'advantage' ? ' с преимуществом' : '';
  const events: CombatEventInput[] = [
    ...(guaranteedCritical ? [consumeStatusEvent(guaranteedCritical, `${actorName}: «Сюда, блин!» — гарантированное критическое попадание без броска d20.`)] : []),
    ...selectedAttackActions.map(createCombatActionUsageEvent),
    ...selectedAttackActions.map((action): CombatEventInput => ({
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
        targetId: resolvedTarget.id,
        targetName: resolvedTarget.name,
        attackName: attack.name,
        ...(guaranteedCritical ? {automatic: true} : {}),
        natural,
        bonus: effectiveBonus,
        total,
        targetAc: attackRoll.targetAc,
        critical,
        damageExpression: withDamageBonus(attack.damage, flatBonusDamage),
        range: attackRange,
        rerolledFrom,
        bonusDamageDice: bonusDamageDice.length ? bonusDamageDice : undefined,
        damageType: attack.damageType,
        rollMode,
        onHitSavingThrow: attack.onHitSavingThrow,
        secondaryTargetId: secondaryHit?.id,
        secondaryTargetName: secondaryHit?.name,
      },
      text: hit
        ? `${actorName}: ${selectedActionsLabel ? `${selectedActionsLabel} → ` : ''}${attack.name}${rollModeLabel} против ${resolvedTarget.name}${secondaryHit ? ` и ${secondaryHit.name}` : ''}. ${rerolledFrom === undefined ? '' : `переброс ${rerolledFrom} → ${natural}; `}${natural} + ${effectiveBonus} = ${total}; ${criticalOpening ? 'броня проигнорирована' : 'броня пробита'}${critical ? ', критическое попадание' : ''}${bonusDamageDice.length ? `; дополнительные кубики: ${bonusDamageDice.map((bonus) => `${bonus.expression} «${bonus.label}»`).join(', ')}` : ''}${flatBonusDamage ? `; дополнительный урон +${flatBonusDamage}` : ''}. Нужен бросок урона.`
        : `${actorName}: ${selectedActionsLabel ? `${selectedActionsLabel} → ` : ''}${attack.name}${rollModeLabel} против ${target.name}. ${rerolledFrom === undefined ? '' : `переброс ${rerolledFrom} → ${natural}; `}${natural} + ${effectiveBonus} = ${total} против AC ${targetAc}; ${natural === 1 ? 'натуральная 1, автоматический промах' : 'промах'}.`,
    },
    ...consumedConditions.map((condition): CombatEventInput => ({
      type: 'combat-condition-changed',
      participantId: heroId,
      condition,
      active: false,
    })),
    ...attackAdvantageStatuses.map((status) => consumeStatusEvent(status)),
    ...(inspiredStatus && rerolledFrom !== undefined ? [consumeStatusEvent(
      inspiredStatus,
      `${actorName} использует «Историю моего имени» и перебрасывает d20: ${rerolledFrom} → ${natural}.`,
    )] : []),
    ...(hit ? bonusDamageStatuses.map((status) => consumeStatusEvent(status)) : []),
    ...(criticalFocus ? [consumeStatusEvent(criticalFocus)] : []),
    ...(hit && heatCharge && attack.damageType === 'fire' ? [consumeStatusEvent(heatCharge)] : []),
    ...(diveReady ? [
      consumeStatusEvent(diveReady),
      {
        type: 'combat-stance-changed' as const,
        participantId: heroId,
        stance: 'airborne' as const,
        active: false,
        text: `${actorName} завершает пикирование и возвращается на землю.`,
      },
    ] : []),
  ];
  if (hit && targetMarker) {
    const consumedByIds = [...new Set([...(targetMarker.consumedByIds ?? []), heroId])];
    events.push(targetMarker.charges <= 1
      ? {
          type: 'combat-status-removed',
          statusId: targetMarker.id,
          text: `${actorName} расходует последний заряд эффекта «${targetMarker.kind === 'resonance' ? 'Резонанс' : 'Изученная цель'}»: герой добавляет 1d4 к броску урона.`,
        }
      : {
          type: 'combat-status-applied',
          status: {...targetMarker, charges: targetMarker.charges - 1, consumedByIds},
          text: `${actorName} использует эффект «${targetMarker.kind === 'resonance' ? 'Резонанс' : 'Изученная цель'}»: герой добавляет 1d4 к броску урона.`,
        });
  }
  if (hit && criticalOpening && resolvedTarget === target) events.push(consumeStatusEvent(
    criticalOpening,
    `${actorName} использует открытую брешь: броня проигнорирована, попадание становится критическим.`,
  ));
  if (hit && combat.weaknessExposed) events.push({
    type: 'combat-weakness-cleared',
    text: `${actorName} использует раскрытую слабость; защита противников возвращается к исходной.`,
  });
  if (secondaryTarget) events.push({type: 'combat-log-added', text: `Две стрелы, один результат ${natural} + ${effectiveBonus}: ${target.name} — ${primaryRoll.hit ? 'попадание' : 'промах'} (AC ${primaryRoll.targetAc}); ${secondaryTarget.name} — ${secondaryRoll?.hit ? 'попадание' : 'промах'} (AC ${secondaryRoll?.targetAc}).`});
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
  if (
    combat.pendingAttack
    || combat.pendingSavingThrow
    || !action
    || action.characterId !== activeHeroId
  ) return null;
  if (!isParticipantAbleToAct(context, activeHeroId)) return null;
  if (!action.encounterIds.includes(combat.encounterId)) return null;
  if (action.source === 'item' && combat.equippedItems[activeHeroId] !== action.id) return null;
  if (!isCombatActionSourceAvailable(action, context)) return null;

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
  const activation = action ? getCombatActionActivation(action) : 'passive';
  if (
    combat.pendingAttack
    || combat.pendingSavingThrow
    || !action
    || action.characterId !== activeHeroId
    || activation === 'passive'
    || activation === 'attack'
  ) return null;
  if (!isParticipantAbleToAct(context, activeHeroId)) return null;
  if (!action.encounterIds.includes(combat.encounterId)) return null;
  if (action.source === 'item' && combat.equippedItems[activeHeroId] !== action.id) return null;
  if (!combat.selectedActionIds.includes(action.id)) return null;
  if (!isCombatActionSourceAvailable(action, context)) return null;

  if (combat.enemies[activeHeroId]) return createEnemySkillEffects(context, action, selectedTargetId, providedRoll);
  const actor = heroes.find((hero) => hero.id === activeHeroId) ?? combat.allies[activeHeroId];
  if (!actor) return null;
  const events: CombatEventInput[] = [createCombatActionUsageEvent(action)];
  if (action.effects.some((effect) => effect.type === 'guest-skill')) {
    const effects = createGuestSkillEffects(context, action, selectedTargetId, providedRoll);
    return effects ? [...events, ...effects, {type: 'combat-action-selected', actionId, selected: false}, {type: 'turn-advanced'}] : null;
  }
  const actionCheck = action.check;
  if (actionCheck) {
    const checkDice = getDamageRoll(actionCheck.dice);
    const checkRange = checkDice ? resolveDamageTotal(checkDice, providedRoll ?? 0) : null;
    if (providedRoll === undefined || !checkDice || checkRange === null) return null;
    const success = checkRange >= actionCheck.successMin
      && checkRange <= (actionCheck.successMax ?? Number.POSITIVE_INFINITY);
    events.push({
      type: 'combat-log-added',
      text: `${actor.name}: «${action.name}» — ${actionCheck.dice} = ${checkRange}; ${success ? 'эффект срабатывает' : 'эффект не срабатывает'}.`,
    });
    if (!success) {
      events.push({type: 'combat-action-selected', actionId: action.id, selected: false});
      if (activation === 'action') events.push({type: 'turn-advanced'});
      return events;
    }
  }

  const activeSummons = Object.values(combat.allies).filter((ally) => (
    isCombatAllyActive(combat, ally.id)
  ));
  const livingHeroIds = heroes.filter((hero) => (heroHp[hero.id] ?? 0) > 0).map((hero) => hero.id);
  const livingAllyIds = [...livingHeroIds, ...activeSummons.map((ally) => ally.id)];
  const selectedLivingHero = heroes.find((hero) => (
    hero.id === selectedTargetId
    && hero.id !== activeHeroId
    && (heroHp[hero.id] ?? 0) > 0
  ));
  const selectedLivingSummon = activeSummons.find((ally) => ally.id === selectedTargetId);
  const selectedLivingAllyId = selectedLivingHero?.id ?? selectedLivingSummon?.id;
  const healingEffect = action.effects.find((effect) => effect.type === 'healing');
  if (healingEffect) {
    const selectedHero = heroes.find((hero) => (
      hero.id === selectedTargetId && (action.target !== 'ally' || hero.id !== activeHeroId)
    ));
    const selectedAlly = selectedTargetId ? combat.allies[selectedTargetId] : undefined;
    const healingTarget = action.target === 'self' ? actor : selectedHero ?? selectedAlly;
    if (!healingTarget) return null;
    const currentHp = selectedAlly?.hp ?? heroHp[healingTarget.id] ?? 0;
    const hasAnotherMechanicalEffect = action.effects.some((effect) => (
      effect.type !== 'healing' && effect.type !== 'passive'
    ));
    if (currentHp >= healingTarget.maxHp && !hasAnotherMechanicalEffect) return null;
    if (currentHp < healingTarget.maxHp) {
      const dice = healingEffect.dice ? getDamageRoll(healingEffect.dice) : null;
      const amount = healingEffect.amount ?? (healingEffect.dice
        ? providedRoll === undefined
          ? null
          : dice ? resolveDamageTotal(dice, providedRoll) : null
        : null);
      if (amount === null || amount === undefined) return null;
      events.push({
        type: 'healing-applied',
        targetId: healingTarget.id,
        amount,
        maxHp: healingTarget.maxHp,
        text: `${actor.name}: «${action.name}» → ${healingTarget.name} восстанавливает ${amount} HP.`,
      });
    }
  }

  const stanceEffect = action.effects.find((effect) => effect.type === 'toggle-stance');
  if (stanceEffect) {
    const active = !(combat.stances[activeHeroId] ?? []).includes(stanceEffect.stance);
    const stanceLabel = stanceEffect.stance === 'airborne' ? 'полёт' : 'малый облик';
    events.push({
      type: 'combat-stance-changed',
      participantId: activeHeroId,
      stance: stanceEffect.stance,
      active,
      text: `${actor.name}: «${action.name}» — ${stanceLabel} ${active ? 'активирован' : 'завершён'}.`,
    });
    if (stanceEffect.stance === 'airborne') {
      const diveStatus = getFirstCombatStatus(combat, activeHeroId, 'dive-ready');
      if (active) events.push({
        type: 'combat-status-applied',
        status: {
          id: `${action.id}-${activeHeroId}-dive`,
          kind: 'dive-ready',
          sourceActorId: activeHeroId,
          targetId: activeHeroId,
          charges: 1,
        },
        text: `${actor.name} готовит пикирование: следующая атака получит +1d6 урона.`,
      });
      else if (diveStatus) events.push({type: 'combat-status-removed', statusId: diveStatus.id});
    }
    if (stanceEffect.stance === 'tiny' && !active) events.push({
      type: 'combat-status-applied',
      status: {
        id: `${action.id}-${activeHeroId}-return`,
        kind: 'attack-advantage',
        sourceActorId: activeHeroId,
        targetId: activeHeroId,
        charges: 1,
      },
      text: `${actor.name} возвращает обычный рост: следующая атака получает преимущество.`,
    });
  }

  const summonEffect = action.effects.find((effect) => effect.type === 'summon-allies');
  if (summonEffect) {
    const countDice = getDamageRoll(summonEffect.countDice);
    const count = providedRoll === undefined
      ? null
      : countDice ? resolveDamageTotal(countDice, providedRoll) : null;
    if (count === null || count < 1 || count > 8) return null;
    const allies: CombatAllyState[] = Array.from({length: count}, (_, index) => ({
      id: `${summonEffect.unit.idPrefix}-${combat.round}-${index + 1}`,
      ownerId: activeHeroId,
      name: `${summonEffect.unit.name} ${formatCombatantIndex(index + 1)}`,
      hp: summonEffect.unit.hp,
      maxHp: summonEffect.unit.hp,
      ac: summonEffect.unit.ac,
      initiative: summonEffect.unit.initiative,
      attack: summonEffect.unit.attack,
      expiresAfterRound: combat.round + summonEffect.durationRounds - 1,
      token: summonEffect.unit.token,
    }));
    if (allies.some((ally) => combat.allies[ally.id])) return null;
    events.push({
      type: 'combat-allies-summoned',
      allies,
      text: `${actor.name}: «${action.name}» — призвано существ: ${count}; они остаются на ${summonEffect.durationRounds} раунда.`,
    });
  }

  const acEffect = action.effects.find((effect) => effect.type === 'modify-ac');
  if (acEffect) {
    const targetIds = action.target === 'self'
      ? [activeHeroId]
      : action.target === 'ally'
        ? selectedLivingAllyId ? [selectedLivingAllyId] : []
        : livingAllyIds;
    if (!targetIds.length) return null;
    events.push({
      type: 'combat-ac-modifier-applied',
      modifier: {
        id: `${action.id}-${combat.round}`,
        sourceActorId: activeHeroId,
        targetIds,
        amount: acEffect.amount,
        expiresAtTurnStartOf: activeHeroId,
      },
      text: `${actor.name}: «${action.name}» — ${action.target === 'self' ? 'получает' : action.target === 'ally' ? 'выбранный союзник получает' : 'союзники получают'} +${acEffect.amount} AC до начала следующего хода ${actor.name}.`,
    });
  }

  const attackEffect = action.effects.find((effect) => effect.type === 'modify-attack');
  if (attackEffect) {
    const targetIds = attackEffect.recipients === 'self'
      ? [activeHeroId]
      : attackEffect.recipients === 'selected-ally'
        ? selectedLivingAllyId ? [selectedLivingAllyId] : []
        : livingAllyIds;
    const selectedEnemy = action.target === 'enemy' && selectedTargetId
      ? combat.enemies[selectedTargetId]
      : undefined;
    if (!targetIds.length || (action.target === 'enemy' && (!selectedEnemy || selectedEnemy.hp <= 0))) return null;
    events.push({
      type: 'combat-attack-modifier-applied',
      modifier: {
        id: `${action.id}-${combat.round}`,
        sourceActorId: activeHeroId,
        targetIds,
        againstTargetIds: selectedEnemy ? [selectedEnemy.id] : undefined,
        amount: attackEffect.amount,
        consumeOnAttack: attackEffect.duration === 'next-attack',
        expiresAtTurnStartOf: attackEffect.duration === 'until-source-next-turn'
          ? activeHeroId
          : undefined,
      },
      text: `${actor.name}: «${action.name}» — ${attackEffect.recipients === 'self' ? 'получает' : attackEffect.recipients === 'selected-ally' ? 'выбранный союзник получает' : 'команда получает'} +${attackEffect.amount} к атаке${selectedEnemy ? ` против ${selectedEnemy.name}` : ''}.`,
    });
  }

  const removeConditionsEffect = action.effects.find((effect) => effect.type === 'remove-negative-conditions');
  if (removeConditionsEffect) {
    const conditionTargetId = removeConditionsEffect.recipient === 'selected-ally'
      ? selectedLivingAllyId
      : activeHeroId;
    if (!conditionTargetId) return null;
    const cleanse = createCleanseEvents(combat, conditionTargetId, removeConditionsEffect.max);
    events.push(...cleanse);
    const conditionTargetName = participantNamesForCommand(context).get(conditionTargetId) ?? actor.name;
    events.push({
      type: 'combat-log-added',
      text: cleanse.length
        ? `${conditionTargetName}: негативные боевые эффекты сняты.`
        : `${conditionTargetName}: негативных боевых эффектов не было.`,
    });
  }

  const statEffect = action.effects.find((effect) => effect.type === 'modify-stat');
  if (statEffect) events.push({
    type: 'combat-stat-modifier-applied',
    modifier: {
      id: `${action.id}-${statEffect.stat}`,
      sourceActorId: activeHeroId,
      targetId: activeHeroId,
      stat: statEffect.stat,
      amount: statEffect.amount,
    },
    text: `${actor.name}: «${action.name}» — ${getCombatStatLabel(statEffect.stat)} ${statEffect.amount >= 0 ? '+' : '−'}${Math.abs(statEffect.amount)} до конца боя.`,
  });

  const areaSavingThrow = action.effects.find((effect) => effect.type === 'area-saving-throw');
  if (areaSavingThrow) {
    if (providedRoll === undefined || !Number.isInteger(providedRoll) || providedRoll < 1 || providedRoll > 20) return null;
    const success = providedRoll === 20 || (providedRoll !== 1 && providedRoll >= areaSavingThrow.dc);
    const livingEnemies = Object.values(combat.enemies).filter((enemy) => isCombatCreature(enemy) && enemy.hp > 0);
    const affectedEnemies = action.target === 'enemy'
      ? livingEnemies.filter((enemy) => enemy.id === selectedTargetId)
      : livingEnemies;
    if (!affectedEnemies.length) return null;
    const failedEffectLabel = areaSavingThrow.failureConditions
      .map((condition) => getCombatConditionLabel(condition))
      .join(' и ') || (areaSavingThrow.failureStatus
      ? getCombatStatusPresentation({
          id: 'preview',
          kind: areaSavingThrow.failureStatus,
          sourceActorId: activeHeroId,
          targetId: activeHeroId,
          charges: 1,
        }).shortLabel.toLocaleLowerCase('ru-RU')
      : 'эффект не наложен');
    const successEffectLabel = (areaSavingThrow.successConditions ?? [])
      .map((condition) => getCombatConditionLabel(condition))
      .join(' и ') || (areaSavingThrow.successStatus
      ? getCombatStatusPresentation({
          id: 'preview',
          kind: areaSavingThrow.successStatus,
          sourceActorId: activeHeroId,
          targetId: activeHeroId,
          charges: 1,
        }).shortLabel.toLocaleLowerCase('ru-RU')
      : '');
    events.push({
      type: 'combat-log-added',
      text: `${actor.name}: «${action.name}». ${action.target === 'enemy' ? 'Спасбросок цели' : 'Общий спасбросок противников'} ${getCombatStatLabel(areaSavingThrow.stat)}: ${providedRoll}; ${success ? `${areaSavingThrow.dc} и выше${successEffectLabel ? ` — ${successEffectLabel}` : ' — эффект не наложен'}` : `ниже ${areaSavingThrow.dc} — ${failedEffectLabel}`}.`,
    });
    const appliedConditions = success
      ? areaSavingThrow.successConditions ?? []
      : areaSavingThrow.failureConditions;
    affectedEnemies.forEach((enemy) => appliedConditions.forEach((condition) => {
      events.push({
        type: 'combat-condition-changed',
        participantId: enemy.id,
        condition,
        active: true,
      });
    }));
    const appliedStatus = success ? areaSavingThrow.successStatus : areaSavingThrow.failureStatus;
    if (appliedStatus) affectedEnemies.forEach((enemy) => events.push({
      type: 'combat-status-applied',
      status: {
        id: `${action.id}-${enemy.id}-${appliedStatus}`,
        kind: appliedStatus,
        sourceActorId: activeHeroId,
        targetId: enemy.id,
        charges: 1,
      },
      text: `${enemy.name}: наложен эффект «${action.name}».`,
    }));
    if (action.sourceId === 'emergency-landing') events.push({
      type: 'combat-condition-changed',
      participantId: activeHeroId,
      condition: 'prone',
      active: true,
      bypassImmunity: true,
      text: `${actor.name} остаётся лежать после аварийной посадки до начала своего следующего хода.`,
    });
  }

  const statusEffects = action.effects.filter((effect) => effect.type === 'apply-status');
  let appliedStatusCount = 0;
  statusEffects.forEach((statusEffect) => {
    const targetIds = statusEffect.recipients === 'self'
      ? [activeHeroId]
      : statusEffect.recipients === 'selected-ally'
        ? selectedLivingAllyId ? [selectedLivingAllyId] : []
        : statusEffect.recipients === 'all-allies'
          ? livingAllyIds
          : statusEffect.recipients === 'selected-enemy'
            ? selectedTargetId && (combat.enemies[selectedTargetId]?.hp ?? 0) > 0 ? [selectedTargetId] : []
            : Object.values(combat.enemies).filter((enemy) => isCombatCreature(enemy) && enemy.hp > 0).map((enemy) => enemy.id);
    targetIds.forEach((targetId) => {
      appliedStatusCount += 1;
      events.push({
        type: 'combat-status-applied',
        status: createStatusState(action, activeHeroId, targetId, statusEffect),
        text: `${actor.name}: «${action.name}» — эффект закреплён на ${participantNamesForCommand(context).get(targetId) ?? targetId}.`,
      });
    });
  });
  if (statusEffects.length > 0 && appliedStatusCount === 0) return null;

  const rollTable = action.effects.find((effect) => effect.type === 'roll-table');
  if (rollTable) {
    const dice = getDamageRoll(rollTable.dice);
    const result = dice && providedRoll !== undefined ? resolveDamageTotal(dice, providedRoll) : null;
    if (result === null) return null;
    const outcome = rollTable.outcomes.find((candidate) => result >= candidate.min && result <= candidate.max);
    if (!outcome) return null;
    events.push({
      type: 'combat-log-added',
      text: `${actor.name}: «${action.name}» — ${rollTable.dice} = ${result}. ${outcome.label}`,
    });
    outcome.effects.forEach((effect) => {
      if (effect.type === 'healing') {
        const amount = effect.amount ?? 0;
        if (effect.dice) events.push({type: 'combat-saving-throw-requested', savingThrow: {
          kind: 'action-healing', actionName: action.name,
          sourceActorId: activeHeroId, sourceName: actor.name, targetId: activeHeroId, targetName: actor.name,
          stat: 'constitution', modifier: 0, dc: 0, failureConditions: [], duration: 'next-turn',
          rollExpression: effect.dice, healing: {maxHp: actor.maxHp, endTurn: activation === 'action'},
        }});
        if (amount > 0) events.push({
          type: 'healing-applied',
          targetId: activeHeroId,
          amount,
          maxHp: actor.maxHp,
          text: `${actor.name} восстанавливает ${amount} HP.`,
        });
      }
      if (effect.type === 'remove-negative-conditions') {
        events.push(...createCleanseEvents(combat, activeHeroId, effect.max));
      }
      if (effect.type === 'modify-attack') events.push({
        type: 'combat-attack-modifier-applied',
        modifier: {
          id: `${action.id}-${combat.round}-${result}-attack`,
          sourceActorId: activeHeroId,
          targetIds: [activeHeroId],
          amount: effect.amount,
          consumeOnAttack: effect.duration === 'next-attack',
          expiresAtTurnStartOf: effect.duration === 'until-source-next-turn' ? activeHeroId : undefined,
        },
        text: `${actor.name} получает +${effect.amount} к следующей атаке.`,
      });
      if (effect.type === 'modify-ac') events.push({
        type: 'combat-ac-modifier-applied',
        modifier: {
          id: `${action.id}-${combat.round}-${result}-ac`,
          sourceActorId: activeHeroId,
          targetIds: [activeHeroId],
          amount: effect.amount,
          expiresAtTurnStartOf: activeHeroId,
        },
        text: `${actor.name} получает +${effect.amount} AC до следующего хода.`,
      });
      if (effect.type === 'apply-status') events.push({
        type: 'combat-status-applied',
        status: createStatusState(action, activeHeroId, activeHeroId, effect),
      });
    });
  }

  const areaDamage = action.effects.find((effect) => effect.type === 'area-damage');
  if (areaDamage) {
    const damageDice = getDamageRoll(areaDamage.damage);
    const rolledDamage = damageDice && providedRoll !== undefined
      ? resolveDamageTotal(damageDice, providedRoll)
      : null;
    const heatCharge = activeHeroId === 'golovach-lena' && areaDamage.damageType === 'fire'
      ? getFirstCombatStatus(combat, activeHeroId, 'heat-charge')
      : undefined;
    const heatBonus = heatCharge?.amount ?? 0;
    const damage = rolledDamage === null ? null : rolledDamage + heatBonus;
    const selectedEnemy = selectedTargetId ? combat.enemies[selectedTargetId] : undefined;
    if (damage === null || !selectedEnemy || selectedEnemy.hp <= 0) return null;
    const livingEnemies = Object.values(combat.enemies).filter((enemy) => enemy.hp > 0);
    const targets = [
      selectedEnemy,
      ...livingEnemies.filter((enemy) => enemy.id !== selectedEnemy.id),
    ].slice(0, areaDamage.maxTargets);
    const [firstTarget, ...remainingTargets] = targets;
    events.push({
      type: 'combat-saving-throw-requested',
      savingThrow: {
        kind: 'area-damage-save',
        sourceActorId: activeHeroId,
        sourceName: actor.name,
        targetId: firstTarget.id,
        targetName: firstTarget.name,
        stat: areaDamage.savingThrow.stat,
        modifier: 0,
        dc: areaDamage.savingThrow.dc,
        failureConditions: [],
        duration: 'next-turn',
        rollExpression: '1d20',
        areaDamage: {
          actionId: action.id,
          actionName: action.name,
          damage,
          damageType: areaDamage.damageType,
          halfOnSuccess: areaDamage.savingThrow.halfOnSuccess,
          failureStatus: areaDamage.savingThrow.failureStatus,
          remainingTargetIds: remainingTargets.map((enemy) => enemy.id),
        },
      },
    });
    if (heatCharge) events.push(consumeStatusEvent(
      heatCharge,
      `${actor.name} вкладывает накопленный жар (+${heatBonus}) в «${action.name}».`,
    ));
  }

  if (events.length === 1) return null;
  events.push({type: 'combat-action-selected', actionId: action.id, selected: false});
  if (activation === 'action' && !events.some((event) => event.type === 'combat-saving-throw-requested')) events.push({type: 'turn-advanced'});
  return events;
}

export function createEquipCombatItemCommand(
  context: CombatCommandContext,
  actionId: string | null,
): CombatEventInput[] | null {
  const {combat, definition} = context;
  const activeHeroId = combat.initiativeOrder[combat.turnIndex];
  if (
    combat.pendingAttack
    || combat.pendingSavingThrow
    || !activeHeroId
    || combat.enemies[activeHeroId]
    || combat.allies[activeHeroId]
  ) return null;
  if (!isParticipantAbleToAct(context, activeHeroId)) return null;
  const action = actionId ? definition.combatActions.find((item) => item.id === actionId) : undefined;
  if (actionId && (!action || action.source !== 'item' || action.characterId !== activeHeroId)) return null;
  if (action && !action.encounterIds.includes(combat.encounterId)) return null;
  if (action && !isCombatActionSourceAvailable(action, context)) return null;

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
  providedReroll?: number,
  useHelpingReaction = false,
): CombatEventInput[] | null {
  const {combat, heroes} = context;
  const activeEnemy = combat.enemies[combat.initiativeOrder[combat.turnIndex]];
  if (!activeEnemy) return null;
  const selectedAction = context.definition.combatActions.find((action) => action.characterId === activeEnemy.id
    && action.encounterIds.includes(combat.encounterId) && combat.selectedActionIds.includes(action.id)
    && getCombatActionActivation(action) === 'attack');
  if (selectedAction && !isCombatActionSourceAvailable(selectedAction, context)) return null;
  const attack = selectedAction?.effects.find((effect) => effect.type === 'replace-attack')?.attack ?? activeEnemy.attack;
  const usage: CombatEventInput[] = selectedAction ? [createCombatActionUsageEvent(selectedAction),
    {type: 'combat-action-selected', actionId: selectedAction.id, selected: false}] : [];
  const challenge = getFirstCombatStatus(combat, activeEnemy.id, 'beast-challenge');
  const confusion = getFirstCombatStatus(combat, activeEnemy.id, 'confused');
  const resolvedTargetId = getCombatEnemyTargetId(combat, activeEnemy.id, targetId, context.heroHp);
  const confusedTarget = confusion ? combat.enemies[resolvedTargetId] : undefined;
  const heroTarget = heroes.find((hero) => hero.id === resolvedTargetId);
  const allyTarget = combat.allies[resolvedTargetId];
  const enemyTarget = combat.enemies[resolvedTargetId];
  const target = heroTarget ?? allyTarget ?? enemyTarget;
  if (
    combat.pendingAttack
    || combat.pendingSavingThrow
    || !target
    || activeEnemy.hp <= 0
  ) return null;
  if (!isParticipantAbleToAct(context, activeEnemy.id)) return null;
  // A stunned creature is still a legal target (including an enemy redirected by sarcasm).
  if ((heroTarget ? context.heroHp[resolvedTargetId] ?? 0 : allyTarget?.hp ?? enemyTarget?.hp ?? 0) <= 0
    || context.participantConditions[resolvedTargetId]?.includes('downed')) return null;

  const greaseTrap = getFirstCombatStatus(combat, activeEnemy.id, 'grease-trap');
  if (greaseTrap) return [
    ...usage,
    consumeStatusEvent(greaseTrap),
    {type: 'combat-attack-resolved', hit: true, attack: {
      actorId: activeEnemy.id, actorName: activeEnemy.name, targetId: activeEnemy.id, targetName: activeEnemy.name,
      attackName: `${attack.name} — отражение ловушкой`, automatic: true, natural: 0, bonus: 0, total: 0,
      targetAc: activeEnemy.ac, critical: false, damageExpression: attack.damage,
      range: getCombatAttackRange(attack), damageType: attack.damageType,
    }, text: `Жировая ловушка отражает атаку ${activeEnemy.name} в него самого. ${target.name} защищён. Бросьте обычный урон атаки без критического удвоения.`},
  ];
  const originalNatural = providedRoll ?? rollDie(20);
  const attackRange = getCombatAttackRange(attack);
  const targetAc = heroTarget ? getCombatHeroAc(combat, heroTarget, attackRange) : enemyTarget ? getCombatEnemyAc(combat, enemyTarget.id) : target.ac + combat.acModifiers.filter((modifier) => modifier.targetIds.includes(target.id)).reduce((sum, modifier) => sum + modifier.amount, 0);
  const effectiveBonus = attack.bonus
    + getCombatAttackBonusModifier(combat, activeEnemy.id, resolvedTargetId);
  const originalAttackRoll = resolveAttackAgainstArmor(originalNatural, effectiveBonus, targetAc);
  if (!originalAttackRoll) return null;
  const surveillance = getFirstCombatStatus(combat, activeEnemy.id, 'surveilled');
  const windGuards = (combat.statuses ?? []).filter((status) => (
    status.kind === 'wind-guard' && status.charges > 0 && !enemyTarget
  ));
  const shouldReroll = Boolean(surveillance || (windGuards.length > 0 && originalAttackRoll.hit));
  if (shouldReroll && providedReroll === undefined) return [{
    type: 'combat-saving-throw-requested', savingThrow: {
      kind: 'enemy-attack-reroll', actionName: attack.name,
      sourceActorId: activeEnemy.id, sourceName: activeEnemy.name, targetId: target.id, targetName: target.name,
      stat: 'dexterity', modifier: effectiveBonus, dc: targetAc, failureConditions: [], duration: 'next-attack',
      rollExpression: '1d20', attackReroll: {firstRoll: originalNatural, targetId},
    },
  }];
  if (providedReroll !== undefined && (!Number.isInteger(providedReroll) || providedReroll < 1 || providedReroll > 20)) return null;
  const rerolledNatural = shouldReroll ? providedReroll! : originalNatural;
  const natural = shouldReroll ? Math.min(originalNatural, rerolledNatural) : originalNatural;
  const rollMode = getCombatAttackRollMode(combat, activeEnemy.id, resolvedTargetId, attackRange);
  let resolvedTargetAc = targetAc;
  let attackRoll = resolveAttackAgainstArmor(natural, effectiveBonus, resolvedTargetAc);
  if (!attackRoll) return null;
  const helpingReaction = (combat.statuses ?? []).find((status) => (
    status.kind === 'helping-reaction'
    && status.targetId !== resolvedTargetId
    && status.charges > 0
    && isParticipantAbleToAct(context, status.targetId)
  ));
  const canHelp = Boolean(
    helpingReaction
    && !enemyTarget
    && attackRoll.hit
    && natural !== 20
    && attackRoll.total < targetAc + 2
  );
  if (useHelpingReaction && !canHelp) return null;
  const helpingTriggered = useHelpingReaction && canHelp;
  if (helpingTriggered) {
    resolvedTargetAc += 2;
    attackRoll = resolveAttackAgainstArmor(natural, effectiveBonus, resolvedTargetAc)!;
  }
  const {critical, hit, total} = attackRoll;
  const consumedConditions = (combat.conditions[activeEnemy.id] ?? []).filter((condition) => (
    condition === 'blinded' || condition === 'attack-disadvantage'
  ));
  const rollModeLabel = rollMode === 'disadvantage' ? ' с помехой' : '';
  const jammed = getFirstCombatStatus(combat, activeEnemy.id, 'jammed');
  const rerollLabel = shouldReroll
    ? `; переброс ${originalNatural}/${rerolledNatural}, оставлен ${natural}`
    : '';
  const events: CombatEventInput[] = [
    ...usage,
    {
      type: 'combat-attack-resolved',
      hit,
      attack: {
        actorId: activeEnemy.id,
        actorName: activeEnemy.name,
        targetId: resolvedTargetId,
        targetName: target.name,
        attackName: attack.name,
        natural,
        bonus: effectiveBonus,
        total,
        targetAc: resolvedTargetAc,
        critical,
        damageExpression: attack.damage,
        range: attackRange,
        damageType: attack.damageType,
        rollMode,
        onHitSavingThrow: !jammed && 'onHitSavingThrow' in attack ? attack.onHitSavingThrow : undefined,
      },
      text: hit
        ? `${activeEnemy.name}: ${attack.name}${rollModeLabel} → ${target.name}. ${natural} + ${effectiveBonus} = ${total}${rerollLabel}; броня пробита${critical ? ', критическое попадание' : ''}. Нужен бросок урона.`
        : `${activeEnemy.name}: ${attack.name}${rollModeLabel} → ${target.name}. ${natural} + ${effectiveBonus} = ${total}${rerollLabel} против AC ${resolvedTargetAc}; ${natural === 1 ? 'натуральная 1, автоматический промах' : 'промах'}.`,
    },
    ...consumedConditions.map((condition): CombatEventInput => ({
      type: 'combat-condition-changed',
      participantId: activeEnemy.id,
      condition,
      active: false,
    })),
    ...(surveillance ? [consumeStatusEvent(
      surveillance,
      `Видеонаблюдение заставляет ${activeEnemy.name} перебросить атаку и оставить худший результат.`,
    )] : []),
    ...(windGuards.length > 0 && originalAttackRoll.hit
      ? windGuards.map((windGuard, index) => consumeStatusEvent(
          windGuard,
          index === 0 ? `Курортная турбулентность искажает успешную атаку ${activeEnemy.name}.` : undefined,
        ))
      : []),
    ...(jammed ? [consumeStatusEvent(jammed)] : []),
    ...(confusion ? [consumeStatusEvent(
      confusion,
      confusedTarget
        ? `${activeEnemy.name} путает цель и атакует ${confusedTarget.name}.`
        : `${activeEnemy.name} не находит другой цели и атакует с помехой.`,
    )] : []),
    ...(challenge ? [consumeStatusEvent(
      challenge,
      `${activeEnemy.name} вынужден атаковать Торина с помехой.`,
    )] : []),
    ...(helpingTriggered && helpingReaction ? [consumeStatusEvent(
      helpingReaction,
      `Палочка-выручалочка даёт ${target.name} +2 AC против текущего попадания.`,
    )] : []),
  ];
  if (!hit) events.push({type: 'turn-advanced'});
  return events;
}

export function createSummonedAllyAttackCommand(
  context: CombatCommandContext,
  allyId: string,
  targetEnemyId: string,
  providedRoll?: number,
): CombatEventInput[] | null {
  const {combat} = context;
  const ally = combat.allies[allyId];
  const target = combat.enemies[targetEnemyId];
  if (
    combat.pendingAttack
    || combat.pendingSavingThrow
    || !ally
    || !target
    || target.hp <= 0
    || combat.initiativeOrder[combat.turnIndex] !== allyId
    || !isParticipantAbleToAct(context, allyId)
  ) return null;
  // Summons use the same hit/status pipeline: advantages, marks and bonuses must expire too.
  const encounter = context.definition.encounters.find((item) => item.id === combat.encounterId);
  if (!encounter) return null;
  return createHeroAttackCommand({
    ...context,
    heroes: [...context.heroes, {...ally, stats: {}}],
    definition: {...context.definition, encounters: context.definition.encounters.map((item) => item.id === encounter.id
      ? {...item, heroAttacks: [...item.heroAttacks, {...ally.attack, characterId: ally.id}]} : item)},
  }, allyId, targetEnemyId, providedRoll);
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

  const encounter = definition.encounters.find((item) => item.id === combat.encounterId);
  const enemyTarget = combat.enemies[attack.targetId];
  const nextSegmentFloor = enemyTarget && encounter?.segmentedHp?.length
    ? encounter.segmentedHp.find((floor) => enemyTarget.hp > floor)
    : undefined;
  const cappedAmount = enemyTarget
    && nextSegmentFloor !== undefined
    && encounter?.overflowDamageCarries === false
    ? Math.min(resolved.amount, Math.max(0, enemyTarget.hp - nextSegmentFloor))
    : resolved.amount;
  const {amount: appliedAmount, explanation: damageMitigation} = mitigateCombatDamage(combat, attack.targetId, attack.damageType, cappedAmount);
  const diceLabel = formatDicePoolExpression(resolved.dice);
  const calculation = formatDamageCalculation(rawDiceTotal, resolved.modifier, resolved.multiplier === 2);
  const mitigationText = [
    cappedAmount < resolved.amount ? `граница контура поглощает ${resolved.amount - cappedAmount}` : '',
    damageMitigation,
  ].filter(Boolean).join('; ');
  const events: CombatEventInput[] = [{
    type: 'combat-damage-resolved',
    targetId: attack.targetId,
    amount: appliedAmount,
    text: `${attack.actorName}: ${attack.attackName} → ${attack.targetName}; кубики ${diceLabel}: ${calculation} = ${resolved.amount} урона${mitigationText ? `; применено ${appliedAmount}, ${mitigationText}` : ''}.`,
  }];
  const secondaryEnemy = attack.secondaryTargetId
    ? combat.enemies[attack.secondaryTargetId]
    : undefined;
  if (secondaryEnemy && secondaryEnemy.hp > 0) events.push({
    type: 'combat-damage-resolved',
    targetId: secondaryEnemy.id,
    amount: resolved.amount,
    text: `${attack.actorName}: вторая стрела «${attack.attackName}» → ${secondaryEnemy.name}; ${resolved.amount} урона.`,
  });

  events.push(...createColdHitReactions(combat, attack.targetId, attack.damageType, appliedAmount));

  for (const target of [enemyTarget, secondaryEnemy]) {
    if (!target || combat.enemies[attack.actorId]) continue;
    const crown = getFirstCombatStatus(combat, target.id, 'retaliating-crown');
    if (!crown) continue;
    events.push({type: 'combat-status-removed', statusId: crown.id, text: `Корона ${target.name} разбита; защита снята.`},
      {type: 'combat-damage-resolved', targetId: attack.actorId, amount: crown.retaliationDamage ?? 0,
        text: `Осколок короны → ${attack.actorName}: ${crown.retaliationDamage ?? 0} магического урона.`});
  }

  const victory = Boolean(enemyTarget) && Object.values(combat.enemies).filter((enemy) => isCombatCreature(enemy) && !enemy.summonedBy).every((enemy) => (
    enemy.id === attack.targetId
      ? Math.max(0, enemy.hp - appliedAmount)
      : enemy.id === secondaryEnemy?.id
        ? Math.max(0, enemy.hp - resolved.amount)
        : enemy.hp
  ) <= 0);
  if (victory) {
    events.push({type: 'combat-ended', text: encounter?.victoryText ?? 'Противник побеждён.'});
  } else {
    const nextHp = enemyTarget ? Math.max(0, enemyTarget.hp - appliedAmount) : null;
    const transition = nextHp === null
      ? undefined
      : encounter?.phaseTransitions?.find((item) => item.hpFloor === nextHp);
    if (transition) events.push({
      type: 'combat-phase-advanced',
      phase: transition.phase,
      name: transition.name,
      ac: transition.ac ?? encounter?.ac ?? enemyTarget?.ac ?? 10,
      attack: transition.attack,
      text: `Контур ${transition.phase}: «${transition.name}». Броня и активная атака перестраиваются.`,
    });
    const hitHero = context.heroes.find((hero) => hero.id === attack.targetId);
    if (hitHero && combat.enemies[attack.actorId] && attack.onHitSavingThrow
      && ((context.heroHp[hitHero.id] ?? 0) + combat.statuses.filter((status) => status.targetId === hitHero.id && status.kind === 'temporary-hp').reduce((sum, status) => sum + (status.amount ?? 0), 0) > appliedAmount
        || Boolean(getFirstCombatStatus(combat, hitHero.id, 'survival-instinct') || getFirstCombatStatus(combat, hitHero.id, 'last-push')))) {
      const check = attack.onHitSavingThrow;
      events.push({type: 'combat-saving-throw-requested', savingThrow: {
        kind: 'enemy-skill', sourceActorId: attack.actorId, sourceName: attack.actorName,
        targetId: hitHero.id, targetName: hitHero.name, stat: check.stat,
        modifier: (hitHero.stats[check.stat] ?? 0) + getCombatStatModifier(combat, hitHero.id, check.stat), dc: check.dc,
        failureConditions: check.failureConditions ?? (check.failureCondition ? [check.failureCondition] : []),
        duration: check.duration, rollExpression: '1d20',
        enemySkill: {actionId: 'enemy-on-hit', actionName: attack.attackName, remainingTargetIds: [], damage: 0},
      }});
    } else if (enemyTarget && nextHp !== null && nextHp > 0 && attack.onHitSavingThrow) {
      events.push({
        type: 'combat-saving-throw-requested',
        savingThrow: {
          sourceActorId: attack.actorId,
          sourceName: attack.actorName,
          actionName: attack.attackName,
          targetId: enemyTarget.id,
          targetName: enemyTarget.name,
          stat: attack.onHitSavingThrow.stat,
          modifier: 0,
          dc: attack.onHitSavingThrow.dc,
          failureConditions: attack.onHitSavingThrow.failureConditions
            ?? (attack.onHitSavingThrow.failureCondition ? [attack.onHitSavingThrow.failureCondition] : []),
          duration: attack.onHitSavingThrow.duration,
        },
      });
    } else events.push({type: 'turn-advanced'});
  }
  return {events, victory};
}

export function createResolveCombatSavingThrowCommand(
  context: CombatCommandContext,
  providedRoll?: number,
  rerolledFrom?: number,
  useHelpingReaction = false,
): CombatEventInput[] | null {
  const {combat, definition} = context;
  const savingThrow = combat.pendingSavingThrow;
  if (rerolledFrom !== undefined) {
    const inspiration = savingThrow && getFirstCombatStatus(combat, savingThrow.targetId, 'inspired');
    if (!savingThrow || !inspiration || !Number.isInteger(rerolledFrom) || rerolledFrom < 1 || rerolledFrom > 20
      || ['action-healing', 'area-damage-status', 'enemy-attack-reroll'].includes(savingThrow.kind ?? '')) return null;
    const result = createResolveCombatSavingThrowCommand(context, providedRoll, undefined, useHelpingReaction);
    return result ? [consumeStatusEvent(inspiration, `${savingThrow.targetName}: «История моего имени», переброс спасброска ${rerolledFrom} → ${providedRoll}.`), ...result] : null;
  }
  if (savingThrow?.kind === 'enemy-attack-reroll' && savingThrow.attackReroll) {
    if (combat.initiativeOrder[combat.turnIndex] !== savingThrow.sourceActorId || providedRoll === undefined) return null;
    const events = createEnemyAttackCommand({...context, combat: {...combat, pendingSavingThrow: null}},
      savingThrow.attackReroll.targetId, savingThrow.attackReroll.firstRoll, providedRoll, useHelpingReaction);
    return events ? [{type: 'combat-saving-throw-resolved', text: `${savingThrow.sourceName}: защитный эффект требует перебросить атаку; ${savingThrow.attackReroll.firstRoll} / ${providedRoll}, выбран меньший.`}, ...events] : null;
  }
  if (savingThrow?.kind === 'action-healing' && savingThrow.healing) {
    if (combat.initiativeOrder[combat.turnIndex] !== savingThrow.sourceActorId || combat.pendingAttack) return null;
    const dice = getDamageRoll(savingThrow.rollExpression ?? '');
    const amount = dice && providedRoll !== undefined ? resolveDamageTotal(dice, providedRoll) : null;
    if (amount === null) return null;
    return [{type: 'combat-saving-throw-resolved', text: `${savingThrow.actionName}: лечение ${savingThrow.rollExpression} = ${amount}.`},
      {type: 'healing-applied', targetId: savingThrow.targetId, amount, maxHp: savingThrow.healing.maxHp, text: `${savingThrow.targetName} восстанавливает ${amount} HP.`},
      ...(savingThrow.healing.endTurn ? [{type: 'turn-advanced' as const}] : [])];
  }
  if (savingThrow?.kind === 'enemy-skill') return resolveEnemySkillSave(context, providedRoll, useHelpingReaction);
  if (useHelpingReaction) return null;
  if (
    !savingThrow
    || combat.pendingAttack
    || combat.initiativeOrder[combat.turnIndex] !== savingThrow.sourceActorId
    || (combat.enemies[savingThrow.targetId]?.hp ?? 0) <= 0
  ) return null;
  const areaDamage = savingThrow.areaDamage;
  const nextAreaSavingThrow = (): CombatEventInput | null => {
    if (!areaDamage) return null;
    const livingTargets = areaDamage.remainingTargetIds
      .map((targetId) => combat.enemies[targetId])
      .filter((target) => Boolean(target && target.hp > 0));
    const [nextTarget, ...remainingTargets] = livingTargets;
    if (!nextTarget) return null;
    return {
      type: 'combat-saving-throw-requested',
      savingThrow: {
        ...savingThrow,
        kind: 'area-damage-save',
        targetId: nextTarget.id,
        targetName: nextTarget.name,
        failureConditions: [],
        rollExpression: '1d20',
        areaDamage: {
          ...areaDamage,
          remainingTargetIds: remainingTargets.map((target) => target.id),
        },
      },
    };
  };

  if (savingThrow.kind === 'area-damage-status' && areaDamage?.failureStatus) {
    const statusDice = getDamageRoll(savingThrow.rollExpression ?? '1d4');
    const amount = statusDice && providedRoll !== undefined
      ? resolveDamageTotal(statusDice, providedRoll)
      : null;
    if (amount === null) return null;
    const events: CombatEventInput[] = [
      {
        type: 'combat-saving-throw-resolved',
        text: `${savingThrow.targetName}: урон горения ${savingThrow.rollExpression ?? '1d4'} = ${amount}.`,
      },
      {
        type: 'combat-status-applied',
        status: {
          id: `${areaDamage.actionId}-${savingThrow.targetId}-${areaDamage.failureStatus}`,
          kind: areaDamage.failureStatus,
          sourceActorId: savingThrow.sourceActorId,
          targetId: savingThrow.targetId,
          charges: 1,
          amount,
          expiresAtTurnStartOf: savingThrow.targetId,
        },
        text: `${savingThrow.targetName} горит: ${amount} урона в начале следующего хода, затем горение снимается.`,
      },
    ];
    const nextSavingThrow = nextAreaSavingThrow();
    events.push(nextSavingThrow ?? {type: 'turn-advanced'});
    return events;
  }

  if (savingThrow.kind === 'area-damage-save' && providedRoll === undefined) return null;
  const natural = providedRoll ?? rollDie(20);
  if (!Number.isInteger(natural) || natural < 1 || natural > 20) return null;
  const total = natural + savingThrow.modifier;
  const success = natural === 20 || (natural !== 1 && total >= savingThrow.dc);

  if (savingThrow.kind === 'area-damage-save' && areaDamage) {
    const target = combat.enemies[savingThrow.targetId];
    const appliedDamage = success && areaDamage.halfOnSuccess
      ? Math.floor(areaDamage.damage / 2)
      : areaDamage.damage;
    const nextTargetHp = Math.max(0, target.hp - appliedDamage);
    const victory = Object.values(combat.enemies).filter((enemy) => isCombatCreature(enemy) && !enemy.summonedBy).every((enemy) => (
      enemy.id === target.id ? nextTargetHp : enemy.hp
    ) <= 0);
    const events: CombatEventInput[] = [
      {
        type: 'combat-saving-throw-resolved',
        text: `${savingThrow.targetName}: спасбросок ${getCombatStatLabel(savingThrow.stat)} ${natural} + ${savingThrow.modifier} = ${total} против DC ${savingThrow.dc}; ${success ? 'успех' : 'провал'}.`,
      },
      {
        type: 'combat-damage-resolved',
        targetId: target.id,
        amount: appliedDamage,
        text: `${savingThrow.sourceName}: «${areaDamage.actionName}» → ${target.name}; ${success ? `успех, половина урона (${appliedDamage})` : `провал, ${appliedDamage} урона`}.`,
      },
    ];
    if (victory) {
      const encounter = definition.encounters.find((candidate) => candidate.id === combat.encounterId);
      events.push({type: 'combat-ended', text: encounter?.victoryText ?? 'Противники побеждены.'});
      return events;
    }
    if (!success && areaDamage.failureStatus && nextTargetHp > 0) {
      events.push({
        type: 'combat-saving-throw-requested',
        savingThrow: {
          ...savingThrow,
          kind: 'area-damage-status',
          rollExpression: '1d4',
        },
      });
      return events;
    }
    const nextSavingThrow = nextAreaSavingThrow();
    events.push(nextSavingThrow ?? {type: 'turn-advanced'});
    return events;
  }

  if (!savingThrow.failureConditions.length) return null;
  const conditionLabel = savingThrow.failureConditions.map(getCombatConditionLabel).join(' и ');
  const events: CombatEventInput[] = [{
    type: 'combat-saving-throw-resolved',
    text: `${savingThrow.targetName}: спасбросок ${savingThrow.stat} ${natural} + ${savingThrow.modifier} = ${total} против DC ${savingThrow.dc}; ${success ? 'успех' : `провал — ${conditionLabel}`}.`,
  }];
  if (!success) savingThrow.failureConditions.forEach((condition, index) => events.push({
    type: 'combat-condition-changed',
    participantId: savingThrow.targetId,
    condition,
    active: true,
    text: index === 0
      ? `${savingThrow.sourceName}: эффект закреплён на ${savingThrow.targetName} — ${conditionLabel}.`
      : undefined,
  }));
  events.push({type: 'turn-advanced'});
  return events;
}

export function resolveCombatWeaknessManeuver(
  context: CombatCommandContext,
  heroId: string,
  stat: CombatStat,
  providedRoll?: number,
  situationalBonus = 0,
) {
  const {combat, definition, heroes} = context;
  const hero = heroes.find((item) => item.id === heroId);
  const encounter = definition.encounters.find((item) => item.id === combat.encounterId);
  if (combat.pendingAttack || combat.pendingSavingThrow || !hero || combat.initiativeOrder[combat.turnIndex] !== heroId) return null;
  if (!isParticipantAbleToAct(context, heroId)) return null;
  if (!encounter?.weakness.stats.includes(stat)) return null;
  const natural = providedRoll ?? rollDie(20);
  const modifier = (hero.stats[stat] ?? 0)
    + getCombatStatModifier(combat, heroId, stat)
    + situationalBonus;
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
