import styles from './CombatVictoryDialog.module.css';

interface CombatVictoryDialogProps {
  encounterName: string;
  onConfirm: () => void;
  round: number;
  summary: string;
  wordmark?: string;
}

export function CombatVictoryDialog({encounterName, onConfirm, round, summary, wordmark}: CombatVictoryDialogProps) {
  return (
    <div className={styles.backdrop} role="presentation">
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="combat-victory-title"
        aria-describedby="combat-victory-summary"
      >
        <p className={styles.eyebrow}>Бой завершён · Раунд {round}</p>
        <h2 className={styles.victoryTitle} id="combat-victory-title">
          {wordmark ? (
            <>
              <span className={styles.visuallyHidden}>Победа</span>
              <img className={styles.victoryWordmark} src={wordmark} alt="" aria-hidden="true" />
            </>
          ) : 'Победа'}
        </h2>
        <span className={styles.ornament} aria-hidden="true">◆</span>
        <strong>{encounterName}</strong>
        <p className={styles.summary} id="combat-victory-summary">{summary}</p>
        <button type="button" onClick={onConfirm} autoFocus>ОК</button>
      </section>
    </div>
  );
}
