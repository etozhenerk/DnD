import type {CharacterAbility} from '../../../entities/character/model/types';

const triggerLabels: Record<string, string> = {
  action: 'Действие',
  attack: 'Атака',
  bonus: 'Бонус',
  check: 'Проверка',
  movement: 'Движение',
  passive: 'Пассивно',
  'team-action': 'Командно',
  'turn-start': 'Начало хода',
};

const scopeLabels: Record<NonNullable<CharacterAbility['uses']>['scope'], string> = {
  turn: 'ход',
  round: 'раунд',
  battle: 'бой',
  location: 'локацию',
  campaign: 'кампанию',
};

export function getTriggerLabel(trigger?: string): string {
  return trigger ? triggerLabels[trigger] ?? trigger : 'Особое';
}

export function getUsesLabel(uses: CharacterAbility['uses']): string {
  if (!uses) return 'Без лимита';

  return `${uses.max} / ${scopeLabels[uses.scope]}`;
}

export function isPassiveAbility(ability: CharacterAbility): boolean {
  return ability.trigger === 'passive' || ability.trigger === 'movement' || ability.trigger === 'turn-start';
}
