import {useState} from 'react';
import type {CustomAbility} from '../../../../entities/character-form';
import {TextField} from '../../../../shared/ui/TextField';
import {SelectField} from '../../../../shared/ui/SelectField';
import {ImageUpload} from '../../../../shared/ui/ImageUpload';
import {getProfileOptions, getSkillKind, modifierOptions} from '../../model/skill-options';
import styles from './SkillEditor.module.css';

export type SkillEditorProps = {
  skill: CustomAbility;
  usedProfiles: readonly string[];
  icon?: string;
  onChange: (skill: CustomAbility) => void;
  onRemove: () => void;
  onIconUpload: (files: FileList | null) => void;
};

export function SkillEditor({skill, usedProfiles, icon, onChange, onRemove, onIconUpload}: SkillEditorProps) {
  const [kind, setKind] = useState(getSkillKind(skill.profileId));
  return (
    <section className={styles.editor} aria-label={skill.name || 'Новый навык'}>
      <header><h3>{skill.name || 'Новый навык'}</h3><button type="button" onClick={onRemove}>Удалить навык</button></header>
      <div className={styles.identity}>
        <ImageUpload label="Иконка навыка" src={icon} onUpload={onIconUpload} />
        <TextField label="Название навыка" value={skill.name} maxLength={120} required
          placeholder="Например, Ледяная стрела" onChange={(name) => onChange({...skill, name})} />
      </div>
      <TextField label="Описание навыка" value={skill.description} multiline maxLength={2000}
        placeholder="Придумайте, как выглядит действие" onChange={(description) => onChange({...skill, description})} />
      <div className={styles.effects} aria-label="Тип эффекта">
        <button type="button" aria-pressed={kind === 'damage'} onClick={() => { setKind('damage'); onChange({...skill, profileId: ''}); }}>⚔ Урон</button>
        <button type="button" aria-pressed={kind === 'healing'} onClick={() => { setKind('healing'); onChange({...skill, profileId: ''}); }}>✦ Лечение</button>
      </div>
      <div className={styles.row}>
        <SelectField label="Сила и заряды" value={skill.profileId} options={getProfileOptions(kind, usedProfiles, skill.profileId)}
          onChange={(profileId) => onChange({...skill, profileId})} />
        <SelectField label="Характеристика навыка" value={skill.modifierStat} options={modifierOptions}
          onChange={(modifierStat) => onChange({...skill, modifierStat})} />
      </div>
      <small>Одна цель · одно действие. Описание не добавляет числовых эффектов.</small>
    </section>
  );
}
