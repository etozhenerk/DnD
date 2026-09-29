import {isCombatCreature, isCombatVictory, releaseDefeatedPrisoners} from './combatObjectives.ts';
import {
  getDamageRoll,
  getRawDicePoolRange,
  parseDiceExpression,
} from '../../../shared/lib/dice/diceExpression.ts';
import type {
  CombatActionDefinition,
  CombatAttackRange,
  CombatDefinition,
  CombatEncounterDefinition,
  CombatEvent,
  CombatHeroSource,
  CombatPendingAttack,
  CombatRollMode,
  CombatState,
  CombatStat,
  CombatStatusState,
} from './types';
import {getFirstCombatStatus, getCombatStatusPresentation} from './combatStatus.ts';

const rangedAttackIds = new Set([
  'access-denied-pulse',
]);

export function getCombatEnemyAc(combat: CombatState, enemyId: string): number {
  return (combat.enemies[enemyId]?.ac ?? 0) + (getFirstCombatStatus(combat, enemyId, 'retaliating-crown')?.amount ?? 0);
}

/**
 * `range` is optional for backwards compatibility with the published campaign data.
 * The legacy Penisuela attacks have stable ids/names, so the fallback keeps their
 * established fiction mechanical until the canonical data can declare range itself.
 */
export function getCombatAttackRange(attack: {
  id?: string;
  characterId?: string;
  name: string;
  range?: CombatAttackRange;
}): CombatAttackRange {
  if (attack.range) return attack.range;
  if (attack.characterId === 'lambert' || (attack.id && rangedAttackIds.has(attack.id))) return 'ranged';
  if (/лук|выстрел|пыльц|импульс/u.test(attack.name.toLocaleLowerCase('ru-RU'))) return 'ranged';
  return 'melee';
}

export function rollDie(sides: number) {
  return Math.floor(Math.random() * sides) + 1;
}

export function createCombatInitiative(
  encounter: CombatEncounterDefinition,
  heroes: CombatHeroSource[],
  roll: (sides: number) => number = rollDie,
) {
  const enemyUnits = encounter.units?.length
    ? encounter.units
    : [{id: encounter.id, name: encounter.name}];
  return [...heroes.map((hero) => ({
    id: hero.id,
    score: roll(20) + (hero.stats.dexterity ?? 0),
    dexterity: hero.stats.dexterity ?? 0,
  })), ...enemyUnits.filter(isCombatCreature).map((unit) => ({
    id: unit.id,
    score: roll(20) + (unit.initiative ?? encounter.initiative),
    dexterity: unit.initiative ?? encounter.initiative,
  }))]
    .sort((a, b) => b.score - a.score || b.dexterity - a.dexterity || a.id.localeCompare(b.id))
    .map((participant) => participant.id);
}

export function createCombatState(
  encounter: CombatEncounterDefinition,
  initiativeOrder: string[],
  definition?: CombatDefinition,
): CombatState {
  const units = encounter.units?.length
    ? encounter.units
    : [{id: encounter.id, name: encounter.name}];
  const initialStatuses: CombatStatusState[] = (definition?.combatActions ?? [])
    .filter((action: CombatActionDefinition) => (
      action.encounterIds.includes(encounter.id)
      && action.activation === 'passive'
      && initiativeOrder.includes(action.characterId)
    ))
    .flatMap((action) => [
      ...action.effects.flatMap((effect) => (
        effect.type === 'apply-status' && effect.recipients === 'self'
          ? [{
            id: `${action.id}-${action.characterId}-${effect.status}`,
            kind: effect.status,
            sourceActorId: action.characterId,
            targetId: action.characterId,
            charges: effect.charges ?? 1,
            amount: effect.amount,
          }]
          : []
      )),
      ...(action.sourceId === 'dragonborn-armour' ? [{
        id: `${action.id}-${action.characterId}-dragonborn-armour`,
        kind: 'dragonborn-armour' as const,
        sourceActorId: action.characterId,
        targetId: action.characterId,
        charges: 1,
      }] : []),
    ]);
  return {
    encounterId: encounter.id,
    enemies: Object.fromEntries(units.map((unit) => [unit.id, {
      ...unit,
      hp: unit.hp ?? unit.maxHp ?? encounter.hp,
      maxHp: unit.maxHp ?? unit.hp ?? encounter.hp,
      ac: unit.ac ?? encounter.ac,
      initiative: unit.initiative ?? encounter.initiative,
      attack: unit.attack ?? encounter.attack,
    }])),
    allies: {},
    weaknessExposed: false,
    weaknessOriginalAc: null,
    stances: {},
    conditions: {},
    acModifiers: [],
    attackModifiers: [],
    statModifiers: [],
    statuses: initialStatuses,
    actionUses: {},
    equippedItems: {},
    selectedActionIds: [],
    initiativeOrder: initiativeOrder.filter((id) => !units.some((unit) => unit.id === id && !isCombatCreature(unit))),
    turnIndex: 0,
    round: 1,
    pendingAttack: null,
    pendingSavingThrow: null,
    recentlySkippedParticipantIds: [],
    log: [encounter.startText ?? 'Инициатива определена.'],
  };
}

