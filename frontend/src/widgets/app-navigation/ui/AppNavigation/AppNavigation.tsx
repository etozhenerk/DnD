import {useState} from 'react';
import {useLocation} from 'react-router-dom';
import {navigationArt} from '../../config/navigation-art';
import {NavigationBrand} from '../NavigationBrand';
import {NavigationLinks} from '../NavigationLinks';
import {AccountEntry} from '../AccountEntry';
import styles from './AppNavigation.module.css';

export function AppNavigation() {
  const {pathname} = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAtlasActive = pathname === '/' || pathname.startsWith('/region/');

  return (
    <header className={styles.navigation} style={navigationArt} onKeyDown={(event) => {if (event.key === 'Escape') setMenuOpen(false);}}>
      <NavigationBrand />
      <div id="app-navigation-links" className={`${styles.linksPanel} ${menuOpen ? styles.expanded : ''}`}>
        <NavigationLinks isAtlasActive={isAtlasActive} onNavigate={() => setMenuOpen(false)} />
      </div>
      <div className={styles.actions}>
        <AccountEntry />
        <button className={styles.menuToggle} type="button" aria-controls="app-navigation-links"
          aria-expanded={menuOpen} aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'} onClick={() => setMenuOpen(!menuOpen)}>
          <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
        </button>
      </div>
    </header>
  );
}
