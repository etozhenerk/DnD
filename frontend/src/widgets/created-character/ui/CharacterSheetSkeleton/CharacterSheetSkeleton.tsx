import {Skeleton} from '../../../../shared/ui/Skeleton';
import {FantasyHeading} from '../../../../shared/ui/FantasyHeading';
import sheet from '../CharacterSheet/CharacterSheet.module.css';
import header from '../CharacterHeader/CharacterHeader.module.css';
import facts from '../CharacterFacts/CharacterFacts.module.css';
import styles from './CharacterSheetSkeleton.module.css';

export function CharacterSheetSkeleton() {
  return (
    <article className={styles.loading} role="status" aria-label="Загружаем персонажа" aria-busy="true">
      <div aria-hidden="true">
        <header className={header.header}>
          <p className={header.origin}><Skeleton width="short" className={styles.origin} /></p>
          <h1><Skeleton shape="heading" className={styles.name} /></h1>
        </header>
        <div className={sheet.overview}>
          <Skeleton shape="image" className={`${sheet.portrait} ${styles.portrait} ${styles.still}`} />
          <div className={`${sheet.facts} ${facts.facts} ${styles.still}`}>
            <FantasyHeading>Параметры</FantasyHeading>
            <div className={`${facts.vitals} ${styles.vitals}`}><Skeleton /><Skeleton /></div>
            <h3 className={facts.caption}>Характеристики</h3>
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
