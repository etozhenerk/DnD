import type {CSSProperties} from 'react';
import {useEffect, useId, useRef, useState} from 'react';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import type {CombatantView} from './combatTypes';
import {combatPortraitStyle} from './combatPortraitStyle';
import styles from './CombatJournalDialog.module.css';

interface CombatJournalDialogProps {
  combatants: CombatantView[];
  logs: string[];
}

function splitCombatLog(message: string) {
  const separator = message.indexOf(':');
  if (separator > 0 && separator < 36) return {
    actor: message.slice(0, separator),
    detail: message.slice(separator + 1).trim(),
  };
  return {actor: 'Сцена', detail: message};
}

export function CombatJournalDialog({combatants, logs}: CombatJournalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const logRef = useRef<HTMLOListElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || !logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs, open]);

  return (
    <>
      <button
        className={styles.trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          dialogRef.current?.showModal();
          setOpen(true);
        }}
      >
        <span aria-hidden="true">☷</span>
        <strong>Журнал боя</strong>
        <b>{logs.length}</b>
      </button>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className={styles.surface}>
          <header className={styles.heading}>
            <div>
              <span>История раунда</span>
              <h2 id={titleId}>Журнал боя</h2>
            </div>
            <button type="button" autoFocus onClick={() => dialogRef.current?.close()} aria-label="Закрыть журнал боя">
              <span aria-hidden="true">×</span>
            </button>
          </header>

          <ol className={styles.log} ref={logRef} aria-live="polite">
            {logs.length ? logs.map((message, index) => {
              const entry = splitCombatLog(message);
              const actor = combatants.find((combatant) => combatant.name === entry.actor);
              return (
                <li
                  key={`${index}-${message}`}
                  style={actor ? combatPortraitStyle(actor) as CSSProperties : undefined}
                >
                  {actor ? (
                    <span className={styles.avatarFrame} aria-hidden="true">
                      <img src={resolveAsset(actor.token)} alt="" />
                    </span>
                  ) : <span className={styles.sceneMarker} aria-hidden="true">◆</span>}
                  <span className={styles.copy}>
                    <b>{entry.actor}</b>
                    <span>{entry.detail}</span>
                  </span>
                </li>
              );
            }) : <li className={styles.empty}>Журнал пока пуст.</li>}
          </ol>
        </div>
      </dialog>
    </>
  );
}
