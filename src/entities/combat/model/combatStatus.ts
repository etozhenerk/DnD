import type {CombatState, CombatStatusKind, CombatStatusState} from './types';

export const passiveStatusKinds = new Set<CombatStatusKind>([
  'bubis-balance', 'cold-resistance', 'dragonborn-armour', 'heat-reactor', 'helping-reaction',
  'northern-ward', 'poison-resistance', 'survival-instinct', 'tech-recalculation',
]);

interface CombatStatusPresentation {
  label: string;
  shortLabel: string;
  tone: 'positive' | 'negative' | 'neutral';
}

function chargeSuffix(status: CombatStatusState) {
  return status.charges > 1 ? ` ×${status.charges}` : '';
}

export function getCombatStatusPresentation(status: CombatStatusState): CombatStatusPresentation {
  const charges = chargeSuffix(status);
  switch (status.kind) {
    case 'grease-trap': return {label: 'Жировая ловушка: следующая атака противника автоматически отражается в него самого, без вторичных эффектов.', shortLabel: 'Жировая ловушка', tone: 'negative'};
    case 'guest-critical': return {label: 'Сюда, блин!: следующая атака этого героя по отмеченному противнику — гарантированное критическое попадание без d20.', shortLabel: 'Гарантированный крит', tone: 'positive'};
    case 'dragonborn-armour': return {
      label: 'Драконорождённая броня: +2 AC против ближних атак и −1 входящего холодного урона.',
      shortLabel: 'Броня дракона',
      tone: 'positive',
    };
    case 'cold-resistance': return {
      label: 'Сопротивление холоду: входящий холодный урон уменьшается вдвое.',
      shortLabel: '½ холода',
      tone: 'positive',
    };
    case 'poison-resistance': return {
      label: 'Сопротивление ядам: входящий урон ядом уменьшается вдвое.',
      shortLabel: '½ яда',
      tone: 'positive',
    };
    case 'northern-ward': return {
      label: 'Северная стойкость отменит следующий эффект контроля и даст 4 временных HP.',
      shortLabel: `Стойкость${charges}`,
      tone: 'positive',
    };
    case 'retaliating-crown': return {
      label: `Корона: +${status.amount ?? 0} AC до следующего хода. Первое прямое попадание разбивает щит и наносит атакующему ${status.retaliationDamage ?? 0} магического урона.`,
      shortLabel: `Корона +${status.amount ?? 0} AC`, tone: 'positive',
    };
    case 'movement-spent': return {
      label: 'Устаревшая отметка подъёма из старого сохранения. Персонаж встаёт без штрафа; действие и перемещение доступны.',
      shortLabel: 'Подъём без штрафа', tone: 'neutral',
    };
    case 'bubis-balance': return {
      label: 'Баланс Бубис не даёт сбить героиню с ног или принудительно переместить её.',
      shortLabel: 'Не сбить',
      tone: 'positive',
    };
    case 'attack-advantage': return {
      label: 'Следующая атака выполняется с преимуществом.',
      shortLabel: `Преимущество${charges}`,
      tone: 'positive',
    };
    case 'guided-turn': return {
      label: 'Союзник очищен от контроля, действует сразу после Бубсильды и получает преимущество на первую атаку.',
      shortLabel: 'Королевский ход',
      tone: 'positive',
    };
    case 'studied-target': return {
      label: `Противник изучен: его действие раскрыто, а первые удары разных героев получают +1d4 урона${charges}.`,
      shortLabel: `Изучен${charges}`,
      tone: 'negative',
    };
    case 'temporary-hp': return {
      label: `Временные HP поглотят ${status.amount ?? 0} урона раньше обычного здоровья.`,
      shortLabel: `Врем. HP +${status.amount ?? 0}`,
      tone: 'positive',
    };
    case 'survival-instinct': return {
      label: 'При первом смертельном уроне Линда останется на 1 HP и снимет негативные эффекты.',
      shortLabel: 'Воля жизни',
      tone: 'positive',
    };
    case 'dive-ready': return {
      label: 'Следующая атака Линды получает +1d6 урона и завершает полёт.',
      shortLabel: 'Пикирование',
      tone: 'positive',
    };
    case 'resonance': return {
      label: `Магический резонанс: первые удары разных героев получают +1d4 урона${charges}.`,
      shortLabel: `Резонанс${charges}`,
      tone: 'negative',
    };
    case 'wind-guard': return {
      label: `Курортный вихрь заставит перебросить успешные атаки врагов и оставить худший результат${charges}.`,
      shortLabel: `Вихрь${charges}`,
      tone: 'positive',
    };
    case 'tech-recalculation': return {
      label: 'После проваленного союзником спасброска Ламберт один раз добавит к результату +4.',
      shortLabel: 'Перерасчёт',
      tone: 'positive',
    };
    case 'confused': return {
      label: 'Следующая атака направляется в другого врага; без доступной цели выполняется с помехой.',
      shortLabel: 'Перепутал цель',
      tone: 'negative',
    };
    case 'commanded-strike': return {
      label: 'Союзник действует сразу после Ламберта и выполняет следующую атаку с преимуществом.',
      shortLabel: 'Точный удар',
      tone: 'positive',
    };
    case 'jammed': return {
      label: `Система заглушена: −2 к атаке и отключены дополнительные эффекты${charges}.`,
      shortLabel: `Сбой${charges}`,
      tone: 'negative',
    };
    case 'heat-reactor': return {
      label: 'Получая холодный урон, Лена накапливает до +4 урона для следующей огненной атаки.',
      shortLabel: 'Копит жар',
      tone: 'neutral',
    };
    case 'heat-charge': return {
      label: `Накопленное тепло усиливает следующую огненную атаку на +${status.amount ?? 0} урона.`,
      shortLabel: `Жар +${status.amount ?? 0}`,
      tone: 'positive',
    };
    case 'inspired': return {
      label: 'Следующий d20 можно перебросить после того, как стал известен первый результат.',
      shortLabel: 'Вдохновение',
      tone: 'positive',
    };
    case 'bonus-damage': return {
      label: `Следующее попадание наносит дополнительный урон ${status.amount ? `+${status.amount}` : '+1d4'}.`,
      shortLabel: status.amount ? `Урон +${status.amount}` : 'Урон +1d4',
      tone: 'positive',
    };
    case 'critical-focus': return {
      label: 'Следующая атака становится критической на натуральных 19–20.',
      shortLabel: 'Крит 19–20',
      tone: 'positive',
    };
    case 'burning': return {
      label: `В начале следующего хода цель получает ${status.amount ?? '1d4'} огненного урона, затем горение снимается.`,
      shortLabel: `Горит · ${status.amount ?? '1d4'} урона`,
      tone: 'negative',
    };
    case 'surveilled': return {
      label: 'Следующее действие и цель противника раскрыты; его следующая атака перебрасывается с худшим результатом.',
      shortLabel: 'Под наблюдением',
      tone: 'negative',
    };
    case 'helping-reaction': return {
      label: 'Готово одно использование на бой. После броска нажмите «Помочь Торином: +2», чтобы повысить AC другого союзника только против текущей атаки или добавить +2 к текущему спасброску. Кнопка доступна, если бонус превращает попадание в промах или провал в успех. Заряд тратится только по нажатию; «Без помощи Торина» сохраняет его. Это одно общее использование на оба варианта, оно восстанавливается в новом бою. Торин должен быть в сознании и не оглушён. Критическое попадание и натуральную 1 на спасброске помощь не отменяет.',
      shortLabel: 'Выручалочка',
      tone: 'positive',
    };
    case 'last-push': return {
      label: 'До начала следующего хода Торин не может опуститься ниже 1 HP.',
      shortLabel: 'На пульсе',
      tone: 'positive',
    };
    case 'beast-challenge': return {
      label: 'Следующая атака направлена в Торина и выполняется с помехой.',
      shortLabel: 'Вызван Торином',
      tone: 'negative',
    };
    case 'critical-opening': return {
      label: 'Следующее попадание игнорирует броню и становится критическим.',
      shortLabel: 'Открытая брешь',
      tone: 'negative',
    };
  }
}

export function getCombatStatuses(
  combat: Pick<CombatState, 'statuses'>,
  targetId: string,
  kind?: CombatStatusKind,
) {
  return (combat.statuses ?? []).filter((status) => (
    status.targetId === targetId && (!kind || status.kind === kind)
  ));
}

export function getFirstCombatStatus(
  combat: Pick<CombatState, 'statuses'>,
  targetId: string,
  kind: CombatStatusKind,
) {
  return getCombatStatuses(combat, targetId, kind)[0];
}
