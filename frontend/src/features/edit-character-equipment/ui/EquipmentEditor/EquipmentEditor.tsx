import type {EquipmentItem} from '../../../../entities/character-form';
import {TextField} from '../../../../shared/ui/TextField';
import styles from './EquipmentEditor.module.css';

export type EquipmentEditorProps = {item: EquipmentItem; onChange: (item: EquipmentItem) => void; onRemove: () => void};

export function EquipmentEditor({item, onChange, onRemove}: EquipmentEditorProps) {
  return (
    <section className={styles.item} aria-label={item.name || 'Новый предмет'}>
      <header><h3>{item.name || 'Новый предмет'}</h3><button type="button" onClick={onRemove}>Удалить предмет</button></header>
      <TextField label="Название предмета" value={item.name} maxLength={120} required
        placeholder="Что герой возьмёт с собой?" onChange={(name) => onChange({...item, name})} />
      <TextField label="Описание предмета" value={item.description} multiline maxLength={2000}
        placeholder="Внешность, история и назначение" onChange={(description) => onChange({...item, description})} />
    </section>
  );
}
