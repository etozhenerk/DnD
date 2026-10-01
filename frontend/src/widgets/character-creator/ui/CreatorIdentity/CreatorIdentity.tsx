import {getFormName, getSelectedRace, getSelectedClass} from '../../../../entities/character-form';
import type {CharacterForm} from '../../../../entities/character-form';
import {heroPortrait} from '../../config/creator-art';
import {PortraitImage} from '../../../../shared/ui/PortraitImage';
import {CreatorAttributePreview} from '../CreatorAttributePreview';
import styles from './CreatorIdentity.module.css';

export type CreatorIdentityProps = {form: CharacterForm; portrait?: string};

export function CreatorIdentity({form, portrait}: CreatorIdentityProps) {
  const race = getSelectedRace(form.formData);
  const profile = getSelectedClass(form.formData);
  return (
    <aside className={styles.identity} aria-label={`Предпросмотр: ${getFormName(form)}`}>
      <div className={styles.art}>
        {portrait ? <PortraitImage src={portrait} alt={getFormName(form)} className={styles.uploaded} />
          : <img className={styles.placeholder} src={heroPortrait} alt="Персонаж в капюшоне: образ ещё не выбран" />}
      </div>
      <div className={styles.sheet}>
        <div className={styles.choices}>
          <span>Раса <small>{race?.name ?? 'ещё не выбрана'}</small></span>
          <span>Класс <small>{profile?.name ?? 'ещё не выбран'}</small></span>
        </div>
        <CreatorAttributePreview formData={form.formData} />
      </div>
    </aside>
  );
}
