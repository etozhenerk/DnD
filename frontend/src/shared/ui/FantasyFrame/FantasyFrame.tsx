import {FantasyCorner} from './FantasyCorner';
import styles from './FantasyFrame.module.css';

export function FantasyFrame() {
  return (
    <span className={styles.frame} aria-hidden="true">
      <FantasyCorner className={styles.topLeft} />
      <FantasyCorner className={styles.topRight} />
      <FantasyCorner className={styles.bottomRight} />
      <FantasyCorner className={styles.bottomLeft} />
    </span>
  );
}
