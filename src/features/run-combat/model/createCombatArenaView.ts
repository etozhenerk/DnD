import {getEnemySkillTargets} from './enemySkillCommands';
import {combatConditionPresentation as conditionPresentation} from '../../../entities/combat/model/combatConditionPresentation';
import {combatConditionVisuals, combatStatusVisuals} from '../../../entities/combat/model/combatEffectVisuals';
import {isCombatVictory} from '../../../entities/combat/model/combatObjectives';
import {getCombatActionCost} from './combatActionCost';
import {
  getCombatAttackBonusModifier,
  getCombatAttackRange,
  getCombatAttackRollMode,
  getCombatHeroAc,
  getCombatEnemyAc,
  getCombatEnemyTargetId,
  getCombatStatModifier,
  isCombatAllyActive,
} from '../../../entities/combat/model/combatRules';
import type {
  CombatConditionId,
  CombatState,
  CombatStat,
  CombatStatusKind,
} from '../../../entities/combat/model/types';
import {getCombatStatusPresentation, getFirstCombatStatus, passiveStatusKinds} from '../../../entities/combat/model/combatStatus.ts';
import {formatDiceExpression, parseDiceExpression} from '../../../shared/lib/dice/diceExpression';
import type {
  CombatActionView,
  CombatArenaViewInput,
  CombatArenaViewModel,
  CombatEffectView,
  CombatStatView,
  CombatTargetView,
  CombatantView,
} from '../../../entities/combat/model/view';
import {
  getCombatActionActivation,
  getCombatActionResourceKey,
  isCombatActionSourceAvailable,
} from './combatCommands';
import {createCombatMechanicsHelp} from './createCombatMechanicsHelp';

const combatStatLabels = {
  strength: 'Сила',
  dexterity: 'Ловкость',
  constitution: 'Телосложение',
  wisdom: 'Мудрость',
  intelligence: 'Интеллект',
  charisma: 'Харизма',
} as const;

const combatStatShortLabels: Record<CombatStat, string> = {
  strength: 'СИЛ',
  dexterity: 'ЛОВ',
  constitution: 'ТЕЛ',
  wisdom: 'МДР',
  intelligence: 'ИНТ',
  charisma: 'ХАР',
};

const combatStatOrder: CombatStat[] = [
  'strength',
  'dexterity',
  'constitution',
  'wisdom',
  'intelligence',
  'charisma',
];

const sessionConditionPresentation: Record<string, Omit<CombatEffectView, 'id'>> = {
  shamed: {
    visual: 'shame',
    label: 'Стыд: −2 к следующей атаке или проверке.',
    shortLabel: 'Стыд −2',
    tone: 'negative',
  },
  'assigned-role': {
    visual: 'bound',
    label: 'Назначенная роль: следующее формальное действие будет потрачено на неё.',
    shortLabel: 'Пропуск действия',
    tone: 'negative',
  },
  blinded: {
    visual: 'blind',
    label: 'Ослепление: активное негативное состояние сцены.',
    shortLabel: 'Ослеплён',
    tone: 'negative',
  },
  frightened: {
    visual: 'fear',
    label: 'Испуг: активное негативное состояние сцены.',
    shortLabel: 'Испуган',
    tone: 'negative',
  },
  frozen: {
    visual: 'ice',
    label: 'Заморозка: активное негативное состояние сцены.',
    shortLabel: 'Заморожен',
    tone: 'negative',
  },
  prone: {
    visual: 'prone',
    label: 'Падение: персонаж находится на земле.',
    shortLabel: 'Лежит',
    tone: 'negative',
  },
  stunned: {
    visual: 'stun',
    label: 'Оглушение: активное негативное состояние сцены.',
    shortLabel: 'Оглушён',
    tone: 'negative',
  },
  inspired: {
    visual: 'inspire',
    label: 'Вдохновение: активное положительное состояние сцены.',
    shortLabel: 'Вдохновлён',
    tone: 'positive',
  },
};

const areaFailureLabels: Record<CombatConditionId, string> = {
  blinded: 'ослепление',
  'attack-disadvantage': 'помеха на следующую атаку',
  prone: 'падение',
  stunned: 'пропуск следующего действия',
};

function getAreaOutcomeLabel(conditions: CombatConditionId[], status?: CombatStatusKind) {
  const labels = conditions.map((condition) => areaFailureLabels[condition]);
  if (status) labels.push(getCombatStatusPresentation({
    id: 'preview',
    kind: status,
    sourceActorId: 'preview',
    targetId: 'preview',
    charges: 1,
  }).shortLabel.toLocaleLowerCase('ru-RU'));
  return labels.join(' и ') || 'без дополнительного эффекта';
}