export function isCombatAllyActive(combat: CombatState, allyId: string) {
  const ally = combat.allies[allyId];
  return Boolean(ally && ally.hp > 0 && ally.expiresAfterRound >= combat.round && (ally.remainingTurns ?? 1) > 0);
}

export function getCombatHeroAc(
  combat: CombatState,
  hero: CombatHeroSource,
  incomingAttackRange?: CombatAttackRange,
) {
  const stanceModifier = combat.stances[hero.id]?.includes('tiny') ? 3 : 0;
  const armourModifier = incomingAttackRange === 'melee'
    && Boolean(getFirstCombatStatus(combat, hero.id, 'dragonborn-armour'))
    ? 2
    : 0;
  return hero.ac + stanceModifier + armourModifier + combat.acModifiers
    .filter((modifier) => modifier.targetIds.includes(hero.id))
    .reduce((total, modifier) => total + modifier.amount, 0);
}

export function getCombatAttackBonusModifier(
  combat: CombatState,
  participantId: string,
  targetId?: string,
) {
  const stanceModifier = combat.stances[participantId]?.includes('tiny') ? -2 : 0;
  const statusModifier = getFirstCombatStatus(combat, participantId, 'jammed') ? -2 : 0;
  const actionModifier = combat.attackModifiers
    .filter((modifier) => (
      modifier.targetIds.includes(participantId)
      && (!modifier.againstTargetIds?.length || Boolean(targetId && modifier.againstTargetIds.includes(targetId)))
    ))
    .reduce((total, modifier) => total + modifier.amount, 0);
  return stanceModifier + statusModifier + actionModifier;
}

export function getCombatStatModifier(
  combat: CombatState,
  participantId: string,
  stat: CombatStat,
) {
  return combat.statModifiers
    .filter((modifier) => modifier.targetId === participantId && modifier.stat === stat)
    .reduce((total, modifier) => total + modifier.amount, 0);
}

export function getCombatAttackRollMode(
  combat: CombatState,
  actorId: string,
  targetId: string,
  _attackRange: CombatAttackRange = 'melee',
): CombatRollMode {
  const actorDisadvantaged = (combat.conditions[actorId] ?? []).some((condition) => (
    condition === 'blinded' || condition === 'attack-disadvantage'
  )) || Boolean(
    getFirstCombatStatus(combat, actorId, 'beast-challenge')
    || (
      getFirstCombatStatus(combat, actorId, 'confused')
      && Object.values(combat.enemies).filter((enemy) => isCombatCreature(enemy) && enemy.hp > 0).length <= 1
    )
  );
  const actorAdvantaged = Boolean(
    getFirstCombatStatus(combat, actorId, 'attack-advantage')
    || getFirstCombatStatus(combat, actorId, 'guided-turn')
    || getFirstCombatStatus(combat, actorId, 'commanded-strike')
  );
  const targetAirborne = combat.stances[targetId]?.includes('airborne') ?? false;
  const targetProne = combat.conditions[targetId]?.includes('prone') ?? false;
  const advantage = actorAdvantaged || targetProne;
  const disadvantage = actorDisadvantaged || targetAirborne;
  if (advantage && !disadvantage) return 'advantage';
  if (!advantage && disadvantage) return 'disadvantage';
  return 'normal';
}

/** The preview and the command must resolve compulsory targets identically. */
export function getCombatEnemyTargetId(combat: CombatState, actorId: string, targetId: string, heroHp: Record<string, number>) {
  const confused = getFirstCombatStatus(combat, actorId, 'confused');
  const otherEnemy = confused && Object.values(combat.enemies).find((enemy) => isCombatCreature(enemy) && enemy.id !== actorId && enemy.hp > 0);
  const challenger = getFirstCombatStatus(combat, actorId, 'beast-challenge')?.sourceActorId;
  return otherEnemy ? otherEnemy.id : challenger && (heroHp[challenger] ?? 0) > 0 ? challenger : targetId;
}

