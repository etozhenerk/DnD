import type {CharacterSkills} from '../../../../entities/character-form';
import styles from './SkillTabs.module.css';

export type SkillTabsProps = {skills: CharacterSkills; selectedId: string; onSelect: (id: string) => void};

export function SkillTabs({skills, selectedId, onSelect}: SkillTabsProps) {
  return (
    <div className={styles.tabs} aria-label="Выбрать действие для редактирования">
      <button type="button" aria-pressed={selectedId === 'basic-attack'} onClick={() => onSelect('basic-attack')}>Базовая атака</button>
      {skills.items.map((skill, index) => <button key={skill.id} type="button" aria-pressed={selectedId === skill.id}
        onClick={() => onSelect(skill.id)}>{skill.name || 'Навык ' + (index + 1)}</button>)}
    </div>
  );
}
