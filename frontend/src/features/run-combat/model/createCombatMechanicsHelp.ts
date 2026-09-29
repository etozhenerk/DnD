import {getCombatStatusPresentation} from '../../../entities/combat/model/combatStatus';
import {combatConditionPresentation} from '../../../entities/combat/model/combatConditionPresentation';
import type {
  CombatActionDefinition,
  CombatConditionId,
  CombatEffectDefinition,
  CombatStatusKind,
} from '../../../entities/combat/model/types';
import type {
  CombatMechanicsGlossaryEntryView,
  CombatMechanicsHelpView,
} from '../../../entities/combat/model/view';

interface CombatMechanicsHelpOptions {
  stanceActive: boolean;
  weaknessReducedAc: number;
}

const advantageEntry: CombatMechanicsGlossaryEntryView = {
  term: 'Преимущество',
  description: 'На следующую атаку бросаются два d20 и используется больший результат. После этой атаки преимущество снимается.',
};

const disadvantageEntry: CombatMechanicsGlossaryEntryView = {
  term: 'Помеха',
  description: 'Для проверки атаки бросаются два d20 и используется меньший результат.',
};

function conditionEntries(condition: CombatConditionId): CombatMechanicsGlossaryEntryView[] {
  switch (condition) {
    case 'blinded': return [{
      term: 'Ослепление',
      description: 'Следующая атака ослеплённой цели выполняется с помехой, после чего ослепление снимается.',
    }, disadvantageEntry];
    case 'attack-disadvantage': return [disadvantageEntry];
    case 'prone': return [{
      term: 'Падение',
      description: combatConditionPresentation.prone.label,
    }];
    case 'stunned': return [{
      term: 'Пропуск хода',
      description: 'Когда очередь доходит до цели, её следующий ход целиком пропускается, затем эффект снимается.',
    }];
  }
}

function statusEntries(
  kind: CombatStatusKind,
  charges = 1,
  amount?: number,
): CombatMechanicsGlossaryEntryView[] {
  const presentation = getCombatStatusPresentation({
    id: 'mechanics-preview',
    kind,
    sourceActorId: 'mechanics-preview',
    targetId: 'mechanics-preview',
    charges,
    amount,
  });
  const presentationEntry: CombatMechanicsGlossaryEntryView = {
    term: presentation.shortLabel.replace(/\s×\d+$/u, ''),
    description: presentation.label,
  };
  const grantsAdvantage = [
    'attack-advantage',
    'guided-turn',
    'commanded-strike',
    'inspired',
  ].includes(kind);
  const imposesDisadvantage = [
    'wind-guard',
    'surveilled',
    'beast-challenge',
  ].includes(kind);
  const entries: CombatMechanicsGlossaryEntryView[] = [
    ...(grantsAdvantage ? [advantageEntry] : []),
    ...(presentationEntry.term !== advantageEntry.term ? [presentationEntry] : []),
    ...(imposesDisadvantage ? [disadvantageEntry] : []),
  ];
  return entries;
}

