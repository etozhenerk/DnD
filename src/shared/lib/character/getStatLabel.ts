import type {Character} from '../../../entities/character/model/types';

const statLabels: Record<keyof Character['stats'], string> = {
  strength: 'Сила',
  dexterity: 'Ловкость',
  constitution: 'Выносливость',
  wisdom: 'Мудрость',
  intelligence: 'Интеллект',
  charisma: 'Харизма',
};

export function getStatLabel(stat: keyof Character['stats']): string {
  return statLabels[stat];
}
