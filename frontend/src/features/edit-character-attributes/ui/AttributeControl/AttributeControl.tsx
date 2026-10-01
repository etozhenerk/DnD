import {creationRules} from '../../../../entities/character-form';
import type {AttributeAdjustment} from '../../../../entities/character-form';
import {formatSignedNumber} from '../../../../shared/lib/numbers';
import type {CharacterAttributeRow} from '../../../../entities/character';
import {FantasyIcon} from '../../../../shared/ui/FantasyIcon';
import styles from './AttributeControl.module.css';

export type AttributeControlProps = {row: CharacterAttributeRow; value: number; adjustment: AttributeAdjustment; onChange: (value: number) => void};

export function AttributeControl({row, value, adjustment, onChange}: AttributeControlProps) {
  return (
    <div className={styles.attribute}>
      <span className={styles.label}><FantasyIcon name={row.icon} />{row.label}</span>
      <small>Основа класса: {formatSignedNumber(adjustment.baseValue)}</small>
      <div className={styles.adjustment}>
        <button type="button" aria-label={'Уменьшить: ' + row.label} disabled={!adjustment.canDecrease}
          onClick={() => onChange(value - 1)}>−</button>
        <output aria-label={row.label + ': модификатор'}>{row.display}</output>
        <button type="button" aria-label={'Увеличить: ' + row.label} disabled={!adjustment.canIncrease}
          onClick={() => onChange(value + 1)}>+</button>
      </div>
      <div className={styles.cost}>
        <small>Ваше усиление: {formatSignedNumber(adjustment.bonusValue)} · {adjustment.bonusCost} очк.</small>
        <small>{value < creationRules.pointBuy.maximumModifier ? `Следующее +1: ${adjustment.nextCost} очк.` : 'Максимальное значение'}</small>
      </div>
    </div>
  );
}
