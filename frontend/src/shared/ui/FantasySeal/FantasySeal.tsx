import styles from './FantasySeal.module.css';

export function FantasySeal() {
  return (
    <svg className={styles.seal} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <circle cx="50" cy="50" r="46" />
      <circle cx="50" cy="50" r="40" />
      <path d="M50 13 82 31 82 69 50 87 18 69 18 31Z" />
      <path d="m50 13 18 49-50-31 32 56 32-56-50 31Z" />
      <path d="M18 69h64M50 87 32 62M68 62l14 7" />
      <path className={styles.star} d="m50 37 3 9 9 4-9 3-3 10-3-10-9-3 9-4Z" />
    </svg>
  );
}
