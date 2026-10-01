import {Skeleton} from '../../../../shared/ui/Skeleton';
import card from '../CreatedCharacterCard/CreatedCharacterCard.module.css';
import styles from './CharacterCardSkeleton.module.css';

export function CharacterCardSkeleton() {
  return (
    <article className={`${card.card} ${styles.skeleton}`} aria-hidden="true">
      <Skeleton shape="image" className={card.portrait} />
      <div className={card.content}>
        <div className={`${card.identity} ${styles.identity}`}>
          <Skeleton shape="heading" width="medium" />
          <Skeleton width="short" />
        </div>
        <div className={card.stats}><Skeleton className={styles.vitals} /></div>
        <Skeleton width="medium" className={styles.link} />
      </div>
    </article>
  );
}
