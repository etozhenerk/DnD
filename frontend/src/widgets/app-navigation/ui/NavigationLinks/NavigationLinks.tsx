import {navigationLinks} from '../../config/navigation-links';
import {NavigationLink} from '../NavigationLink';
import styles from './NavigationLinks.module.css';

export type NavigationLinksProps = {isAtlasActive: boolean; onNavigate: () => void};

export function NavigationLinks({isAtlasActive, onNavigate}: NavigationLinksProps) {
  return (
    <nav className={styles.links} aria-label="Основная навигация">
      {navigationLinks.map((link) => (
        <NavigationLink key={link.to} {...link} isAtlasActive={isAtlasActive} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}
