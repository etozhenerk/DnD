import styles from './CombatDefeatFallbackDialog.module.css';

interface CombatDefeatFallbackDialogProps {
  onConfirm: () => void;
  summary: string;
}

export function CombatDefeatFallbackDialog({onConfirm, summary}: CombatDefeatFallbackDialogProps) {
  return (
    <div className={styles.backdrop} role="presentation">
      <section
        aria-describedby="combat-defeat-fallback-summary"
        aria-labelledby="combat-defeat-fallback-title"
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
      >
        <p className={styles.eyebrow}>Fail-forward · смертей нет</p>
        <h2 id="combat-defeat-fallback-title">Аварийное продолжение</h2>
        <span className={styles.ornament} aria-hidden="true">◆</span>
        <p className={styles.summary} id="combat-defeat-fallback-summary">{summary}</p>
        <button type="button" onClick={onConfirm} autoFocus>Продолжить кампанию</button>
      </section>
    </div>
  );
}
