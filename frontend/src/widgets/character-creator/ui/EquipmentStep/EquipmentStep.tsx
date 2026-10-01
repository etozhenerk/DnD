import type {CharacterFormController} from '../../../../entities/character-form';
import {EquipmentEditor} from '../../../../features/edit-character-equipment';
import {FantasyIcon} from '../../../../shared/ui/FantasyIcon';
import {ActionButton} from '../../../../shared/ui/ActionButton';
import {useEquipmentEditing} from '../../model/useEquipmentEditing';
import styles from './EquipmentStep.module.css';

export type EquipmentStepProps = {controller: CharacterFormController};

export function EquipmentStep({controller}: EquipmentStepProps) {
  const editing = useEquipmentEditing(controller);
  const confirmed = controller.confirmed.has('equipment');
  const invalid = editing.items.some((item) => !item.name.trim());
  return (
    <div className={styles.step}>
      {editing.items.length === 0 && <div className={styles.empty}>
        <FantasyIcon name="book" /><h3>Что в вашем рюкзаке?</h3>
        <p>Добавьте оружие, одежду и памятные вещи. Можно отправиться в путь без снаряжения.</p>
      </div>}
      {editing.items.map((item) => <EquipmentEditor key={item.id} item={item} onChange={editing.change} onRemove={() => editing.remove(item.id)} />)}
      <ActionButton tone="secondary" onClick={editing.add} disabled={editing.items.length >= 20}>+ Добавить предмет</ActionButton>
      {invalid && <p className={styles.hint} role="status">Укажите название каждого предмета.</p>}
      <ActionButton disabled={invalid || confirmed} onClick={editing.confirm}>
        {confirmed ? '✓ Снаряжение подтверждено' : 'Подтвердить снаряжение'}
      </ActionButton>
      <small>Предметы пока описательные: они не дают дополнительных HP, защиты или формальных боевых эффектов.</small>
    </div>
  );
}
