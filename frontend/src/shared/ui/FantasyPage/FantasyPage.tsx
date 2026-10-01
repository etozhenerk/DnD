import type {ReactNode} from 'react';
import {usePageScrollReset} from '../../lib/page-scroll';
import {pageBackground} from './page-background';
import styles from './FantasyPage.module.css';

export type FantasyPageProps = {
  children: ReactNode;
  layout?: 'reading' | 'workspace';
  animated?: boolean;
};

export function FantasyPage({children, layout = 'reading', animated = false}: FantasyPageProps) {
  usePageScrollReset(animated);
  return (
    <main className={`${styles.page} ${layout === 'workspace' ? styles.workspace : ''}`} style={pageBackground}>
      <div className={`${styles.content} ${animated ? styles.animated : ''}`}>{children}</div>
    </main>
  );
}