export function advanceCombatTurn(
  combat: CombatState,
  heroHp: Record<string, number>,
  unavailableParticipantIds: ReadonlySet<string> = new Set(),
) {
  if (!combat.initiativeOrder.length) return combat;
  let allies = combat.allies;
  let enemies = combat.enemies;
  const departingNames: string[] = [];
  const consumeTurn = (id: string) => {
    const enemy = enemies[id];
    if (enemy?.remainingTurns !== undefined && enemy.remainingTurns > 0) {
      enemies = {...enemies, [id]: {...enemy, remainingTurns: enemy.remainingTurns - 1, hp: enemy.remainingTurns === 1 ? 0 : enemy.hp}};
      if (enemy.remainingTurns === 1) departingNames.push(enemy.name);
    }
    const ally = allies[id];
    if (ally?.remainingTurns !== undefined && ally.remainingTurns > 0) {
      allies = {...allies, [id]: {...ally, remainingTurns: ally.remainingTurns - 1}};
      if (ally.remainingTurns === 1) departingNames.push(ally.name);
    }
  };
  consumeTurn(combat.initiativeOrder[combat.turnIndex]);
  let nextIndex = combat.turnIndex;
  let round = combat.round;
  let conditions = combat.conditions;
  const statuses = (combat.statuses ?? []).filter((status) => status.kind !== 'movement-spent');
  const skippedParticipantIds: string[] = [];
  const skippedParticipantNames: string[] = [];

  for (let step = 0; step < combat.initiativeOrder.length; step += 1) {
    nextIndex = (nextIndex + 1) % combat.initiativeOrder.length;
    if (nextIndex === 0) round += 1;
    const participantId = combat.initiativeOrder[nextIndex];
    const participantConditions = conditions[participantId] ?? [];
    if (participantConditions.includes('stunned')) {
      consumeTurn(participantId);
      skippedParticipantIds.push(participantId);
      skippedParticipantNames.push(
        combat.enemies[participantId]?.name
          ?? combat.allies[participantId]?.name
          ?? participantId,
      );
      conditions = {
        ...conditions,
        [participantId]: participantConditions.filter((condition) => (
          condition !== 'stunned' && condition !== 'prone'
        )),
      };
      continue;
    }
    if (participantConditions.includes('prone')) {
      conditions = {
        ...conditions,
        [participantId]: participantConditions.filter((condition) => condition !== 'prone'),
      };
    }
    if (
      !unavailableParticipantIds.has(participantId)
      && (
        (isCombatCreature(enemies[participantId] ?? {}) && (enemies[participantId]?.hp ?? 0) > 0)
        || (heroHp[participantId] ?? 0) > 0
        || (
          (allies[participantId]?.hp ?? 0) > 0
          && (allies[participantId]?.remainingTurns ?? 1) > 0
          && (allies[participantId]?.expiresAfterRound ?? 0) >= round
        )
      )
    ) break;
  }

  return {
    ...combat,
    allies,
    enemies,
    turnIndex: nextIndex,
    round,
    conditions,
    statuses,
    recentlySkippedParticipantIds: skippedParticipantIds,
    log: skippedParticipantNames.length > 0 || departingNames.length > 0
      ? [
          ...combat.log,
          ...departingNames.map((name) => `${name}: отведённые ходы завершены. Покидает очередь.`),
          ...(skippedParticipantNames.length ? [`Состояние: ${skippedParticipantNames.join(', ')} ${skippedParticipantNames.length === 1 ? 'пропускает' : 'пропускают'} следующее действие.`] : []),
        ]
      : combat.log,
  };
}

