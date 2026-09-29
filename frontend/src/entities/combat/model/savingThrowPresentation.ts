import type {CombatPendingSavingThrow, CombatState} from './types';
import {mitigateCombatDamage} from './combatDamage';

const statNames = {strength: 'Сила', dexterity: 'Ловкость', constitution: 'Телосложение', wisdom: 'Мудрость', intelligence: 'Интеллект', charisma: 'Харизма'};
const conditionNames = {blinded: 'ослепление: следующая атака с помехой', 'attack-disadvantage': 'помеха на следующую атаку (2d20, выбрать меньший)', prone: 'падение: любые атаки по цели с преимуществом, подъём в начале своей очереди без штрафа', stunned: 'пропуск следующего действия'};

export function getCombatSavingThrowPresentation(save: CombatPendingSavingThrow, combat?: CombatState) {
  const action = save.actionName ?? save.enemySkill?.actionName ?? save.areaDamage?.actionName;
  const source = `${save.sourceName}${action ? ` · ${action}` : ''}`;
  if (save.kind === 'enemy-attack-reroll') return {
    title: `Переброс атаки: ${save.sourceName}`,
    description: `Защитный эффект требует ещё один d20. Первый результат: ${save.attackReroll?.firstRoll}.`,
    outcome: 'Останется меньший из двух результатов. Это продолжение той же атаки.',
    formula: `min(${save.attackReroll?.firstRoll}, 1d20) + ${save.modifier} против AC ${save.dc}`,
    source, rollOwner: `Мастер за ${save.sourceName}`,
  };
  if (save.kind === 'action-healing') return {
    title: `Лечение: ${save.targetName}`, description: `Бросьте кубик лечения навыка «${action}».`,
    outcome: `Восстановятся HP в пределах максимума. ${save.healing?.endTurn ? 'После лечения ход завершится.' : 'После лечения можно продолжить ход.'}`,
    formula: save.rollExpression ?? '1d6', source, rollOwner: save.sourceName,
  };
  if (save.kind === 'area-damage-status') return {
    title: `Урон горения: ${save.targetName}`, description: 'Спасбросок провален. Определите урон от горения.',
    outcome: 'Этот урон сработает один раз в начале следующего хода цели. Это величина урона, а не число ходов.',
    formula: save.rollExpression ?? '1d4', source, rollOwner: `Мастер за ${save.targetName}`,
  };
  const damage = save.areaDamage?.damage ?? save.enemySkill?.damage ?? 0;
  const damageType = save.areaDamage?.damageType ?? save.enemySkill?.damageType;
  const failureDamage = combat ? mitigateCombatDamage(combat, save.targetId, damageType, damage).amount : damage;
  const successDamage = combat ? mitigateCombatDamage(combat, save.targetId, damageType, Math.floor(damage / 2)).amount : Math.floor(damage / 2);
  const failure = save.failureConditions.map((condition) => conditionNames[condition]).join('; ');
  const bonus = save.enemySkill?.successAttackBonus;
  return {
    title: `Спасбросок: ${save.targetName}`,
    description: `${save.targetName} сопротивляется ${action ? `«${action}»` : 'эффекту попадания'}. Это продолжение действия ${save.sourceName}; очередь ещё не переходит.`,
    outcome: `Провал: ${[damage ? `${failureDamage} урона` : '', failure, save.areaDamage?.failureStatus === 'burning' ? 'горение 1d4' : ''].filter(Boolean).join('; ') || 'эффект навыка'}. Успех: ${damage ? `${successDamage} урона` : 'без негативного эффекта'}${bonus ? ` и +${bonus} к следующей атаке по ${save.sourceName}` : ''}.${failureDamage !== damage ? ' Сопротивление и броня уже учтены.' : ''}`,
    formula: `1d20 ${save.modifier >= 0 ? '+' : '−'} ${Math.abs(save.modifier)} · ${statNames[save.stat]} против DC ${save.dc}`,
    source, rollOwner: save.targetName,
  };
}
