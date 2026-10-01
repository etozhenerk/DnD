import {fantasyIconPaths} from './icon-paths';
import type {FantasyIconName} from './icon-paths';
import styles from './FantasyIcon.module.css';

export type FantasyIconProps = {name: FantasyIconName};

export function FantasyIcon({name}: FantasyIconProps) {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {fantasyIconPaths[name].map((path) => <path key={path} d={path} />)}
    </svg>
  );
}
