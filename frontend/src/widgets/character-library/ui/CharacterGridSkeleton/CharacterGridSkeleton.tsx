import {CharacterCardSkeleton} from '../../../../entities/character';
import styles from '../CharacterGrid/CharacterGrid.module.css';

export function CharacterGridSkeleton() {
  return (
    <div className={styles.grid} role="status" aria-label="Загружаем список персонажей" aria-busy="true">
      {[1, 2, 3].map((slot) => <CharacterCardSkeleton key={slot} />)}
    </div>
  );
}