function reduceCombatEvent(
  combat: CombatState | null,
  heroHp: Record<string, number>,
  event: CombatEvent,
  definition: CombatDefinition,
  unavailableParticipantIds: ReadonlySet<string> = new Set(),
) {
  if (event.type === 'combat-started') {
    const encounter = definition.encounters.find((item) => item.id === event.encounterId);
    return {combat: encounter ? createCombatState(encounter, event.initiativeOrder, definition) : combat, heroHp};
  }
  if (!combat) return {combat, heroHp};
  if (event.type === 'combat-cleared') {
    return {
      combat: event.encounterId === combat.encounterId ? null : combat,
      heroHp,
    };
  }

  switch (event.type) {
    case 'combat-attack-resolved': return {
      heroHp,
      combat: {
        ...combat,
        attackModifiers: combat.attackModifiers.flatMap((modifier) => (
          modifier.consumeOnAttack
          && modifier.targetIds.includes(event.attack.actorId)
          && (!modifier.againstTargetIds?.length || modifier.againstTargetIds.includes(event.attack.targetId))
        ) ? modifier.targetIds.filter((id) => id !== event.attack.actorId).length
          ? [{...modifier, targetIds: modifier.targetIds.filter((id) => id !== event.attack.actorId)}] : []
          : [modifier]),
        pendingAttack: event.hit ? event.attack : null,
        log: [...combat.log, event.text],
      },
    };
    case 'combat-attack-cancelled': return {
      heroHp,
      combat: {...combat, pendingAttack: null, log: [...combat.log, event.text]},
    };
    case 'combat-damage-resolved': {
      let statuses = combat.statuses ?? [];
      let remainingDamage = event.amount;
      const temporaryHpStatuses = statuses.filter((status) => (
        status.targetId === event.targetId && status.kind === 'temporary-hp' && (status.amount ?? 0) > 0
      ));
      let absorbed = 0;
      temporaryHpStatuses.forEach((status) => {
        if (remainingDamage <= 0) return;
        const available = status.amount ?? 0;
        const used = Math.min(available, remainingDamage);
        absorbed += used;
        remainingDamage -= used;
        statuses = available === used
          ? statuses.filter((candidate) => candidate.id !== status.id)
          : statuses.map((candidate) => candidate.id === status.id
            ? {...candidate, amount: available - used}
            : candidate);
      });
      const enemy = combat.enemies[event.targetId];
      if (enemy) return {
        heroHp,
        combat: {
          ...combat,
          pendingAttack: null,
          enemies: {
            ...Object.fromEntries(Object.entries(combat.enemies).map(([id, unit]) => [id, unit.summonedBy === enemy.id && enemy.hp <= remainingDamage ? {...unit, hp: 0} : unit])),
            [event.targetId]: {...enemy, hp: Math.max(0, enemy.hp - remainingDamage)},
          },
          statuses,
          log: [...combat.log, event.text, ...(absorbed ? [`Временные HP поглощают ${absorbed} урона.`] : [])],
        },
      };
      const ally = combat.allies[event.targetId];
      if (ally) return {
        heroHp,
        combat: {
          ...combat,
          pendingAttack: null,
          allies: {
            ...combat.allies,
            [event.targetId]: {...ally, hp: Math.max(0, ally.hp - remainingDamage)},
          },
          statuses,
          log: [...combat.log, event.text, ...(absorbed ? [`Временные HP поглощают ${absorbed} урона.`] : [])],
        },
      };
      const currentHeroHp = heroHp[event.targetId] ?? 0;
      const survival = getFirstCombatStatus({...combat, statuses}, event.targetId, 'survival-instinct');
      const lastPush = getFirstCombatStatus({...combat, statuses}, event.targetId, 'last-push');
      const lethal = currentHeroHp > 0 && currentHeroHp - remainingDamage <= 0;
      if (lethal && survival) {
        statuses = statuses.filter((status) => status.id !== survival.id
          && !(status.targetId === event.targetId && getCombatStatusPresentation(status).tone === 'negative'));
      }
      const protectedHp = lethal && (survival || lastPush)
        ? 1
        : Math.max(0, currentHeroHp - remainingDamage);
      return {
        heroHp: {...heroHp, [event.targetId]: protectedHp},
        combat: {
          ...combat,
          statuses,
          conditions: lethal && survival
            ? {...combat.conditions, [event.targetId]: []}
            : combat.conditions,
          pendingAttack: null,
          log: [
            ...combat.log,
            event.text,
            ...(absorbed ? [`Временные HP поглощают ${absorbed} урона.`] : []),
            ...(lethal && survival ? ['Воля жизни срабатывает: Линда остаётся на 1 HP и сбрасывает негативные эффекты.'] : []),
            ...(lethal && !survival && lastPush ? ['Рабочий пульс не даёт Торину упасть ниже 1 HP.'] : []),
          ],
        },
      };
    }
    case 'healing-applied': {
      const ally = combat.allies[event.targetId];
      if (ally) return {
        heroHp,
        combat: {
          ...combat,
          allies: {
            ...combat.allies,
            [event.targetId]: {
              ...ally,
              hp: Math.min(event.maxHp, ally.hp + event.amount),
            },
          },
          log: [...combat.log, event.text],
        },
      };
      return {
        heroHp: {
          ...heroHp,
          [event.targetId]: Math.min(event.maxHp, (heroHp[event.targetId] ?? 0) + event.amount),
        },
        combat: {...combat, log: [...combat.log, event.text]},
      };
    }
    case 'combat-action-used': return {
      heroHp,
      combat: {
        ...combat,
        actionUses: {
          ...combat.actionUses,
          [event.resourceKey]: (combat.actionUses[event.resourceKey] ?? 0) + 1,
        },
      },
    };
    case 'combat-action-selected': return {
      heroHp,
      combat: {
        ...combat,
        selectedActionIds: event.selected
          ? [...new Set([...combat.selectedActionIds, event.actionId])]
          : combat.selectedActionIds.filter((actionId) => actionId !== event.actionId),
      },
    };
    case 'combat-item-equipped': return {
      heroHp,
      combat: {
        ...combat,
        equippedItems: {...combat.equippedItems, [event.heroId]: event.actionId},
      },
    };
    case 'combat-stance-changed': {
      const current = combat.stances[event.participantId] ?? [];
      return {
        heroHp,
        combat: {
          ...combat,
          stances: {
            ...combat.stances,
            [event.participantId]: event.active
              ? [...new Set([...current, event.stance])]
              : current.filter((stance) => stance !== event.stance),
          },
          log: [...combat.log, event.text],
        },
      };
    }
    case 'combat-enemies-summoned': {
      // Give the party a full circuit to respond before newly summoned enemies act.
      const ids = event.enemies.map((enemy) => enemy.id);
      return {heroHp, combat: {...combat, enemies: {...combat.enemies, ...Object.fromEntries(event.enemies.map((enemy) => [enemy.id, enemy]))},
        initiativeOrder: [...combat.initiativeOrder.slice(0, combat.turnIndex), ...ids, ...combat.initiativeOrder.slice(combat.turnIndex)],
        turnIndex: combat.turnIndex + ids.length, log: [...combat.log, event.text]}};
    }
    case 'combat-allies-summoned': {
      const insertionIndex = combat.turnIndex + 1;
      return {
        heroHp,
        combat: {
          ...combat,
          allies: {
            ...combat.allies,
            ...Object.fromEntries(event.allies.map((ally) => [ally.id, ally])),
          },
          initiativeOrder: [
            ...combat.initiativeOrder.slice(0, insertionIndex),
            ...event.allies.map((ally) => ally.id),
            ...combat.initiativeOrder.slice(insertionIndex),
          ],
          log: [...combat.log, event.text],
        },
      };
    }
    case 'combat-ac-modifier-applied': return {
      heroHp,
      combat: {
        ...combat,
        acModifiers: [
          ...combat.acModifiers.filter((modifier) => modifier.id !== event.modifier.id),
          event.modifier,
        ],
        log: [...combat.log, event.text],
      },
    };
    case 'combat-attack-modifier-applied': return {
      heroHp,
      combat: {
        ...combat,
        attackModifiers: [
          ...combat.attackModifiers.filter((modifier) => modifier.id !== event.modifier.id),
          event.modifier,
        ],
        log: [...combat.log, event.text],
      },
    };
    case 'combat-stat-modifier-applied': return {
      heroHp,
      combat: {
        ...combat,
        statModifiers: [
          ...combat.statModifiers.filter((modifier) => modifier.id !== event.modifier.id),
          event.modifier,
        ],
        log: [...combat.log, event.text],
      },
    };
    case 'combat-status-applied': {
      // Accept old journals, but their retired stand-up penalty no longer has an effect.
      if (event.status.kind === 'movement-spent') return {heroHp, combat};
      const currentParticipantId = combat.initiativeOrder[combat.turnIndex];
      let initiativeOrder = combat.initiativeOrder;
      if (
        (event.status.kind === 'guided-turn' || event.status.kind === 'commanded-strike')
        && initiativeOrder.includes(event.status.sourceActorId)
        && initiativeOrder.includes(event.status.targetId)
        && event.status.sourceActorId !== event.status.targetId
      ) {
        const withoutTarget = initiativeOrder.filter((id) => id !== event.status.targetId);
        const sourceIndex = withoutTarget.indexOf(event.status.sourceActorId);
        initiativeOrder = [
          ...withoutTarget.slice(0, sourceIndex + 1),
          event.status.targetId,
          ...withoutTarget.slice(sourceIndex + 1),
        ];
      }
      return {
        heroHp,
        combat: {
          ...combat,
          statuses: [
            ...(combat.statuses ?? []).filter((status) => status.id !== event.status.id),
            event.status,
          ],
          initiativeOrder,
          turnIndex: Math.max(0, initiativeOrder.indexOf(currentParticipantId)),
          log: event.text ? [...combat.log, event.text] : combat.log,
        },
      };
    }
    case 'combat-status-removed': return {
      heroHp,
      combat: {
        ...combat,
        statuses: (combat.statuses ?? []).filter((status) => status.id !== event.statusId),
        log: event.text ? [...combat.log, event.text] : combat.log,
      },
    };
    case 'combat-saving-throw-requested': return {
      heroHp,
      combat: {...combat, pendingSavingThrow: event.savingThrow},
    };
    case 'combat-saving-throw-resolved': return {
      heroHp,
      combat: {...combat, pendingSavingThrow: null, log: [...combat.log, event.text]},
    };
    case 'combat-condition-changed': {
      const current = combat.conditions[event.participantId] ?? [];
      let statuses = combat.statuses ?? [];
      if (event.active && !event.bypassImmunity) {
        const sureFooted = event.condition === 'prone'
          ? getFirstCombatStatus({...combat, statuses}, event.participantId, 'bubis-balance')
          : undefined;
        if (sureFooted) {
          const advantageStatus: CombatStatusState = {
            id: `${sureFooted.id}-momentum`,
            kind: 'attack-advantage',
            sourceActorId: event.participantId,
            targetId: event.participantId,
            charges: 1,
          };
          return {
            heroHp,
            combat: {
              ...combat,
              statuses: [
                ...statuses.filter((status) => status.id !== advantageStatus.id),
                advantageStatus,
              ],
              log: [...combat.log, 'Баланс Бубис отменяет падение; следующая атака получает преимущество.'],
            },
          };
        }
        const ward = getFirstCombatStatus({...combat, statuses}, event.participantId, 'northern-ward');
        if (ward) {
          statuses = statuses.filter((status) => status.id !== ward.id);
          const temporaryHp: CombatStatusState = {
            id: `${ward.id}-temporary-hp`,
            kind: 'temporary-hp',
            sourceActorId: ward.sourceActorId,
            targetId: event.participantId,
            charges: 1,
            amount: 4,
          };
          return {
            heroHp,
            combat: {
              ...combat,
              statuses: [...statuses, temporaryHp],
              log: [...combat.log, 'Северная стойкость отменяет эффект контроля и даёт 4 временных HP.'],
            },
          };
        }
      }
      return {
        heroHp,
        combat: {
          ...combat,
          conditions: {
            ...combat.conditions,
            [event.participantId]: event.active
              ? [...new Set([...current, event.condition])]
              : current.filter((condition) => condition !== event.condition),
          },
          statuses,
          log: event.text ? [...combat.log, event.text] : combat.log,
        },
      };
    }
    case 'combat-weakness-exposed': {
      const reducedAc = definition.encounters.find((encounter) => encounter.id === combat.encounterId)
        ?.weakness.reducedAc;
      return {
        heroHp,
        combat: {
          ...combat,
          weaknessExposed: true,
          weaknessOriginalAc: combat.weaknessOriginalAc ?? Object.fromEntries(
            Object.entries(combat.enemies).map(([enemyId, enemy]) => [enemyId, enemy.ac]),
          ),
          enemies: Object.fromEntries(Object.entries(combat.enemies).map(([enemyId, enemy]) => [
            enemyId,
            isCombatCreature(enemy) ? {...enemy, ac: Math.min(enemy.ac, reducedAc ?? enemy.ac)} : enemy,
          ])),
          log: [...combat.log, event.text],
        },
      };
    }
    case 'combat-weakness-cleared': {
      const encounter = definition.encounters.find((candidate) => candidate.id === combat.encounterId);
      return {
        heroHp,
        combat: {
          ...combat,
          weaknessExposed: false,
          weaknessOriginalAc: null,
          enemies: Object.fromEntries(Object.entries(combat.enemies).map(([enemyId, enemy]) => [
            enemyId,
            {
              ...enemy,
              ac: !isCombatCreature(enemy) ? enemy.ac : event.ac
                ?? combat.weaknessOriginalAc?.[enemyId]
                ?? encounter?.units?.find((unit) => unit.id === enemyId)?.ac
                ?? encounter?.ac
                ?? enemy.ac,
            },
          ])),
          log: event.text ? [...combat.log, event.text] : combat.log,
        },
      };
    }
    case 'combat-log-added': return {
      heroHp,
      combat: {...combat, log: [...combat.log, event.text]},
    };
    case 'combat-phase-advanced': return {
      heroHp,
      combat: {
        ...combat,
        weaknessExposed: false,
        weaknessOriginalAc: null,
        pendingAttack: null,
        enemies: Object.fromEntries(Object.entries(combat.enemies).map(([enemyId, enemy]) => [
          enemyId,
          isCombatCreature(enemy) ? {...enemy, ac: event.ac, attack: event.attack} : enemy,
        ])),
        log: [...combat.log, event.text],
      },
    };
    case 'turn-advanced': {
      const advanced = advanceCombatTurn(
        {
          ...combat,
          equippedItems: {},
          pendingAttack: null,
          pendingSavingThrow: null,
          selectedActionIds: [],
        },
        heroHp,
        unavailableParticipantIds,
      );
      const activeParticipantId = advanced.initiativeOrder[advanced.turnIndex];
      const startedParticipantIds = new Set([
        ...(advanced.recentlySkippedParticipantIds ?? []),
        activeParticipantId,
      ]);
      const burningStatuses = (advanced.statuses ?? []).filter((status) => (
        status.kind === 'burning' && startedParticipantIds.has(status.targetId)
      ));
      const burningDamageByParticipant = burningStatuses.reduce((damageByParticipant, status) => {
        damageByParticipant.set(
          status.targetId,
          (damageByParticipant.get(status.targetId) ?? 0) + (status.amount ?? 0),
        );
        return damageByParticipant;
      }, new Map<string, number>());
      const hadLivingEnemy = !isCombatVictory(advanced);
      let afterBurning = {combat: advanced, heroHp};
      burningDamageByParticipant.forEach((damage, participantId) => {
        const name = afterBurning.combat.enemies[participantId]?.name
          ?? afterBurning.combat.allies[participantId]?.name
          ?? participantId;
        const applied = applyCombatEvent(
          afterBurning.combat,
          afterBurning.heroHp,
          {
            id: `periodic-burning-${participantId}`,
            commandId: `periodic-burning-${participantId}`,
            type: 'combat-damage-resolved',
            targetId: participantId,
            amount: damage,
            text: `Горение наносит ${name} ${damage} огненного урона.`,
          },
          definition,
          unavailableParticipantIds,
        );
        if (applied.combat) afterBurning = {combat: applied.combat, heroHp: applied.heroHp};
      });
      const expiredAcModifiers = advanced.acModifiers.filter((modifier) => (
        startedParticipantIds.has(modifier.expiresAtTurnStartOf)
      ));
      const expiredAttackModifiers = advanced.attackModifiers.filter((modifier) => (
        Boolean(modifier.expiresAtTurnStartOf && startedParticipantIds.has(modifier.expiresAtTurnStartOf))
      ));
      const enemiesDefeated = hadLivingEnemy
        && isCombatVictory(afterBurning.combat);
      const settled = {
        heroHp: afterBurning.heroHp,
        combat: {
          ...afterBurning.combat,
          acModifiers: afterBurning.combat.acModifiers.filter((modifier) => (
            !startedParticipantIds.has(modifier.expiresAtTurnStartOf)
          )),
          attackModifiers: afterBurning.combat.attackModifiers.filter((modifier) => (
            !modifier.expiresAtTurnStartOf || !startedParticipantIds.has(modifier.expiresAtTurnStartOf)
          )),
          statuses: (afterBurning.combat.statuses ?? []).filter((status) => (
            status.kind !== 'burning' || !startedParticipantIds.has(status.targetId)
          )).filter((status) => (
            !status.expiresAtTurnStartOf || !startedParticipantIds.has(status.expiresAtTurnStartOf)
          )),
          log: [
            ...afterBurning.combat.log,
            ...(expiredAcModifiers.length > 0 || expiredAttackModifiers.length > 0
              ? ['Временные боевые усиления завершены.']
              : []),
            ...(enemiesDefeated
              ? [definition.encounters.find((candidate) => candidate.id === combat.encounterId)?.victoryText
                ?? 'Противники побеждены.']
              : []),
          ],
        },
      };
      const activeAfterBurning = settled.combat.initiativeOrder[settled.combat.turnIndex];
      const activeStillAvailable = !unavailableParticipantIds.has(activeAfterBurning) && (
        (settled.combat.enemies[activeAfterBurning]?.hp ?? 0) > 0
        || (settled.heroHp[activeAfterBurning] ?? 0) > 0
        || isCombatAllyActive(settled.combat, activeAfterBurning)
      );
      const anyoneAvailable = settled.combat.initiativeOrder.some((id) => !unavailableParticipantIds.has(id) && (
        (isCombatCreature(settled.combat.enemies[id] ?? {}) && (settled.combat.enemies[id]?.hp ?? 0) > 0)
        || (settled.heroHp[id] ?? 0) > 0 || isCombatAllyActive(settled.combat, id)
      ));
      if (!enemiesDefeated && !activeStillAvailable && anyoneAvailable) {
        return applyCombatEvent(
          settled.combat,
          settled.heroHp,
          {
            id: `periodic-skip-${activeAfterBurning}-${settled.combat.round}`,
            commandId: `periodic-skip-${activeAfterBurning}-${settled.combat.round}`,
            type: 'turn-advanced',
          },
          definition,
          unavailableParticipantIds,
        );
      }
      return settled;
    }
    case 'combat-ended': return {
      heroHp,
      combat: {
        ...combat,
        pendingAttack: null,
        pendingSavingThrow: null,
        selectedActionIds: [],
        log: [...combat.log, event.text],
      },
    };
  }
}

