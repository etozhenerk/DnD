import type {ReactNode} from 'react';
import type {CharacterAppearance} from '../../../../entities/character-form';
import {TextField} from '../../../../shared/ui/TextField';
import styles from './AppearanceFields.module.css';

export type AppearanceFieldsProps = {
  appearance: CharacterAppearance;
  onChange: (changes: Partial<CharacterAppearance>) => void;
  children: ReactNode;
};

export function AppearanceFields({appearance, onChange, children}: AppearanceFieldsProps) {
  return (
    <div className={styles.fields}>
      <div className={styles.row}>
        <TextField label="Имя героя" value={appearance.displayName} required maxLength={120} showCount
          placeholder="Как вас назовут в летописях?" onChange={(displayName) => onChange({displayName})} />
        <TextField label="Местоимения" value={appearance.pronouns} maxLength={4000}
          placeholder="Например, она / её" onChange={(pronouns) => onChange({pronouns})} />
      </div>
      {children}
      <div className={styles.row}>
        <TextField label="Предыстория" value={appearance.story} multiline rows={2} maxLength={4000}
          placeholder="Откуда пришёл герой и что привело его к приключению?" onChange={(story) => onChange({story})} />
        <TextField label="Внешность" value={appearance.appearance} multiline maxLength={4000}
          placeholder="Необязательно: приметы, одежда и детали образа" onChange={(value) => onChange({appearance: value})} />
      </div>
      <div className={styles.row}>
        <TextField label="Характер" value={appearance.personality.join('\n')} multiline maxLength={4000}
          placeholder="Опишите черты, каждую с новой строки" onChange={(value) => onChange({personality: value.split('\n')})} />
        <TextField label="Цель" value={appearance.motivation} multiline maxLength={4000}
          placeholder="Чего герой хочет больше всего?" onChange={(motivation) => onChange({motivation})} />
      </div>
    </div>
  );
}
