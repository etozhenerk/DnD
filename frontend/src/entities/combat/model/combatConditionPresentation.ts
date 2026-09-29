import rules from '../../../../content/rules.json';
import type {CombatConditionId} from './types';

export const combatConditionPresentation: Record<CombatConditionId, {label: string; shortLabel: string}> = {
  blinded: {
    label: 'Следующая атака ослеплённой цели выполняется с помехой: бросить два d20 и выбрать меньший результат. После атаки ослепление снимается.',
    shortLabel: 'Ослеплён',
  },
  'attack-disadvantage': {
    label: 'На следующую атаку бросить два d20 и выбрать меньший результат. После атаки помеха снимается. При одновременном преимуществе выполняется обычный бросок одного d20.',
    shortLabel: 'Помеха',
  },
  prone: {
    label: `${rules.conditions.find((condition) => condition.id === 'prone')!.effect} Преимущество: бросить два d20 и выбрать больший результат. Падение само по себе не вызывает пропуск действия.`,
    shortLabel: 'Лежит',
  },
  stunned: {
    label: 'Когда наступает очередь цели, она пропускает следующее действие. Затем оглушение снимается. Падение — отдельный эффект и само по себе не отнимает действие.',
    shortLabel: 'Пропуск хода',
  },
};
