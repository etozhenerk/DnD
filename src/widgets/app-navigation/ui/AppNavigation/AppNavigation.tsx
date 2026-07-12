import type {AppView} from '../../../../shared/lib/navigation/regionHash';
import styles from './AppNavigation.module.css';

interface AppNavigationProps {
  activeView: AppView;
  onAtlas: () => void;
  onHeroes: () => void;
}

export function AppNavigation({activeView, onAtlas, onHeroes}: AppNavigationProps) {
  const isAtlasActive = activeView === 'atlas' || activeView === 'region';

  return (
    <nav className={styles.navigation} aria-label="Основная навигация">
      <div className={styles.brand}>
        <span className={styles.sigil} aria-hidden="true">D20</span>
        <div><small>D&amp;D кампании</small><strong>Атлас приключений</strong></div>
      </div>
      <div className={styles.links}>
        <button aria-current={isAtlasActive ? 'page' : undefined} className={isAtlasActive ? styles.active : ''} type="button" onClick={onAtlas}><span aria-hidden="true">⌖</span>Карта</button>
        <button aria-current={activeView === 'heroes' ? 'page' : undefined} className={activeView === 'heroes' ? styles.active : ''} type="button" onClick={onHeroes}><span aria-hidden="true">♜</span>Герои</button>
      </div>
    </nav>
  );
}
