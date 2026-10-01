import {getPreviewAttributes} from '../../model/preview-attributes';
import {CharacterAttributeList} from '../../../../entities/character';
import styles from './CreatorAttributePreview.module.css';

export type CreatorAttributePreviewProps = {formData: Record<string, unknown>};

export function CreatorAttributePreview({formData}: CreatorAttributePreviewProps) {
  return (
    <section className={styles.attributes} aria-label="Характеристики будущего героя">
      <h2>Характеристики</h2>
      <CharacterAttributeList rows={getPreviewAttributes(formData)} compact />
      <small>{formData.attributes ? 'Модификаторы вашего героя' : 'Значения появятся после выбора класса.'}</small>
    </section>
  );
}
