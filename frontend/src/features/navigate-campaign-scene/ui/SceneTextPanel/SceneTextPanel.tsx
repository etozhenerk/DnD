import {useEffect, useId, useState, type ReactNode} from 'react';
import styles from './SceneTextPanel.module.css';

interface SceneTextPanelProps {
  appearance?: 'default' | 'narration';
  children?: ReactNode;
  className?: string;
  collapsible?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
  primaryAction?: {label: string; onSelect: () => void; disabled?: boolean};
  readAloud?: ReactNode;
  resetKey: string;
}

export function SceneTextPanel({
  appearance = 'default',
  children,
  className,
  collapsible = true,
  onVisibilityChange,
  primaryAction,
  readAloud,
  resetKey,
}: SceneTextPanelProps) {
  const [visible, setVisible] = useState(true);
  const panelId = useId();
  const hasNarration = readAloud !== undefined;

  useEffect(() => {
    setVisible(true);
  }, [resetKey]);

  if (collapsible && !visible) {
    return (
      <button
        className={styles.restore}
        type="button"
        aria-controls={panelId}
        aria-expanded="false"
        onClick={() => {
          setVisible(true);
          onVisibilityChange?.(true);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 15 6-6 6 6" />
        </svg>
        Показать описание сцены
      </button>
    );
  }

  return (
    <section
      className={`${className ?? ''} ${styles.panel} ${appearance === 'narration' ? styles.narration : ''}`}
      id={panelId}
    >
      {collapsible ? (
        <button
          className={styles.collapse}
          type="button"
          aria-controls={panelId}
          aria-expanded="true"
          aria-label="Скрыть описание сцены вниз"
          title="Скрыть описание сцены"
          onClick={() => {
            setVisible(false);
            onVisibilityChange?.(false);
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      ) : null}
      {hasNarration ? (
        <div className={styles.narrationCopy} data-scene-narration-copy>
          <p className={styles.narrator} data-scene-narrator>Рассказчик</p>
          <p className={styles.readAloud} data-scene-read-aloud>{readAloud}</p>
        </div>
      ) : children}
      {primaryAction ? (
        <button className={styles.primaryAction} type="button" disabled={primaryAction.disabled} onClick={primaryAction.onSelect}>
          {primaryAction.label}
        </button>
      ) : null}
    </section>
  );
}