export function resolveAttackAgainstArmor(natural: number, bonus: number, targetAc: number) {
  if (!Number.isInteger(natural) || natural < 1 || natural > 20) return null;
  const total = natural + bonus;
  return {
    natural,
    bonus,
    total,
    targetAc,
    critical: natural === 20,
    hit: natural === 20 || (natural !== 1 && total >= targetAc),
  };
}

export function rollDamage(expression: string, critical = false) {
  const parsed = getDamageRoll(expression, critical);
  if (!parsed) return 0;
  const rawTotal = Array.from({length: parsed.count}, () => rollDie(parsed.sides))
    .reduce((sum, value) => sum + value, 0);
  return Math.max(0, rawTotal + parsed.modifier) * parsed.multiplier;
}

export function getPendingDamageRoll(attack: CombatPendingAttack) {
  const baseDamage = getDamageRoll(attack.damageExpression, attack.critical);
  if (!baseDamage) return null;
  const bonusDice = (attack.bonusDamageDice ?? []).map((bonus) => parseDiceExpression(bonus.expression));
  if (bonusDice.some((die) => !die || die.modifier !== 0)) return null;
  return {
    dice: [
      {count: baseDamage.count, sides: baseDamage.sides, modifier: 0},
      ...(bonusDice as NonNullable<(typeof bonusDice)[number]>[]),
    ],
    modifier: baseDamage.modifier,
    multiplier: baseDamage.multiplier,
  };
}

export function getPendingDamageRange(attack: CombatPendingAttack) {
  const damage = getPendingDamageRoll(attack);
  return damage ? getRawDicePoolRange(damage.dice) : null;
}

export function resolvePendingDamage(attack: CombatPendingAttack, rawDiceTotal: number) {
  const damage = getPendingDamageRoll(attack);
  if (!damage) return null;
  const range = getRawDicePoolRange(damage.dice);
  if (!Number.isInteger(rawDiceTotal) || rawDiceTotal < range.min || rawDiceTotal > range.max) return null;
  return {
    amount: Math.max(0, rawDiceTotal + damage.modifier) * damage.multiplier,
    dice: damage.dice,
    modifier: damage.modifier,
    multiplier: damage.multiplier,
  };
}

export function applyCombatEvent(
  combat: CombatState | null,
  heroHp: Record<string, number>,
  event: CombatEvent,
  definition: CombatDefinition,
  unavailableParticipantIds: ReadonlySet<string> = new Set(),
): {combat: CombatState | null; heroHp: Record<string, number>} {
  const result = reduceCombatEvent(combat, heroHp, event, definition, unavailableParticipantIds);
  return {...result, combat: result.combat ? releaseDefeatedPrisoners(result.combat) : null};
}
