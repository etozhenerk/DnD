import styles from './FantasyCorner.module.css';

export type FantasyCornerProps = {className: string};

export function FantasyCorner({className}: FantasyCornerProps) {
  return (
    <svg className={`${styles.corner} ${className}`} viewBox="0 0 48 48" fill="none">
      <path className={styles.outline} d="M3 43V16L16 3h27M9 37V19L19 9h18" />
      <path className={styles.engraving} d="M8 31c17 0 23-6 23-23M14 28c-6-7-1-17 5-13 6 5-1 12-5 9M28 14c-7-6-17-1-13 5 5 6 12-1 9-5" />
      <path className={styles.jewel} d="m8 8 5-5 5 5-5 5Z" />
      <path className={styles.engraving} d="M3 39h6M39 3v6M13 3v10M3 13h10" />
    </svg>
  );
}
