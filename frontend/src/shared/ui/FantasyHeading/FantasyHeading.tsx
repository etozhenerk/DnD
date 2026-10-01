import type {ReactNode} from 'react';
import {FantasyIcon} from '../FantasyIcon';
import styles from './FantasyHeading.module.css';

export type FantasyHeadingProps = {children: ReactNode; id?: string};

export function FantasyHeading({children, id}: FantasyHeadingProps) {
  return (
    <h2 className={styles.heading} id={id}>
      <span className={styles.symbol} aria-hidden="true"><FantasyIcon name="sun" /></span>
      <span className={styles.title}>{children}</span>
    </h2>
  );
}
