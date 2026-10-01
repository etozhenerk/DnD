import type {LocalImage} from '../../../../shared/lib/local-images';
import {FantasyIcon} from '../../../../shared/ui/FantasyIcon';
import {PortraitImage} from '../../../../shared/ui/PortraitImage';
import styles from './PortraitGallery.module.css';

export type PortraitGalleryProps = {
  images: readonly LocalImage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onUpload: (files: FileList | null) => void;
  error: string;
};

export function PortraitGallery({images, selectedId, onSelect, onRemove, onUpload, error}: PortraitGalleryProps) {
  return (
    <section className={styles.gallery} aria-label="Варианты портрета">
      <header><span>Варианты портрета</span><small>{images.length}/8</small></header>
      <div className={styles.rail} tabIndex={0} aria-label="Сравнить портреты, горизонтальная галерея">
        {images.map((image, index) => <div className={styles.option} key={image.id}>
          <button className={styles.portrait} type="button" aria-pressed={selectedId === image.id}
            onClick={() => onSelect(image.id)} aria-label={'Выбрать портрет ' + (index + 1) + ': ' + image.name}>
            <PortraitImage src={image.url} alt={image.name} className={styles.image} /><span>Вариант {index + 1}</span>
          </button>
          <button className={styles.remove} type="button" onClick={() => onRemove(image.id)}
            aria-label={'Удалить портрет ' + (index + 1)}>×</button>
        </div>)}
        <label className={styles.upload}>
          <FantasyIcon name="upload" /><span>Добавить портреты</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" multiple aria-label="Загрузить варианты портрета"
            onChange={(event) => { onUpload(event.target.files); event.target.value = ''; }} />
        </label>
      </div>
      <small>Выберите несколько файлов и сравните их рядом. PNG, JPG или WebP до 10 МБ.</small>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  );
}