function signedModifier(value: number) {
  return `${value >= 0 ? '+' : '−'}${Math.abs(value)}`;
}

function getCombatEffects(
  combat: CombatState,
  participantId: string,
  participantNames: ReadonlyMap<string, string>,
  participantConditions: string[] = [],
): CombatEffectView[] {
  const combatConditionIds = combat.conditions[participantId] ?? [];
  const conditions: CombatEffectView[] = combatConditionIds.map((condition) => ({
    id: `condition-${condition}`,
    visual: combatConditionVisuals[condition],
    ...conditionPresentation[condition],
    tone: 'negative',
  }));
  const sessionConditions: CombatEffectView[] = participantConditions.flatMap((condition) => {
    if (condition === 'downed' || combatConditionIds.includes(condition as CombatConditionId)) return [];
    const presentation = sessionConditionPresentation[condition];
    return presentation ? [{id: `session-condition-${condition}`, ...presentation}] : [];
  });
  const recentlySkipped: CombatEffectView[] = combat.recentlySkippedParticipantIds?.includes(participantId)
    && !(combat.conditions[participantId] ?? []).includes('stunned')
    ? [{
        id: 'recently-skipped',
        visual: 'stun',
        label: 'Только что пропустил действие из-за негативного эффекта',
        shortLabel: 'Ход пропущен',
        tone: 'negative',
      }]
    : [];
  const acModifiers: CombatEffectView[] = combat.acModifiers
    .filter((modifier) => modifier.targetIds.includes(participantId))
    .map((modifier) => ({
      id: `ac-${modifier.id}`,
      visual: modifier.amount >= 0 ? 'shield' : 'breach',
      label: `${signedModifier(modifier.amount)} к защите до следующего хода ${participantNames.get(modifier.sourceActorId) ?? 'источника'}`,
      shortLabel: `AC ${signedModifier(modifier.amount)}`,
      tone: modifier.amount >= 0 ? 'positive' : 'negative',
    }));
  const attackModifiers: CombatEffectView[] = combat.attackModifiers
    .filter((modifier) => modifier.targetIds.includes(participantId))
    .map((modifier) => {
      const againstNames = modifier.againstTargetIds
        ?.map((targetId) => participantNames.get(targetId) ?? targetId)
        .join(', ');
      return {
        id: `attack-${modifier.id}`,
        visual: modifier.amount >= 0 ? 'damage' as const : 'disadvantage' as const,
        label: `${signedModifier(modifier.amount)} к атаке${againstNames ? ` против: ${againstNames}` : ''}${modifier.consumeOnAttack ? ' до следующей атаки' : ''}`,
        shortLabel: `АТК ${signedModifier(modifier.amount)}`,
        tone: modifier.amount >= 0 ? 'positive' : 'negative',
      };
    });
  const statModifiers: CombatEffectView[] = combat.statModifiers
    .filter((modifier) => modifier.targetId === participantId)
    .map((modifier) => ({
      id: `stat-${modifier.id}`,
      visual: 'stat',
      label: `${combatStatLabels[modifier.stat]} ${signedModifier(modifier.amount)} до конца боя`,
      shortLabel: `${combatStatShortLabels[modifier.stat]} ${signedModifier(modifier.amount)}`,
      tone: modifier.amount >= 0 ? 'positive' : 'negative',
    }));
  const stances: CombatEffectView[] = (combat.stances[participantId] ?? []).map((stance) => ({
    id: `stance-${stance}`,
    visual: stance === 'airborne' ? 'fly' : 'shrink',
    label: stance === 'airborne'
      ? 'Полёт: наземные атаки по герою идут с помехой; готово пикирование'
      : 'Малый облик: +3 AC, −2 к атакам и отсутствие вражеских реакций',
    shortLabel: stance === 'airborne' ? 'Полёт' : 'Малый облик',
    tone: stance === 'airborne' ? 'positive' : 'neutral',
  }));
  const statuses: CombatEffectView[] = (combat.statuses ?? [])
    .filter((status) => status.targetId === participantId && status.charges > 0 && status.kind !== 'movement-spent')
    .map((status) => {
      const presentation = getCombatStatusPresentation(status);
      const revealedAction = (
        status.kind === 'studied-target' || status.kind === 'surveilled'
      ) ? combat.enemies[participantId]?.attack.name : undefined;
      return {
        id: `status-${status.id}`,
        visual: combatStatusVisuals[status.kind],
        label: revealedAction
          ? `${presentation.label} Следующее действие: «${revealedAction}».`
          : presentation.label,
        passive: passiveStatusKinds.has(status.kind),
        shortLabel: presentation.shortLabel,
        tone: presentation.tone,
      };
    });
  return [
    ...conditions,
    ...sessionConditions,
    ...recentlySkipped,
    ...statuses,
    ...acModifiers,
    ...attackModifiers,
    ...statModifiers,
    ...stances,
  ];
}

