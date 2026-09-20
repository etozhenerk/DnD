import {combatConditionVisuals, combatStatusVisuals} from '../../../entities/combat/model/combatEffectVisuals';
import {getCombatStatusPresentation, passiveStatusKinds} from '../../../entities/combat/model/combatStatus';
import type {CombatStatusKind} from '../../../entities/combat/model/types';
import type {CombatEffectView} from '../../../entities/combat/model/view';

const conditionLabels = {prone: 'Падение', stunned: 'Оглушение', blinded: 'Ослепление', 'attack-disadvantage': 'Помеха'};
export const combatEffectPreview: CombatEffectView[] = [
  ...Object.entries(combatConditionVisuals).map(([id, visual]) => ({id, visual, label: conditionLabels[id as keyof typeof conditionLabels], shortLabel: conditionLabels[id as keyof typeof conditionLabels], tone: 'negative' as const})),
  ...Object.entries(combatStatusVisuals).filter(([kind]) => kind !== 'movement-spent' && !passiveStatusKinds.has(kind as CombatStatusKind)).map(([kind, visual]) => ({id: kind, visual,
    ...getCombatStatusPresentation({id: kind, kind: kind as CombatStatusKind, targetId: 'preview', sourceActorId: 'preview', charges: 2, amount: 3}),
  })),
  ...([
    ['fly', 'Полёт'], ['shrink', 'Малый облик'], ['fear', 'Испуг'], ['shame', 'Стыд'],
    ['stat', 'Характеристика усилена'], ['summon', 'Призыв'], ['bound', 'Назначенная роль'],
  ] as const).map(([visual, label]) => ({id: visual, visual, label, shortLabel: label, tone: 'neutral' as const})),
];
