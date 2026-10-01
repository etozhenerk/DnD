import {creationRules} from '../../../../entities/character-form';
import type {getAttributeBalance} from '../../../../entities/character-form';
import {Tooltip} from '../../../../shared/ui/Tooltip';
import styles from './AttributeBudget.module.css';

export type AttributeBudgetProps = {balance: ReturnType<typeof getAttributeBalance>};

export function AttributeBudget({balance}: AttributeBudgetProps) {
  const warning = balance.problems.length > 0 || balance.remaining < 0;
  let title = 'Баланс соблюдён';
  if (balance.remaining > 0) title = 'Настройте усиления';
  if (warning) title = 'Проверьте распределение';
  return (
    <div className={styles.budget} data-warning={warning}>
      <span className={styles.label}>Очки усиления
        <Tooltip label="Правила и баланс характеристик" warning={warning}>
          <strong>{title}</strong>
          {warning && <ul>{balance.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
          <p>Основа класса уже задана. Распределите ещё {creationRules.classFoundation.bonusBudget} очка: вы оплачиваете разницу стоимости между основой и новым значением.</p>
          <p>Сильную сторону можно развить, слабую — компенсировать. Значение нельзя опустить ниже основы класса.</p>
          <p>Максимум характеристик с +{creationRules.pointBuy.maximumModifier}: {creationRules.pointBuy.maximumStatsAtPlusFour}.
            С отрицательным значением: {creationRules.pointBuy.maximumNegativeStats}. Ниже −2: {creationRules.pointBuy.maximumStatsBelowMinusTwo}.</p>
        </Tooltip>
      </span>
      <strong className={styles.count}>{balance.spent} / {creationRules.classFoundation.bonusBudget}</strong>
      <small className={styles.remaining}>Осталось: {balance.remaining}</small>
      <span className={styles.status} role="status">{balance.issues.length > 0 ? balance.issues.join(' ') : 'Баланс характеристик соблюдён.'}</span>
    </div>
  );
}
