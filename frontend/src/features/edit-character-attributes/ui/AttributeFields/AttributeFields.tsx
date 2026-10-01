import {getCharacterAttributeRows} from '../../../../entities/character';
import {getAttributeAdjustment} from '../../../../entities/character-form';
import type {ClassProfile} from '../../../../entities/character-form';
import {AttributeControl} from '../AttributeControl';
import styles from './AttributeFields.module.css';

export type AttributeFieldsProps = {value: Record<string, number>; profile: ClassProfile; onChange: (value: Record<string, number>) => void};

export function AttributeFields({value, profile, onChange}: AttributeFieldsProps) {
  return (
    <div className={styles.fields}>
      {getCharacterAttributeRows(value).map((row) => <AttributeControl key={row.id} row={row}
        adjustment={getAttributeAdjustment(row.id, value, profile)}
        value={value[row.id] ?? 0} onChange={(amount) => onChange({...value, [row.id]: amount})} />)}
    </div>
  );
}
