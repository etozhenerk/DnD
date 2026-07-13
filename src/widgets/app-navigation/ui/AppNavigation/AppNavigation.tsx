import {NavLink, useLocation} from 'react-router-dom';
import styles from './AppNavigation.module.css';

export function AppNavigation() {
  const {pathname} = useLocation();
  const isAtlasActive = pathname === '/' || pathname.startsWith('/region/');

  const getLinkClass = ({isActive}: {isActive: boolean}) => isActive ? styles.active : undefined;

  return (
    <nav className={styles.navigation} aria-label="Основная навигация">
      <NavLink className={styles.brand} to="/" aria-label="Атлас приключений — на карту">
        <span className={styles.sigil} aria-hidden="true">D20</span>
        <span className={styles.brandText}><small>D&amp;D кампании</small><strong>Атлас приключений</strong></span>
      </NavLink>
      <div className={styles.links}>
        <NavLink end aria-current={isAtlasActive ? 'page' : undefined} className={isAtlasActive ? styles.active : undefined} to="/"><span aria-hidden="true">⌖</span>Карта</NavLink>
        <NavLink className={getLinkClass} to="/heroes"><span aria-hidden="true">♜</span>Герои</NavLink>
        <NavLink className={getLinkClass} to="/roadmap"><span aria-hidden="true">◫</span>Roadmap</NavLink>
      </div>
    </nav>
  );
}
