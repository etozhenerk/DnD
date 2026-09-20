import {useEffect, useId, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import styles from './SceneDecisionModal.module.css';

export interface SceneDecisionOption {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  closeOnSelect?: boolean;
}

interface SceneDecisionModalProps {
  children?: ReactNode;
  size?: 'standard' | 'wide';
  layer?: 'standard' | 'reward';
  description?: string;
  optionsLabel?: string;
  dismissible?: boolean;
  eyebrow?: string;
  onClose: () => void;
  open: boolean;
  options: SceneDecisionOption[];
  optionsInitiallyVisible?: boolean;
  revealLabel?: string;
  title: string;
}

export function SceneDecisionModal({
  children,
  size = 'standard',
  layer = 'standard',
  description,
  optionsLabel = 'Доступные решения',
  dismissible = true,
  eyebrow = 'Панель мастера',
  onClose,
  open,
  options,
  optionsInitiallyVisible = false,
  revealLabel = 'Показать варианты действий',
  title,
}: SceneDecisionModalProps) {
  const [revealed, setRevealed] = useState(optionsInitiallyVisible);
  const titleId = useId();

  useEffect(() => {
    if (!open) setRevealed(false);
    else if (optionsInitiallyVisible) setRevealed(true);
  }, [open, optionsInitiallyVisible]);

  useEffect(() => {
    if (!open || !dismissible) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [dismissible, onClose, open]);

  if (!open) return null;

  return createPortal((
    <div
      className={`${styles.backdrop} ${layer === 'reward' ? styles.rewardLayer : ''}`}
      role="presentation"
      onMouseDown={dismissible ? onClose : undefined}
    >
      <section
        className={`${styles.modal} ${size === 'wide' ? styles.wide : ''}`}
        role={dismissible ? 'dialog' : 'alertdialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            {eyebrow ? <span>{eyebrow}</span> : null}
            <h2 id={titleId}>{title}</h2>
          </div>
          {dismissible ? (
            <button type="button" onClick={onClose} aria-label="Закрыть панель выбора">×</button>
          ) : null}
        </header>

        {description ? <p>{description}</p> : null}

        {children}

        {options.length && revealed ? (
          <div className={styles.options}>
            {optionsLabel ? <span>{optionsLabel}</span> : null}
            {options.map((option) => (
              <button
                disabled={option.disabled}
                key={option.id}
                type="button"
                onClick={() => {
                  option.onSelect();
                  if (option.closeOnSelect !== false) onClose();
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : options.length ? (
          <button className={styles.reveal} type="button" onClick={() => setRevealed(true)}>
            {revealLabel}
          </button>
        ) : null}
      </section>
    </div>
  ), document.body);
}
