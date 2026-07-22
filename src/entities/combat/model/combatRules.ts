import {getDamageRoll, getRawDiceRange, resolveDamageTotal} from '../../../shared/lib/dice/diceExpression';
import type {
  CombatDefinition,
  CombatEncounterDefinition,
  CombatEvent,
  CombatHeroSource,
  CombatPendingAttack,
  CombatState,
} from './types';

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
  })), ...enemyUnits.map((unit) => ({
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
): CombatState {
  const units = encounter.units?.length
    ? encounter.units
    : [{id: encounter.id, name: encounter.name}];
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
    weaknessExposed: false,
    actionUses: {},
    equippedItems: {},
    selectedActionIds: [],
    initiativeOrder,
    turnIndex: 0,
    round: 1,
    pendingAttack: null,
    log: [encounter.startText ?? 'Инициатива определена.'],
  };
}

export function advanceCombatTurn(combat: CombatState, heroHp: Record<string, number>) {
  if (!combat.initiativeOrder.length) return combat;
  let nextIndex = combat.turnIndex;
  let round = combat.round;

  for (let step = 0; step < combat.initiativeOrder.length; step += 1) {
    nextIndex = (nextIndex + 1) % combat.initiativeOrder.length;
    if (nextIndex === 0) round += 1;
    const participantId = combat.initiativeOrder[nextIndex];
    if ((combat.enemies[participantId]?.hp ?? 0) > 0 || (heroHp[participantId] ?? 0) > 0) break;
  }

  return {...combat, turnIndex: nextIndex, round};
}

export function applyCombatEvent(
  combat: CombatState | null,
  heroHp: Record<string, number>,
  event: CombatEvent,
  definition: CombatDefinition,
) {
  if (event.type === 'combat-started') {
    const encounter = definition.encounters.find((item) => item.id === event.encounterId);
    return {combat: encounter ? createCombatState(encounter, event.initiativeOrder) : combat, heroHp};
  }
  if (!combat) return {combat, heroHp};

  switch (event.type) {
    case 'combat-attack-resolved': return {
      heroHp,
      combat: {
        ...combat,
        pendingAttack: event.hit ? event.attack : null,
        log: [...combat.log, event.text],
      },
    };
    case 'combat-damage-resolved': {
      const enemy = combat.enemies[event.targetId];
      if (enemy) return {
        heroHp,
        combat: {
          ...combat,
          pendingAttack: null,
          enemies: {
            ...combat.enemies,
            [event.targetId]: {...enemy, hp: Math.max(0, enemy.hp - event.amount)},
          },
          log: [...combat.log, event.text],
        },
      };
      return {
        heroHp: {...heroHp, [event.targetId]: Math.max(0, (heroHp[event.targetId] ?? 0) - event.amount)},
        combat: {...combat, pendingAttack: null, log: [...combat.log, event.text]},
      };
    }
    case 'healing-applied': return {
      heroHp: {
        ...heroHp,
        [event.targetId]: Math.min(event.maxHp, (heroHp[event.targetId] ?? 0) + event.amount),
      },
      combat: {...combat, log: [...combat.log, event.text]},
    };
    case 'combat-action-used': return {
      heroHp,
      combat: {
        ...combat,
        actionUses: {
          ...combat.actionUses,
          [event.actionId]: (combat.actionUses[event.actionId] ?? 0) + 1,
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
    case 'combat-weakness-exposed': {
      const reducedAc = definition.encounters.find((encounter) => encounter.id === combat.encounterId)
        ?.weakness.reducedAc;
      return {
        heroHp,
        combat: {
          ...combat,
          weaknessExposed: true,
          enemies: Object.fromEntries(Object.entries(combat.enemies).map(([enemyId, enemy]) => [
            enemyId,
            {...enemy, ac: reducedAc ?? enemy.ac},
          ])),
          log: [...combat.log, event.text],
        },
      };
    }
    case 'turn-advanced': return {
      heroHp,
      combat: advanceCombatTurn({...combat, pendingAttack: null, selectedActionIds: []}, heroHp),
    };
    case 'combat-ended': return {
      heroHp,
      combat: {...combat, pendingAttack: null, selectedActionIds: [], log: [...combat.log, event.text]},
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
  return resolveDamageTotal(parsed, rawTotal) ?? 0;
}

export function getPendingDamageRange(attack: CombatPendingAttack) {
  const damage = getDamageRoll(attack.damageExpression, attack.critical);
  return damage ? getRawDiceRange(damage) : null;
}

export function resolvePendingDamage(attack: CombatPendingAttack, rawDiceTotal: number) {
  const damage = getDamageRoll(attack.damageExpression, attack.critical);
  if (!damage) return null;
  const amount = resolveDamageTotal(damage, rawDiceTotal);
  return amount === null ? null : {amount, dice: damage};
}
