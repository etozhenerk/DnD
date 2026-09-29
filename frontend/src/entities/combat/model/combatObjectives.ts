import type {CombatEnemyState, CombatState} from './types';

export function isCombatCreature(enemy: Pick<CombatEnemyState, 'kind'>) {
  return enemy.kind !== 'object';
}

export function isCombatVictory(combat: CombatState) {
  return Object.values(combat.enemies).filter((enemy) => isCombatCreature(enemy) && !enemy.summonedBy).every((enemy) => enemy.hp <= 0);
}

/** Derived from HP so attacks, area damage and GM corrections share one rescue rule. */
export function releaseDefeatedPrisoners(combat: CombatState): CombatState {
  const prisons = Object.values(combat.enemies).filter((enemy) => (
    enemy.kind === 'object' && enemy.hp <= 0 && enemy.releaseAlly
    && !combat.allies[enemy.releaseAlly.id]
  ));
  if (!prisons.length) return combat;
  const allies = prisons.map((prison) => {
    const ally = prison.releaseAlly!;
    return {
      ...ally,
      ownerId: prison.id,
      maxHp: ally.hp,
      initiative: 0,
      expiresAfterRound: 99_999,
      remainingTurns: 1,
    };
  });
  // Keep already released guests in order when one command breaks several prisons.
  let insertionIndex = combat.turnIndex + 1;
  while (combat.allies[combat.initiativeOrder[insertionIndex]]?.remainingTurns === 1) insertionIndex += 1;
  return {
    ...combat,
    allies: {...combat.allies, ...Object.fromEntries(allies.map((ally) => [ally.id, ally]))},
    initiativeOrder: [
      ...combat.initiativeOrder.slice(0, insertionIndex),
      ...allies.map((ally) => ally.id),
      ...combat.initiativeOrder.slice(insertionIndex),
    ],
    log: [...combat.log, ...allies.map((ally) => `${ally.name}: колба разбита! Вступает в очередь на один ход.`)],
  };
}
