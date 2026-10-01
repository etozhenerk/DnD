import styles from './RouteFallback.module.css';
import {LoadingIndicator} from '../../../shared/ui/LoadingIndicator';

export function RouteFallback() {
  return (
    <main className={styles.fallback}>
      <LoadingIndicator label="Открываем страницу" />
    </main>
  );
}