function effectEntries(
  effect: CombatEffectDefinition,
  options: CombatMechanicsHelpOptions,
): CombatMechanicsGlossaryEntryView[] {
  switch (effect.type) {
    case 'enemy-area-damage': return [{term: 'Общий урон', description: `Один бросок ${effect.damage} наносит урон всем героям в сознании без спасбросков. Сопротивления и пассивки применяются отдельно к каждому.`}];
    case 'enemy-crown': return [{term: 'Корона', description: `+${effect.acBonus} AC до следующего хода владельца. Бросьте ${effect.retaliationDice} при создании щита: первое прямое попадание снимает защиту и наносит атакующему сохранённый урон. Промах и урон от эффекта щит не разбивают.`}];
    case 'enemy-summon': return [{term: 'Призыв', description: `${effect.count} врага вступают перед следующим ходом призывателя. Каждый получает ${effect.turns} собственных хода; оглушение тоже расходует ход. При поражении призывателя тени исчезают.`}];
    case 'enemy-saving-throw': return [{term: 'Спасброски героев', description: `За каждого героя отдельно бросается d20 + характеристика против DC ${effect.dc}. Ламберт помогает автоматически; помощь Торина выбирается кнопкой после броска. ${effect.damage ? 'Успех уменьшает общий урон вдвое, сопротивление применяется после спасброска.' : 'Провал даёт помеху следующей атаке. Успех усиливает следующую атаку по источнику на +2.'}`}];
    case 'guest-skill': return [{term: 'Один выход союзника', description: effect.kind === 'grease-trap'
      ? 'Вместо обычной атаки союзник ставит ловушку. Она отражает следующую атаку отмеченного противника в него самого, без проверки попадания и вторичных эффектов. Бросается обычный урон атаки.'
      : effect.kind === 'healing-note'
        ? `Один общий ${effect.dice} восстанавливает каждому герою столько HP, сколько выпало, не выше максимума. Помогает и героям без сознания.`
        : 'Выбранный герой получает гарантированное критическое попадание по отмеченному противнику на своей следующей атаке: без d20, обычный бросок урона с модификаторами ×2. Удар по колбе усиление не расходует.'}];
    case 'healing': return [{
      term: 'Лечение',
      description: 'Восстанавливает указанное количество HP, но здоровье не может подняться выше максимального.',
    }];
    case 'expose-weakness': return [{
      term: 'Слабое место',
      description: `До следующего успешного попадания AC выбранной цели считается равным ${options.weaknessReducedAc}; после попадания эффект снимается.`,
    }];
    case 'toggle-stance':
      if (effect.stance === 'airborne') return [{
        term: 'Полёт',
        description: 'Наземные противники атакуют летящего героя с помехой. Следующее попадание героя получает +1d6 урона и завершает полёт.',
      }, disadvantageEntry];
      return [{
        term: 'Малый облик',
        description: options.stanceActive
          ? 'При возвращении к обычному росту +3 AC и −2 к атакам снимаются, а следующая атака получает преимущество.'
          : 'Пока действует малый облик, герой получает +3 AC и −2 к своим атакам.',
      }, ...(options.stanceActive ? [advantageEntry] : [])];
    case 'summon-allies': return [{
      term: 'Призванные союзники',
      description: `Входят в общую очередь инициативы, имеют собственные HP, AC и атаку и исчезают после ${effect.durationRounds} раундов.`,
    }];
    case 'modify-ac': return [{
      term: 'AC',
      description: 'Класс брони — число, которое должна набрать или превысить атака, чтобы попасть. Изменение действует до указанного в навыке момента.',
    }];
    case 'modify-attack': return [{
      term: 'Бонус к атаке',
      description: 'Прибавляется к результату d20 при проверке попадания. Если указан следующий удар, бонус расходуется после этой атаки.',
    }];
    case 'modify-stat': return [{
      term: 'Модификатор характеристики',
      description: 'Прибавляется к d20, когда мастер назначает проверку соответствующей характеристики.',
    }];
    case 'remove-negative-conditions': return [{
      term: 'Снятие негативных эффектов',
      description: 'Убирает ослепление, помеху следующей атаки, падение или пропуск хода. Если указано «один», снимается только один активный эффект.',
    }];
    case 'area-saving-throw': return [
      {
        term: 'Спасбросок',
        description: `Результат d20 сравнивается с DC ${effect.dc}: ${effect.dc} или выше — успех, меньше ${effect.dc} — провал.`,
      },
      ...effect.failureConditions.flatMap(conditionEntries),
      ...(effect.successConditions ?? []).flatMap(conditionEntries),
      ...(effect.failureStatus ? statusEntries(effect.failureStatus) : []),
      ...(effect.successStatus ? statusEntries(effect.successStatus) : []),
    ];
    case 'apply-status':
      return statusEntries(effect.status, effect.charges, effect.amount);
    case 'area-damage': return [
      {
        term: 'Спасбросок от урона',
        description: `Каждая цель отдельно бросает d20 против DC ${effect.savingThrow.dc}. ${effect.savingThrow.halfOnSuccess ? 'При успехе получает половину урона с округлением вниз.' : 'При успехе не получает урона.'}`,
      },
      ...(effect.savingThrow.failureStatus ? statusEntries(effect.savingThrow.failureStatus) : []),
    ];
    case 'roll-table':
      return effect.outcomes.flatMap((outcome) => outcome.effects.flatMap((nested) => effectEntries(nested, options)));
    case 'passive': return [{
      term: 'Пассивный эффект',
      description: 'Не тратит действие персонажа. Условия срабатывания, необходимость ручного подтверждения и лимит применений указаны в описании эффекта.',
    }];
    case 'replace-attack': return [
      {
        term: 'Замена атаки',
        description: 'Вместо обычной атаки используется указанный бонус попадания, урон и дополнительные свойства навыка.',
      },
      ...(effect.attack.armorPiercing ? [{
        term: 'Пробивание брони',
        description: `Если базовый AC цели не ниже ${effect.attack.armorPiercing.minimumAc}, перед проверкой попадания он уменьшается на ${effect.attack.armorPiercing.reduction}.`,
      }] : []),
      ...(effect.attack.onHitSavingThrow
        ? [
            {
              term: 'Спасбросок после попадания',
              description: `После получения урона выжившая цель бросает d20 против DC ${effect.attack.onHitSavingThrow.dc}. Эффект накладывается только при провале.`,
            },
            ...(effect.attack.onHitSavingThrow.failureConditions
              ?? (effect.attack.onHitSavingThrow.failureCondition
                ? [effect.attack.onHitSavingThrow.failureCondition]
                : [])).flatMap(conditionEntries),
          ]
        : []),
    ];
  }
}

export function createCombatMechanicsHelp(
  action: CombatActionDefinition,
  options: CombatMechanicsHelpOptions,
): CombatMechanicsHelpView {
  const entries = action.effects.flatMap((effect) => effectEntries(effect, options));
  const uniqueEntries = entries.filter((entry, index) => (
    entries.findIndex((candidate) => candidate.term === entry.term) === index
  ));
  return {entries: uniqueEntries};
}
