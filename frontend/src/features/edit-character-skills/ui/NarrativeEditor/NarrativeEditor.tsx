import type {NarrativeAbility} from '../../../../entities/character-form';
import {TextField} from '../../../../shared/ui/TextField';
import styles from './NarrativeEditor.module.css';

export type NarrativeEditorProps = {
  item: NarrativeAbility;
  onChange: (item: NarrativeAbility) => void;
  onRemove: () => void;
};

export function NarrativeEditor({item, onChange, onRemove}: NarrativeEditorProps) {
  return (
    <section className={styles.editor} aria-label={item.name || 'Новая особенность'}>
      <TextField label="Название особенности" value={item.name} maxLength={120} required
        onChange={(name) => onChange({...item, name})} />
      <TextField label="Описание особенности" value={item.description} multiline maxLength={2000} required
        onChange={(description) => onChange({...item, description})} />
      <button type="button" onClick={onRemove}>Удалить особенность</button>
    </section>
  );
}
