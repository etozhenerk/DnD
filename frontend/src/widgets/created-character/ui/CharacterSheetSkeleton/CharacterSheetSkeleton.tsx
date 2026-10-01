import {CharacterPortrait} from '../../../../entities/character';
import {Skeleton} from '../../../../shared/ui/Skeleton';
import sheet from '../CharacterSheet/CharacterSheet.module.css';
import styles from './CharacterSheetSkeleton.module.css';

export function CharacterSheetSkeleton() {
  return (
    <article className={styles.loading} role="status" aria-label="Загружаем персонажа" aria-busy="true">
      <div aria-hidden="true">
        <header className={styles.header}>
          <Skeleton width="short" />
          <Skeleton shape="heading" className={styles.name} />
        </header>
        <div className={sheet.overview}>
          <div className={`${sheet.portrait} ${styles.still}`}><CharacterPortrait name="Будущий образ героя" /></div>
          <div className={`${sheet.facts} ${styles.panel} ${styles.still}`}>
            <Skeleton shape="heading" width="medium" />
            <div className={styles.vitals}><Skeleton /><Skeleton /></div>
            <Skeleton width="medium" />
            <div className={styles.attributes}>
              {[1, 2, 3, 4, 5, 6].map((attribute) => (
                <div key={attribute} className={styles.attribute}><Skeleton width="medium" /><Skeleton className={styles.value} /></div>
              ))}
            </div>
          </div>
          <div className={`${sheet.story} ${styles.panel} ${styles.still}`}>
            <Skeleton shape="heading" width="medium" />
            <div className={styles.lines}><Skeleton /><Skeleton /><Skeleton width="medium" /></div>
            <Skeleton shape="heading" width="short" />
            <div className={styles.lines}><Skeleton /><Skeleton width="medium" /></div>
          </div>
        </div>
        <div className={`${sheet.collections} ${styles.still}`}>
          {[1, 2].map((section) => (
            <section key={section} className={styles.panel}>
              <Skeleton shape="heading" width="short" />
              <div className={styles.lines}><Skeleton /><Skeleton /><Skeleton width="medium" /></div>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
