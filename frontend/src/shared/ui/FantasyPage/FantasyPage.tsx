import type {ReactNode} from 'react';
import {pageBackground} from './page-background';
import styles from './FantasyPage.module.css';

export type FantasyPageProps = {children: ReactNode};

export function FantasyPage({children}: FantasyPageProps) {
  return <main className={styles.page} style={pageBackground}><div className={styles.content}>{children}</div></main>;
}
