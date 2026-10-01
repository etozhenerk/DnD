import {abilityRules, getSelectedClass, getSelectedRace, getBuildVitals, getProfileLabel} from '../../../../entities/character-form';
import type {CharacterFormController} from '../../../../entities/character-form';
import {CharacterAttributeList, CharacterVitals, getCharacterAttributeRows, getAttributeLabel} from '../../../../entities/character';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene';
import {SaveCharacterAction} from '../../../../features/save-character';
import type {SaveCharacterController} from '../../../../features/save-character';
import {ReviewSection} from '../ReviewSection';
import styles from './ReviewStep.module.css';

export type ReviewStepProps = {controller: CharacterFormController; saving: SaveCharacterController; hasLocalMedia: boolean};

export function ReviewStep({controller, saving, hasLocalMedia}: ReviewStepProps) {
  const {formData, appearance, skills} = controller;
  const attributes = formData.attributes ?? {};
  const vitals = getBuildVitals(formData, attributes);
  const race = getSelectedRace(formData);
  return (
    <div className={styles.review}>
      <div className={styles.ready}>✓ Все этапы заполнены</div>
      <ReviewSection title="Личность" step="appearance">
        <h4>{appearance.displayName}</h4>
        <p>{race?.name} · {getSelectedClass(formData)?.name}{appearance.pronouns && <> · {appearance.pronouns}</>}</p>
        <SceneTextPanel collapsible={false} resetKey="creation-review" className={styles.story}>
          {appearance.story && <p>{appearance.story}</p>}
          {appearance.appearance && <p>Внешность: {appearance.appearance}</p>}
          {appearance.personality.length > 0 && <p>Характер: {appearance.personality.join(' · ')}</p>}
          {appearance.motivation && <p>Цель: {appearance.motivation}</p>}
        </SceneTextPanel>
      </ReviewSection>
      {race && <ReviewSection title="Расовая особенность" step="race">
        <p><strong>{race.feature.name}</strong> · {race.feature.effect}</p>
      </ReviewSection>}
      <ReviewSection title="Характеристики" step="attributes">
        <CharacterAttributeList rows={getCharacterAttributeRows(attributes)} />
        {vitals && <CharacterVitals {...vitals} />}
      </ReviewSection>
      <ReviewSection title="Навыки" step="abilities">
        <ul>
          <li><strong>{skills.basicAction.name}</strong><small>{abilityRules.basicAction.dice.count}d{abilityRules.basicAction.dice.sides} + {getAttributeLabel(skills.basicAction.modifierStat)} · без зарядов</small>
            {skills.basicAction.description && <p>{skills.basicAction.description}</p>}</li>
          {skills.items.map((skill) => <li key={skill.id}><strong>{skill.name}</strong>
            <small>{getProfileLabel(skill.profileId)} · {getAttributeLabel(skill.modifierStat)}</small>
            {skill.description && <p>{skill.description}</p>}</li>)}
          {skills.narrativeItems.map((item) => <li key={item.id}><strong>{item.name}</strong><p>{item.description}</p><small>Повествовательная особенность</small></li>)}
        </ul>
      </ReviewSection>
      <ReviewSection title="Снаряжение" step="equipment">
        <ul>{formData.equipment?.items.map((item) => <li key={item.id}><strong>{item.name}</strong>{item.description && <p>{item.description}</p>}</li>)}</ul>
        {!formData.equipment?.items.length && <p>Герой отправляется в путь без снаряжения.</p>}
      </ReviewSection>
      <SaveCharacterAction controller={saving} hasLocalMedia={hasLocalMedia} />
    </div>
  );
}
