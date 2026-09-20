import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import type {CombatantView} from './combatTypes';
import {combatPortraitStyle} from './combatPortraitStyle';
import styles from './CombatStatsDialog.module.css';

interface CombatStatsDialogProps {
  combatant: CombatantView;
}

function signed(value: number) {
  return `${value >= 0 ? '+' : '−'}${Math.abs(value)}`;
}

export function CombatStatsDialog({combatant}: CombatStatsDialogProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const characterStats = combatant.characterStats ?? [];

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  if (!characterStats.length) return null;

  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <>
      <button
        className={styles.trigger}
        ref={triggerRef}
        type="button"
        title="Открыть характеристики"
        aria-label="Открыть характеристики"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        d20
      </button>

      {open ? createPortal((
        <div
          className={styles.backdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="combat-stats-title"
          >
            <header className={styles.heading}>
              <div>
                <span>Бросок проверки: d20 + модификатор</span>
                <h2 id="combat-stats-title">Характеристики</h2>
              </div>
              <button ref={closeButtonRef} type="button" onClick={close} aria-label="Закрыть характеристики">
                <span aria-hidden="true">×</span>
              </button>
            </header>

            <div className={styles.identity} style={combatPortraitStyle(combatant)}>
              <span className={styles.portrait} aria-hidden="true">
                <img src={resolveAsset(combatant.token)} alt="" />
              </span>
              <div>
                <h3>{combatant.name}</h3>
                <p>HP {combatant.hp}/{combatant.maxHp} · AC {combatant.ac} · Атака {signed(combatant.attackBonus)}</p>
              </div>
            </div>

            <dl className={styles.statGrid}>
              {characterStats.map((stat) => (
                <div key={stat.id} data-modified={stat.modifier !== 0 ? 'true' : 'false'}>
                  <dt>{stat.label}</dt>
                  <dd>{signed(stat.total)}</dd>
                </div>
              ))}
            </dl>

            {combatant.effects?.length ? (
              <div className={styles.effects}>
                <strong>Активные эффекты</strong>
                <ul>
                  {combatant.effects.map((effect) => (
                    <li key={effect.id} data-tone={effect.tone}>{effect.label}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>
      ), document.body) : null}
    </>
  );
}
