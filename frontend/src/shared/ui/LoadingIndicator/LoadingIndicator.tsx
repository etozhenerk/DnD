import styles from './LoadingIndicator.module.css';

export type LoadingIndicatorProps = {label: string};

export function LoadingIndicator({label}: LoadingIndicatorProps) {
  return (
    <span className={styles.loader} role="status" aria-busy="true">
      <span className={styles.rune} aria-hidden="true">✧</span>
      <span>{label}</span>
    </span>
  );
}
