export type ParticipantConditionMechanicalEffect =
  | 'downed-skip'
  | 'next-roll-minus-two'
  | 'next-formal-action-blocked'
  | 'no-mechanical-effect';

export interface ParticipantConditionRule {
  id: string;
  effect: ParticipantConditionMechanicalEffect;
  consumesOn: 'never' | 'next-roll' | 'next-formal-action';
  explanation: string;
}

const registeredParticipantConditionRules: ParticipantConditionRule[] = [
  {
    id: 'downed',
    effect: 'downed-skip',
    consumesOn: 'never',
    explanation: 'HP 0: участник автоматически пропускается в инициативе до лечения.',
  },
  {
    id: 'shamed',
    effect: 'next-roll-minus-two',
    consumesOn: 'next-roll',
    explanation: '−2 к следующей атаке или проверке; состояние снимается этим же command group.',
  },
  {
    id: 'assigned-role',
    effect: 'next-formal-action-blocked',
    consumesOn: 'next-formal-action',
    explanation: 'Следующее формальное действие тратится на навязанную роль; состояние снимается.',
  },
  ...['inspired', 'blinded', 'frightened', 'stunned', 'prone', 'frozen'].map((id) => ({
    id,
    effect: 'no-mechanical-effect' as const,
    consumesOn: 'never' as const,
    explanation: 'Поддерживаемое повествовательное состояние без автоматического механического эффекта.',
  })),
];

export const participantConditionRules: Record<string, ParticipantConditionRule> = Object.fromEntries(
  registeredParticipantConditionRules.map((rule) => [rule.id, rule]),
);

export function getParticipantConditionRule(conditionId: string): ParticipantConditionRule {
  return participantConditionRules[conditionId] ?? {
    id: conditionId,
    effect: 'no-mechanical-effect',
    consumesOn: 'never',
    explanation: 'Пользовательское повествовательное состояние без автоматического механического эффекта.',
  };
}

export function resolveNextFormalActionConditions(conditionIds: string[]) {
  return {
    blocked: conditionIds.includes('assigned-role'),
    rollModifier: conditionIds.includes('shamed') ? -2 : 0,
    consumedConditionIds: [
      ...(conditionIds.includes('assigned-role') ? ['assigned-role'] : []),
      ...(conditionIds.includes('shamed') ? ['shamed'] : []),
    ],
  };
}
