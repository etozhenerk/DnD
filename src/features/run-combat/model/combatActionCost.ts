import type {CombatActionActivation, CombatActionDefinition, CombatInventoryItemState, CombatUsageScope} from '../../../entities/combat/model/types';

const scopes: Record<CombatUsageScope, string> = {
  turn: 'ход', round: 'раунд', battle: 'бой', location: 'локацию', campaign: 'кампанию',
};
const exhausted: Record<CombatUsageScope, string> = {
  turn: 'Снова доступно в следующий собственный ход.',
  round: 'Снова доступно в следующем раунде.',
  battle: 'Снова доступно в следующем бою.',
  location: 'Снова доступно в новой локации.',
  campaign: 'На следующий бой этот лимит не обновляется.',
};

export function getCombatActionCost(
  action: CombatActionDefinition,
  activation: CombatActionActivation,
  used: number,
  item?: CombatInventoryItemState,
  reactionCharges?: number,
) {
  if (activation === 'passive' && reactionCharges === undefined) return undefined;
  const {max, scope} = action.uses;
  const remaining = Math.max(0, reactionCharges ?? Math.min(max - used, item?.maxCharges != null ? item.charges : max));
  const times = max === 1 ? 'раз' : max >= 2 && max <= 4 ? 'раза' : 'раз';
  const trigger = activation === 'passive' ? 'При срабатывании' : 'После применения';
  return {
    remaining,
    limitLabel: `${activation === 'passive' ? 'Реакция: ' : ''}${max} ${times} за ${scopes[scope]}`,
    badgeLabel: `${remaining}/${max}`,
    turnLabel: activation === 'passive' ? 'Не расходует ход'
      : activation === 'action' || activation === 'attack' ? 'Завершает ход' : 'Ход продолжается',
    hint: remaining > 0
      ? `${trigger}: ${remaining - 1} из ${max}.${remaining === 1 ? ` ${exhausted[scope]}` : ''}`
      : exhausted[scope],
  };
}