function getCharacterStats(combat: CombatState, hero: CombatArenaViewInput['heroes'][number]): CombatStatView[] {
  return combatStatOrder.map((stat) => {
    const base = hero.stats[stat] ?? 0;
    const modifier = getCombatStatModifier(combat, hero.id, stat);
    return {
      id: stat,
      label: combatStatLabels[stat],
      base,
      modifier,
      total: base + modifier,
    };
  });
}

export function createCombatArenaView(input: CombatArenaViewInput): CombatArenaViewModel | null {
  const {
    actions,
    combat,
    encounter,
    fallbackEnemyToken,
    heroes,
    heroHp,
    inventoryState,
    heroPortraits = {},
    heroTokens,
    participantConditions = {},
    requestedEnemyTargetId,
    requestedHeroTargetId,
    resourceUses,
  } = input;
  const activeCombatantId = combat.initiativeOrder[combat.turnIndex];
  const activeHero = heroes.find((hero) => hero.id === activeCombatantId);
  const activeAlly = isCombatAllyActive(combat, activeCombatantId)
    ? combat.allies[activeCombatantId]
    : undefined;
  const activeEnemy = combat.enemies[activeCombatantId];
  if (!activeHero && !activeAlly && !activeEnemy) return null;

  const participantNames = new Map<string, string>([
    ...heroes.map((hero) => [hero.id, hero.name] as const),
    ...Object.values(combat.allies).map((ally) => [ally.id, ally.name] as const),
    ...Object.values(combat.enemies).map((enemy) => [enemy.id, enemy.name] as const),
  ]);

  const selectedAttackAction = (activeHero || activeEnemy) ? actions.find((action) => (
    combat.selectedActionIds.includes(action.id)
    && action.characterId === (activeHero?.id ?? activeEnemy?.id)
    && getCombatActionActivation(action) === 'attack'
  )) : undefined;
  const replacementAttack = selectedAttackAction?.effects.find((effect) => effect.type === 'replace-attack');
  const selectingEnemyUtility = activeEnemy && actions.some((action) => action.characterId === activeEnemy.id
    && combat.selectedActionIds.includes(action.id) && getCombatActionActivation(action) === 'action');
  const incomingRange = activeEnemy && !selectingEnemyUtility
    ? getCombatAttackRange(replacementAttack?.attack ?? activeEnemy.attack) : undefined;
  const heroTargets: CombatTargetView[] = heroes.map((hero) => ({
    id: hero.id,
    name: hero.name,
    faction: 'hero',
    kind: 'hero',
    token: heroTokens[hero.id] ?? fallbackEnemyToken,
    ...heroPortraits[hero.id],
    hp: heroHp[hero.id] ?? 0,
    maxHp: hero.maxHp,
    ac: getCombatHeroAc(combat, hero, incomingRange),
    effects: getCombatEffects(combat, hero.id, participantNames, participantConditions[hero.id]),
    characterStats: getCharacterStats(combat, hero),
  }));
  const summonedTargets: CombatTargetView[] = Object.values(combat.allies)
    .filter((ally) => isCombatAllyActive(combat, ally.id))
    .map((ally) => ({
      id: ally.id,
      name: ally.name,
      faction: 'hero' as const,
      kind: 'summon' as const,
      token: ally.token ?? heroTokens[ally.ownerId] ?? fallbackEnemyToken,
      hp: ally.hp,
      maxHp: ally.maxHp,
      ac: ally.ac + combat.acModifiers.filter((modifier) => modifier.targetIds.includes(ally.id)).reduce((sum, modifier) => sum + modifier.amount, 0),
      effects: [
        ...getCombatEffects(combat, ally.id, participantNames, participantConditions[ally.id]),
        ...(ally.remainingTurns !== undefined ? [{id: 'guest-turn', visual: 'summon' as const, label: 'Помогает один ход, затем покидает бой.', shortLabel: 'Один ход', tone: 'positive' as const}] : []),
      ],
    }));
  const party = [...heroTargets, ...summonedTargets];
  // Resolve current artwork for saved summons too, without rewriting their combat history.
  const summonTokens = new Map<string, string>(input.actions.flatMap((action) => action.effects.flatMap((effect) =>
    effect.type === 'enemy-summon'
      ? (effect.tokens ?? []).map((token, index) => [`${effect.unit.id}-${index + 1}`, token] as const)
      : [])));
  const enemyTargets: CombatTargetView[] = Object.values(combat.enemies)
    .map((enemy) => ({
      id: enemy.id,
      name: enemy.name,
      faction: 'enemy' as const,
      kind: 'enemy' as const,
      token: (enemy.summonedBy ? summonTokens.get(enemy.id) : undefined) ?? enemy.token ?? fallbackEnemyToken,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      ac: getCombatEnemyAc(combat, enemy.id),
      effects: [
        ...(enemy.summonedBy ? [{id: 'summon-turns', visual: 'summon' as const, label: enemy.hp > 0 ? `Осталось собственных ходов: ${enemy.remainingTurns}. Исчезнет при поражении призывателя.` : 'Тень рассеяна.', shortLabel: enemy.hp > 0 ? `Ходов: ${enemy.remainingTurns}` : 'Рассеян', tone: 'neutral' as const}] : []),
        ...(enemy.kind === 'object' ? [{
          id: 'breakable-object',
          visual: 'bound' as const,
          passive: true,
          label: enemy.hp > 0 ? 'Разбейте колбу, чтобы освободить союзника. Колба не ходит.' : 'Колба разбита, пленник освобождён.',
          shortLabel: enemy.hp > 0 ? 'Не ходит' : 'Разбита',
          tone: 'neutral' as const,
        }] : []),
        ...getCombatEffects(combat, enemy.id, participantNames, participantConditions[enemy.id]),
        ...(combat.weaknessExposed && enemy.kind !== 'object' ? [{
          id: 'weakness-exposed',
          visual: 'breach' as const,
          label: `Слабое место раскрыто: AC противника ${enemy.ac} до следующего успешного удара.`,
          shortLabel: 'Слабое место',
          tone: 'negative' as const,
        }] : []),
      ],
    }))
    .sort((left, right) => Number(left.hp <= 0) - Number(right.hp <= 0));

  const participantById = new Map<string, CombatantView>();
  heroes.forEach((hero) => {
    const baseAttack = encounter.heroAttacks.find((item) => item.characterId === hero.id);
    const attack = hero.id === activeHero?.id && replacementAttack
      ? replacementAttack.attack
      : baseAttack;
    participantById.set(hero.id, {
      ...heroTargets.find((target) => target.id === hero.id)!,
      attackName: attack?.name ?? 'Атака',
      attackArtwork: attack?.artwork,
      attackBonus: (attack?.bonus ?? 0) + getCombatAttackBonusModifier(
        combat,
        hero.id,
        requestedEnemyTargetId,
      ),
    });
  });
  Object.values(combat.allies)
    .filter((ally) => isCombatAllyActive(combat, ally.id))
    .forEach((ally) => participantById.set(ally.id, {
      ...summonedTargets.find((target) => target.id === ally.id)!,
      attackName: ally.attack.name,
      attackArtwork: ally.attack.artwork,
      attackBonus: ally.attack.bonus + getCombatAttackBonusModifier(
        combat,
        ally.id,
        requestedEnemyTargetId,
      ),
    }));
  Object.values(combat.enemies).forEach((enemy) => participantById.set(enemy.id, {
    ...enemyTargets.find((target) => target.id === enemy.id)!,
    attackName: enemy.id === activeEnemy?.id && replacementAttack ? replacementAttack.attack.name : enemy.attack.name,
    attackArtwork: enemy.id === activeEnemy?.id && replacementAttack ? replacementAttack.attack.artwork : enemy.attack.artwork,
    attackBonus: (enemy.id === activeEnemy?.id && replacementAttack ? replacementAttack.attack.bonus : enemy.attack.bonus)
      + getCombatAttackBonusModifier(combat, enemy.id, getCombatEnemyTargetId(combat, enemy.id, requestedHeroTargetId, heroHp)),
  }));
  const active = participantById.get(activeCombatantId);
  if (!active) return null;

  const actionActor = activeHero ?? activeAlly ?? activeEnemy;
  const selectedCombatActions = actionActor
    ? actions.filter((action) => (
        action.characterId === actionActor.id
        && action.encounterIds.includes(combat.encounterId)
        && combat.selectedActionIds.includes(action.id)
      ))
    : [];
  const selectedUtilityActionDefinition = selectedCombatActions.find((action) => {
    const activation = getCombatActionActivation(action);
    return activation !== 'attack' && activation !== 'passive';
  });
  const utilityTargetsAlly = selectedUtilityActionDefinition?.target === 'ally';
  const utilityHasHealing = Boolean(selectedUtilityActionDefinition?.effects.some((effect) => (
    effect.type === 'healing'
  )));
  const utilityHasNonHealingEffect = Boolean(selectedUtilityActionDefinition?.effects.some((effect) => (
    effect.type !== 'healing' && effect.type !== 'passive'
  )));
  const allowDownedAlly = utilityTargetsAlly && utilityHasHealing && !utilityHasNonHealingEffect;
  const guestUtility = selectedUtilityActionDefinition?.effects.find((effect) => effect.type === 'guest-skill');
  const heroTargetCandidates = activeAlly && guestUtility
    ? heroTargets.filter((hero) => hero.hp > 0 && !(participantConditions[hero.id] ?? []).includes('downed'))
    : activeHero && utilityTargetsAlly
    ? party.filter((participant) => (
        participant.id !== activeHero.id
        && (participant.hp > 0 || allowDownedAlly)
      ))
    : party.filter((participant) => participant.hp > 0);
  const suggestedHero = [...heroTargetCandidates]
    .sort((left, right) => activeHero && utilityHasHealing
      ? (right.maxHp - right.hp) - (left.maxHp - left.hp) || left.hp - right.hp || left.id.localeCompare(right.id)
      : !activeHero
        ? left.hp - right.hp || left.id.localeCompare(right.id)
        : left.id.localeCompare(right.id))[0];
  const selectedHeroTargetId = heroTargetCandidates.some((participant) => participant.id === requestedHeroTargetId)
    ? requestedHeroTargetId
    : suggestedHero?.id ?? '';

  const selectedTargetId = combat.pendingAttack?.targetId
    ?? combat.pendingSavingThrow?.targetId
    ?? (activeHero || activeAlly ? requestedEnemyTargetId
      : selectedUtilityActionDefinition ? selectedHeroTargetId
        : getCombatEnemyTargetId(combat, active.id, selectedHeroTargetId, heroHp));
  const baseTargets = combat.enemies[selectedTargetId] || (!combat.pendingSavingThrow && (activeHero || activeAlly))
    ? enemyTargets
    : activeEnemy?.attack.savingThrow ? heroTargets : party;
  const selectedTarget = baseTargets.find((target) => target.id === selectedTargetId);
  const selectedActionExposesWeakness = selectedCombatActions.some((action) => (
    action.effects.some((effect) => effect.type === 'expose-weakness')
  ));
  const targets = selectedTarget
    ? baseTargets.map((target) => target.id === selectedTarget.id
      ? {
          ...target,
          ac: combat.pendingAttack?.targetId === target.id
            ? combat.pendingAttack.targetAc
            : selectedActionExposesWeakness
              ? Math.min(combat.enemies[target.id]?.ac ?? target.ac, encounter.weakness.reducedAc) + (target.ac - (combat.enemies[target.id]?.ac ?? target.ac))
              : target.ac,
        }
      : target)
    : baseTargets;

  const actionViews: CombatActionView[] = actionActor
    ? actions
      .filter((action) => action.characterId === actionActor.id && action.encounterIds.includes(combat.encounterId))
      .map((action) => {
        const activation = getCombatActionActivation(action);
        const resourceKey = getCombatActionResourceKey(action);
        const uses = resourceUses[resourceKey] ?? 0;
        const sourceAvailable = isCombatActionSourceAvailable(action, {inventoryState, resourceUses});
        const item = action.source === 'item' ? inventoryState[action.sourceId] : undefined;
        const enemyArea = action.effects.find((effect) => effect.type === 'enemy-area-damage');
        const enemyCrown = action.effects.find((effect) => effect.type === 'enemy-crown');
        const enemySave = action.effects.find((effect) => effect.type === 'enemy-saving-throw');
        const enemySummon = action.effects.find((effect) => effect.type === 'enemy-summon');
        const enemyTargets = enemySave ? getEnemySkillTargets({heroes, heroHp, participantConditions}, enemySave.maxTargets, selectedHeroTargetId) : [];
        const guestEffect = action.effects.find((effect) => effect.type === 'guest-skill');
        const guestBlocked = guestEffect?.kind === 'grease-trap' ? selectedTargetId !== guestEffect.enemyId
          : guestEffect?.kind === 'healing-note' ? heroes.every((hero) => (heroHp[hero.id] ?? 0) >= hero.maxHp)
            : guestEffect?.kind === 'guaranteed-critical' ? !heroTargetCandidates.some((hero) => hero.id === selectedHeroTargetId) : false;
        const weaknessEffect = action.effects.some((effect) => effect.type === 'expose-weakness');
        const healingEffect = action.effects.find((effect) => effect.type === 'healing');
        const stanceEffect = action.effects.find((effect) => effect.type === 'toggle-stance');
        const summonEffect = action.effects.find((effect) => effect.type === 'summon-allies');
        const acEffect = action.effects.find((effect) => effect.type === 'modify-ac');
        const attackEffect = action.effects.find((effect) => effect.type === 'modify-attack');
        const statEffect = action.effects.find((effect) => effect.type === 'modify-stat');
        const cleanseEffect = action.effects.find((effect) => effect.type === 'remove-negative-conditions');
        const areaSavingThrow = action.effects.find((effect) => effect.type === 'area-saving-throw');
        const statusEffect = action.effects.find((effect) => effect.type === 'apply-status');
        const areaDamage = action.effects.find((effect) => effect.type === 'area-damage');
        const heatBonus = areaDamage?.damageType === 'fire' && actionActor.id === 'golovach-lena'
          ? getFirstCombatStatus(combat, actionActor.id, 'heat-charge')?.amount ?? 0 : 0;
        const areaDice = areaDamage && parseDiceExpression(areaDamage.damage);
        const areaDamageExpression = areaDice && heatBonus
          ? formatDiceExpression({...areaDice, modifier: areaDice.modifier + heatBonus}) : areaDamage?.damage;
        const rollTable = action.effects.find((effect) => effect.type === 'roll-table');
        const effectRows = rollTable?.outcomes.map((outcome) => ({
          label: `${outcome.min}${outcome.max !== outcome.min ? `–${outcome.max}` : ''}`,
          description: outcome.label,
        }));
        const passiveEffect = action.effects.find((effect) => effect.type === 'passive');
        const replaceAttackEffect = action.effects.find((effect) => effect.type === 'replace-attack');
        const healingTarget = action.target === 'self'
          ? party.find((participant) => participant.id === actionActor.id)
          : party.find((participant) => participant.id === selectedHeroTargetId);
        const healingTargetFull = Boolean(healingEffect && healingTarget && healingTarget.hp >= healingTarget.maxHp);
        const healingOnly = Boolean(healingEffect && action.effects.every((effect) => effect.type === 'healing'));
        const stanceActive = Boolean(stanceEffect && combat.stances[actionActor.id]?.includes(stanceEffect.stance));
        const returningFromTinyForm = stanceEffect?.stance === 'tiny' && stanceActive;
        const effectLabel = enemyArea ? `${enemyArea.damage} всем героям в сознании · без спасброска`
          : enemyCrown ? `+${enemyCrown.acBonus} AC · бросок ${enemyCrown.retaliationDice} сохранит урон ответного осколка`
          : enemySave
          ? `${enemyTargets.map((hero) => hero.name).join(', ')} · ${combatStatLabels[enemySave.stat]} DC ${enemySave.dc}${enemySave.damage ? ` · ${enemySave.damage}, при успехе половина` : ` · провал: помеха; успех: +${enemySave.successAttackBonus} к атаке по Нетаку`}`
          : enemySummon ? `${enemySummon.count} ассистента · ${enemySummon.unit.hp} HP · AC ${enemySummon.unit.ac} · ${enemySummon.turns} хода каждого`
          : guestEffect
          ? guestEffect.kind === 'grease-trap' ? 'Следующая атака Нетака отражается в него самого'
            : guestEffect.kind === 'healing-note' ? `Всем героям +${guestEffect.dice} HP, не выше максимума`
              : 'Следующая атака выбранного героя по Нетаку — гарантированный крит'
          : weaknessEffect
          ? (selectedTarget?.ac ?? encounter.ac) <= encounter.weakness.reducedAc
            ? `Слабость раскрыта: AC цели ${selectedTarget?.ac ?? encounter.weakness.reducedAc}`
            : `Следующая атака: AC цели ${selectedTarget?.ac ?? encounter.ac} → ${encounter.weakness.reducedAc}`
          : healingEffect
            ? `Лечение: ${healingEffect.dice ?? `${healingEffect.amount ?? 0} HP`}${attackEffect ? ` · ${attackEffect.recipients === 'self' ? 'герою' : attackEffect.recipients === 'selected-ally' ? 'союзнику' : 'команде'} +${attackEffect.amount} к атаке` : cleanseEffect ? ' · снимает негативные эффекты' : ''}`
            : stanceEffect?.stance === 'airborne'
              ? stanceActive ? 'Приземлиться; действие сохраняется' : 'Взлететь и дать наземным врагам помеху'
              : stanceEffect?.stance === 'tiny'
                ? returningFromTinyForm
                  ? 'Бонусное действие: вернуть обычный рост и убрать −2 к атакам'
                  : 'Бонусное действие: принять малый облик с −2 к атакам'
                : summonEffect
                  ? `${summonEffect.countDice} союзников на ${summonEffect.durationRounds} раунда`
                  : acEffect
                    ? `${action.target === 'self' ? 'Герою' : action.target === 'ally' ? 'Выбранному союзнику' : 'Всем героям'} +${acEffect.amount} AC до следующего хода`
                    : attackEffect
                      ? `${attackEffect.recipients === 'self' ? 'Герою' : attackEffect.recipients === 'selected-ally' ? 'Союзнику' : 'Команде'} +${attackEffect.amount} к атаке`
                      : areaSavingThrow
                        ? `${action.target === 'enemy' ? 'Бросок цели' : 'Общий бросок врагов'}: ${areaSavingThrow.dc}+ — ${getAreaOutcomeLabel(areaSavingThrow.successConditions ?? [], areaSavingThrow.successStatus)}; 1–${areaSavingThrow.dc - 1} — ${getAreaOutcomeLabel(areaSavingThrow.failureConditions, areaSavingThrow.failureStatus)}`
                        : areaDamage
                          ? `До ${areaDamage.maxTargets} целей · ${areaDamageExpression}${heatBonus ? ` (жар +${heatBonus} учтён)` : ''} · спасбросок ${areaDamage.savingThrow.dc}, при успехе ${areaDamage.savingThrow.halfOnSuccess ? 'половина урона' : 'без урона'}`
                          : rollTable
                            ? `Результат броска ${rollTable.dice}`
                            : statusEffect
                              ? getCombatStatusPresentation({
                                  id: 'preview',
                                  kind: statusEffect.status,
                                  sourceActorId: actionActor.id,
                                  targetId: actionActor.id,
                                  charges: statusEffect.charges ?? 1,
                                  amount: statusEffect.amount,
                                }).label
                        : statEffect
                          ? `${combatStatLabels[statEffect.stat]} +${statEffect.amount} до конца боя${cleanseEffect ? ' · снимает негативные эффекты' : ''}`
                    : replaceAttackEffect
                      ? `Атака +${replaceAttackEffect.attack.bonus}, урон ${replaceAttackEffect.attack.damage}`
                      : passiveEffect?.label ?? 'Особый боевой эффект';
        const rollExpression = enemyArea?.damage ?? enemyCrown?.retaliationDice ?? enemySave?.damage ?? guestEffect?.dice ?? action.check?.dice
          ?? rollTable?.dice
          ?? areaDamageExpression
          ?? healingEffect?.dice
          ?? summonEffect?.countDice
          ?? (areaSavingThrow ? '1d20' : undefined);
        const passive = activation === 'passive';
        const limitedReaction = passive ? action.effects.find((effect) => effect.type === 'apply-status'
          && ['helping-reaction', 'tech-recalculation', 'survival-instinct', 'northern-ward'].includes(effect.status)) : undefined;
        const reactionCharges = limitedReaction?.type === 'apply-status'
          ? combat.statuses.find((status) => status.targetId === actionActor.id && status.kind === limitedReaction.status)?.charges ?? 0
          : undefined;
        return {
          id: action.id,
          artwork: action.artwork,
          source: action.source,
          name: returningFromTinyForm ? 'Вернуться к обычному росту' : action.name,
          description: returningFromTinyForm
            ? 'Линда завершает малый облик, возвращается к обычному росту и снимает штраф −2 к атакам.'
            : action.description,
          effectLabel,
          effectRows,
          activation,
          active: stanceActive,
          attackModifier: activation === 'attack',
          requiresRoll: Boolean(rollExpression),
          rollExpression,
          rollOwnerLabel: rollExpression
            ? areaSavingThrow
              ? 'Мастер за всех противников · один общий d20'
              : actionActor.name
            : undefined,
          target: action.target,
          uses,
          maxUses: action.uses.max,
          cost: getCombatActionCost(action, activation, uses, item, reactionCharges),
          mechanicsHelp: createCombatMechanicsHelp(action, {
            stanceActive,
            weaknessReducedAc: encounter.weakness.reducedAc,
          }),
          skillVideo: stanceActive ? action.deactivationVideo : action.skillVideo,
          disabled: guestBlocked || !sourceAvailable || (healingTargetFull && healingOnly),
          disabledReason: guestBlocked ? guestEffect?.kind === 'grease-trap' ? 'Выберите лорда Нетака' : guestEffect?.kind === 'healing-note' ? 'Здоровье всех героев полное' : 'Выберите героя в сознании' : passive
            ? 'Не требует отдельного хода — нажмите для описания'
            : uses >= action.uses.max
              ? 'Использован'
              : action.source === 'item' && (!item || item.quantity <= 0 || item.ownerId !== action.characterId)
                ? 'Предмет не принадлежит герою'
                : action.source === 'item' && item && item.maxCharges !== null && item.charges <= 0
                  ? 'Заряды закончились'
              : healingTargetFull && healingOnly ? 'HP уже полны' : undefined,
        };
      })
    : [];
  const selectedActionViews = actionViews.filter((action) => combat.selectedActionIds.includes(action.id));
  const utilityAction = selectedActionViews.find((action) => (
    action.activation !== 'attack' && action.activation !== 'passive'
  ));
  const attackEnhancements = [
    ...(activeEnemy && combat.statuses.some((status) => status.targetId === active.id && ['confused', 'beast-challenge'].includes(status.kind))
      ? [`Эффект меняет цель атаки: ${selectedTarget?.name ?? 'цель недоступна'}.`] : []),
    ...(activeHero && combat.weaknessExposed
      ? [`Слабость раскрыта: AC цели ${selectedTarget?.ac ?? encounter.weakness.reducedAc}`]
      : []),
    ...(activeHero && combat.stances[activeHero.id]?.includes('airborne')
      ? ['Полёт: наземные противники атакуют Линду с помехой']
      : []),
    ...(activeHero && combat.stances[activeHero.id]?.includes('tiny')
      ? ['Малый облик: −2 к текущей атаке']
      : []),
    ...selectedActionViews
      .filter((action) => action.attackModifier)
      .map((action) => (
        `${action.source === 'ability' ? 'Навык' : 'Предмет'} · ${action.name} · ${action.effectLabel.replace(/^Следующая атака: /u, '')}`
      )),
    ...combat.attackModifiers
      .filter((modifier) => (
        modifier.targetIds.includes(active.id)
        && (!modifier.againstTargetIds?.length || modifier.againstTargetIds.includes(selectedTargetId))
      ))
      .map((modifier) => `Временное усиление: +${modifier.amount} к атаке`),
    ...(activeHero ? (combat.statuses ?? [])
      .filter((status) => status.targetId === activeHero.id && [
        'attack-advantage',
        'guided-turn',
        'commanded-strike',
        'inspired',
        'bonus-damage',
        'critical-focus',
        'guest-critical',
        'dive-ready',
        'heat-charge',
      ].includes(status.kind) && (!status.againstTargetId || status.againstTargetId === selectedTargetId))
      .map((status) => getCombatStatusPresentation(status).label) : []),
  ].filter((enhancement, index, all) => all.indexOf(enhancement) === index);
  const selectedResolvedTarget = targets.find((target) => target.id === selectedTargetId);
  const activeAttack = activeHero
    ? replacementAttack?.attack
      ?? encounter.heroAttacks.find((attack) => attack.characterId === activeHero.id)
    : activeAlly?.attack ?? replacementAttack?.attack ?? activeEnemy?.attack;

  return {
    encounter,
    active: {...active, attackName: combat.pendingAttack?.attackName
      ?? combat.pendingSavingThrow?.enemySkill?.actionName
      ?? combat.pendingSavingThrow?.areaDamage?.actionName
      ?? combat.pendingSavingThrow?.actionName
      ?? utilityAction?.name ?? active.attackName},
    activeHero,
    activeAlly,
    actions: actionViews,
    attackRollMode: selectedResolvedTarget && activeAttack
      ? getCombatAttackRollMode(
          combat,
          active.id,
          selectedResolvedTarget.id,
          getCombatAttackRange(activeAttack),
        )
      : 'normal',
    attackEnhancements,
    equippedItemId: activeHero ? combat.equippedItems[activeHero.id] ?? '' : '',
    enemyTargets,
    party,
    participants: combat.initiativeOrder
      .map((id) => participantById.get(id))
      .filter((participant): participant is CombatantView => Boolean(participant)),
    selectedHeroTargetId,
    selectedTarget: selectedResolvedTarget,
    selectedTargetId,
    supportTargets: utilityAction?.target === 'ally' ? heroTargetCandidates : [],
    targets,
    utilityAction,
    victory: isCombatVictory(combat),
  };
}
