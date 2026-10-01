import {creationRules, getSelectedClass} from '../../../../entities/character-form';
import type {CharacterFormController} from '../../../../entities/character-form';
import {ClassChoices} from '../../../../features/select-character-class';
import {ClassDescription} from '../ClassDescription';
import {ClassChangeConfirmation} from '../ClassChangeConfirmation';
import styles from './ClassStep.module.css';

export type ClassStepProps = {controller: CharacterFormController};

export function ClassStep({controller}: ClassStepProps) {
  const profile = getSelectedClass(controller.formData);
  return (
    <div className={styles.step}>
      <p className={styles.hint}>{creationRules.classSelection.explanation}</p>
      <ClassChoices value={profile?.id} onChange={controller.selectClass} />
      <ClassChangeConfirmation controller={controller} />
      {profile && <ClassDescription profile={profile} />}
    </div>
  );
}
