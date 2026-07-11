import type {AppView} from '../../../../shared/lib/navigation/regionHash';
import styles from './AppNavigation.module.css';

interface AppNavigationProps {
  activeView: AppView;
  onAtlas: () => void;
  onHeroes: () => void;
}

export function AppNavigation({activeView, onAtlas, onHeroes}: AppNavigationProps) {
  return (
    <nav className={styles.navigation} aria-label="Основная навигация">
      <div className={styles.brand}><span>✦</span><strong>Хроники Восьми Земель</strong></div>
      <div className={styles.links}>
        <button className={activeView === 'atlas' ? styles.active : ''} type="button" onClick={onAtlas}>Карта</button>
        <button className={activeView === 'heroes' ? styles.active : ''} type="button" onClick={onHeroes}>Герои</button>
      </div>
    </nav>
  );
}
