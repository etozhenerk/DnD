import {Skeleton} from '../../../../shared/ui/Skeleton';
import card from '../CreatedCharacterCard/CreatedCharacterCard.module.css';
import styles from './CharacterCardSkeleton.module.css';

export function CharacterCardSkeleton() {
  return (
    <article className={`${card.card} ${styles.skeleton}`} aria-hidden="true">
      <Skeleton shape="image" className={card.portrait} />
      <div className={card.content}>
        <div className={card.identity}>
          <Skeleton shape="heading" width="medium" className={styles.title} />
          <Skeleton width="short" className={styles.race} />
        </div>
        <div className={card.stats}><Skeleton className={styles.vitals} /></div>
        <div className={card.open}><Skeleton width="medium" className={styles.link} /></div>
      </div>
    </article>
  );
}
