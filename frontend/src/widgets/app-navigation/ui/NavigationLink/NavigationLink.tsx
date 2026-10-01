import {NavLink} from 'react-router-dom';
import {useViewTransitions} from '../../../../shared/lib/view-transitions';
import styles from './NavigationLink.module.css';

export type NavigationLinkProps = {
  to: string;
  label: string;
  icon: string;
  isAtlasActive: boolean;
  onNavigate: () => void;
};

export function NavigationLink({to, label, icon, isAtlasActive, onNavigate}: NavigationLinkProps) {
  const viewTransition = useViewTransitions();
  return (
    <NavLink end={to === '/'} to={to} onClick={onNavigate} viewTransition={to === '/characters' && viewTransition}
      aria-current={to === '/' && isAtlasActive ? 'page' : undefined}
      className={({isActive}) => (to === '/' ? isAtlasActive : isActive) ? styles.active : styles.link}>
      <span aria-hidden="true">{icon}</span>{label}
    </NavLink>
  );
}
