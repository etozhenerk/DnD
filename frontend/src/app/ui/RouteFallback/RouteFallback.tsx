import styles from './RouteFallback.module.css';

export function RouteFallback() {
  return (
    <main className={styles.fallback} aria-live="polite">
      <span aria-hidden="true">✦</span>
      <p>Открываем нужную страницу…</p>
    </main>
  );
}
