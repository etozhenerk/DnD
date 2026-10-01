import {getAttributeBalance, getBuildVitals, getSelectedClass} from '../../../../entities/character-form';
import type {CharacterFormController} from '../../../../entities/character-form';
import {CharacterVitals} from '../../../../entities/character';
import {AttributeFields} from '../../../../features/edit-character-attributes';
import {ActionButton} from '../../../../shared/ui/ActionButton';
import {AttributeBudget} from '../AttributeBudget';
import styles from './AttributeStep.module.css';

export type AttributeStepProps = {controller: CharacterFormController};

export function AttributeStep({controller}: AttributeStepProps) {
  const attributes = controller.formData.attributes ?? {};
  const profile = getSelectedClass(controller.formData);
  const balance = getAttributeBalance(attributes, profile);
  const vitals = getBuildVitals(controller.formData, attributes);
  return (
    <div className={styles.step}>
      <AttributeBudget balance={balance} />
      {profile && <AttributeFields value={attributes} profile={profile} onChange={(value) => controller.setSection('attributes', value)} />}
      {vitals && <CharacterVitals {...vitals} />}
      {profile && <div className={styles.actions}>
        <ActionButton tone="secondary" onClick={() => controller.setSection('attributes', {...profile.defaultStats})}>Сбалансированный вариант</ActionButton>
        <ActionButton tone="secondary" onClick={() => controller.setSection('attributes', {...profile.baseStats})}>Сбросить усиления</ActionButton>
      </div>}
      <small>Основа класса сохраняется. Можно усиливать сильные стороны или компенсировать слабые; «−» возвращает только ваши дополнительные очки.</small>
    </div>
  );
}
