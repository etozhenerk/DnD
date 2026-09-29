import {type ReactNode, useId, useRef, useState} from 'react';
import type {CombatMechanicsHelpView} from '../../../../entities/combat/model/view';
import styles from './CombatMechanicsHelp.module.css';

interface CombatMechanicsHelpProps {
  actionName: string;
  help: CombatMechanicsHelpView;
  contextLabel?: string;
  trigger?: {content: ReactNode; className: string; label: string};
}

export function CombatMechanicsHelp({actionName, help, contextLabel, trigger}: CombatMechanicsHelpProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className={trigger?.className ?? styles.trigger}
        type="button"
        title={`Как работает «${actionName}»`}
        aria-label={trigger?.label ?? `Открыть точное описание механики «${actionName}»`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          dialogRef.current?.showModal();
          setOpen(true);
        }}
      >
        {trigger?.content ?? '?'}
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
            <header className={styles.heading}>
              <div>
                <span>{contextLabel ?? 'Словарь эффектов'}</span>
                <h2 id={titleId}>{actionName}</h2>
              </div>
              <button type="button" autoFocus onClick={() => dialogRef.current?.close()} aria-label="Закрыть описание механики">
                <span aria-hidden="true">×</span>
              </button>
            </header>

            <dl className={styles.glossary}>
              {help.entries.map((entry) => (
                <div key={entry.term}>
                  <dt>{entry.term}</dt>
                  <dd>{entry.description}</dd>
                </div>
              ))}
            </dl>
      </dialog>
    </>
  );
}
