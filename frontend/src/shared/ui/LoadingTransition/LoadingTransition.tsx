import type {ReactNode} from 'react';
import {useLoadingTransition} from '../../lib/loading-transition';
import styles from './LoadingTransition.module.css';

export type LoadingTransitionProps = {
  loading: boolean;
  placeholder: ReactNode;
  children: ReactNode;
};

export function LoadingTransition({loading, placeholder, children}: LoadingTransitionProps) {
  const container = useLoadingTransition(loading);
  return (
    <div ref={container} className={styles.region} data-loading={loading || undefined}>
      <div className={styles.placeholder} aria-hidden={!loading} inert={!loading}>{placeholder}</div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
