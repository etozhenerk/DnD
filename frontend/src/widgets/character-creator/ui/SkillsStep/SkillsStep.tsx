import {abilityRules, getSkillBalance} from '../../../../entities/character-form';
import type {CharacterFormController} from '../../../../entities/character-form';
import {BasicActionFields, SkillEditor, NarrativeEditor} from '../../../../features/edit-character-skills';
import {ActionButton} from '../../../../shared/ui/ActionButton';
import {useSkillEditing} from '../../model/useSkillEditing';
import type {CreatorMedia} from '../../model/useCreatorMedia';
import {SkillTabs} from '../SkillTabs';
import styles from './SkillsStep.module.css';

export type SkillsStepProps = {controller: CharacterFormController; media: CreatorMedia};

export function SkillsStep({controller, media}: SkillsStepProps) {
  const editing = useSkillEditing(controller);
  const {skills} = controller;
  const balance = getSkillBalance(skills);
  const confirmed = controller.confirmed.has('abilities');
  const selected = editing.selectedSkill;
  return (
    <div className={styles.step}>
      <section className={styles.section}>
        <header><h3>Боевые действия</h3><span>{balance.spent} / {abilityRules.budget.points} очк. · {skills.items.length} / {abilityRules.budget.maximumCustomAbilities}</span></header>
        <SkillTabs skills={skills} selectedId={editing.selectedId} onSelect={editing.selectSkill} />
        {!selected && <BasicActionFields value={skills.basicAction} onChange={editing.changeBasic} />}
        {selected && <SkillEditor key={selected.id} skill={selected} usedProfiles={skills.items.map((item) => item.profileId)}
          icon={media.getIcon(selected.id)} onChange={editing.changeSkill}
          onRemove={() => { editing.removeSkill(selected.id); media.removeIcon(selected.id); }}
          onIconUpload={(files) => { void media.uploadIcon(selected.id, files); }} />}
        <ActionButton tone="secondary" onClick={editing.addSkill} disabled={skills.items.length >= abilityRules.budget.maximumCustomAbilities}>+ Новый навык</ActionButton>
      </section>
      <section className={styles.section}>
        <header><h3>Особенности</h3><span>Без очков · {skills.narrativeItems.length} / {abilityRules.narrativeAbilities.maximum}</span></header>
        <small>Профессия, привычка или талант без числового усиления. Применение определяет мастер.</small>
        {skills.narrativeItems.map((item) => <NarrativeEditor key={item.id} item={item} onChange={editing.changeNarrative}
          onRemove={() => editing.removeNarrative(item.id)} />)}
        <ActionButton tone="secondary" onClick={editing.addNarrative} disabled={skills.narrativeItems.length >= abilityRules.narrativeAbilities.maximum}>+ Новая особенность</ActionButton>
      </section>
      {media.iconError && <p role="alert">{media.iconError}</p>}
      {balance.issues.length > 0 && <ul className={styles.issues} role="status">{balance.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
      <ActionButton disabled={balance.issues.length > 0 || confirmed} onClick={editing.confirm}>
        {confirmed ? '✓ Набор навыков подтверждён' : 'Подтвердить набор навыков'}
      </ActionButton>
      <small>Можно оставить только базовую атаку. Остаток очков навыков расходовать необязательно.</small>
    </div>
  );
}
