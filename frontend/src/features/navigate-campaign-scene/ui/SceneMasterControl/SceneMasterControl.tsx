import {useContext, useEffect, useId, useRef, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Link} from 'react-router-dom';
import styles from './SceneMasterControl.module.css';
import {CampaignSoundtrackContext} from '../../model/campaignSoundtrack';

export interface SceneMasterAction {
  id: string;
  label: string;
  detail?: string;
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
  keepOpen?: boolean;
}

interface SceneMasterControlProps {
  actions?: SceneMasterAction[];
  actionsLabel?: string;
  backHref?: string;
  masterContent?: ReactNode;
  onRestartScene?: () => void;
  onStepBack?: () => void;
  sceneTitle: string;
}

export function SceneMasterControl({
  actions = [],
  actionsLabel = 'Проверки и решения',
  backHref,
  masterContent,
  onRestartScene,
  onStepBack,
  sceneTitle,
}: SceneMasterControlProps) {
  const [open, setOpen] = useState(false);
  const soundtrack = useContext(CampaignSoundtrackContext);
  const menuId = useId();
  const controlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !controlRef.current?.contains(event.target)) {
        if (!masterContent) setOpen(false);
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, [masterContent, open]);

  const runAction = (action: SceneMasterAction) => {
    action.onSelect?.();
    if (!action.keepOpen) setOpen(false);
  };

  const runPrimaryAction = (action: () => void) => {
    action();
    setOpen(false);
  };

  return createPortal((
    <div className={styles.control} ref={controlRef}>
      <button
        className={styles.trigger}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Открыть управление мастера"
        data-label="Управление мастера"
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M6 22 4 10l7 5 5-9 5 9 7-5-2 12H6Z" />
          <path d="M7 25h18" />
          <circle cx="16" cy="18" r="2" />
        </svg>
      </button>

      {open ? (
        <section
          className={`${styles.menu} ${masterContent ? styles.menuWithContent : ''}`}
          id={menuId}
          aria-label="Управление мастера"
        >
          <div className={styles.heading}>
            <span>Панель мастера</span>
            <strong>{sceneTitle}</strong>
          </div>
          <div className={styles.primaryActions} role="group" aria-label="Навигация по сцене">
            <button type="button" disabled={!onRestartScene} onClick={() => onRestartScene && runPrimaryAction(onRestartScene)}>
              <span className={styles.actionIcon} aria-hidden="true">↻</span>
              В начало сцены
            </button>
            {onStepBack ? (
              <button type="button" onClick={() => runPrimaryAction(onStepBack)}>
                <span className={styles.actionIcon} aria-hidden="true">↶</span>
                Шаг назад
              </button>
            ) : backHref ? (
              <Link to={backHref} onClick={() => setOpen(false)}>
                <span className={styles.actionIcon} aria-hidden="true">↶</span>
                Шаг назад
              </Link>
            ) : (
              <button type="button" disabled>
                <span className={styles.actionIcon} aria-hidden="true">↶</span>
                Шаг назад
              </button>
            )}
          </div>

          {soundtrack?.title ? (
            <div className={styles.storyActions} role="group" aria-label="Музыка">
              <span>Музыка · {soundtrack.title}</span>
              <button type="button" onClick={soundtrack.toggle}>
                {soundtrack.unavailable ? 'Повторить запуск музыки' : soundtrack.enabled && !soundtrack.blocked ? 'Приостановить музыку' : 'Включить музыку'}
              </button>
              <button type="button" onClick={soundtrack.next}>Следующая композиция</button>
              <label className={styles.musicVolume}>
                Громкость · {Math.round(soundtrack.volume * 100)}%
                <input aria-label="Громкость музыки" type="range" min="0" max="100" step="5"
                  value={Math.round(soundtrack.volume * 100)}
                  onChange={(event) => soundtrack.setVolume(Number(event.target.value) / 100)} />
              </label>
              {soundtrack.unavailable ? <span role="status">Не удалось воспроизвести файл. Можно повторить или выбрать следующий трек.</span> : null}
            </div>
          ) : null}

          {actions.length ? (
            <div className={styles.storyActions}>
              <span>{actionsLabel}</span>
              {actions.map((action) => action.href ? (
                <Link
                  key={action.id}
                  to={action.href}
                  onClick={() => setOpen(false)}
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  disabled={action.disabled || !action.onSelect}
                  key={action.id}
                  type="button"
                  onClick={() => runAction(action)}
                >
                  {action.detail ? (
                    <span className={styles.actionCopy}>
                      <strong>{action.label}</strong>
                      <small>{action.detail}</small>
                    </span>
                  ) : action.label}
                </button>
              ))}
            </div>
          ) : null}

          {masterContent ? (
            <div className={styles.masterContent}>{masterContent}</div>
          ) : null}
        </section>
      ) : null}
    </div>
  ), document.body);
}
