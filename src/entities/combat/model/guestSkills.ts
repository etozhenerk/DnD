import type {CombatState} from './types';

export function getGuaranteedCritical(combat: CombatState, actorId: string, targetId: string) {
  return (combat.statuses ?? []).find((status) => status.kind === 'guest-critical'
    && status.targetId === actorId && status.againstTargetId === targetId && status.charges > 0);
}

export function getAutomaticAttackLabel(combat: CombatState, actorId: string, targetId: string) {
  if ((combat.statuses ?? []).some((status) => status.kind === 'grease-trap'
    && status.targetId === actorId && status.charges > 0)) return 'Отразить атаку';
  return getGuaranteedCritical(combat, actorId, targetId) ? 'Нанести критический удар' : undefined;
}
