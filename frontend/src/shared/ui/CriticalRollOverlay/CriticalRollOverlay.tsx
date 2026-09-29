import {createPortal} from 'react-dom';
import type {CSSProperties} from 'react';
import {CRITICAL_ROLL_EFFECT_DURATION_MS} from '../../lib/dice/criticalRollEffect';
import styles from './CriticalRollOverlay.module.css';

interface CriticalRollOverlayProps {
  result: 1 | 20 | null;
}

const PARTICLES = Array.from({length: 18}, (_, index) => index);
const FRAGMENTS = Array.from({length: 10}, (_, index) => index);

export function CriticalRollOverlay({result}: CriticalRollOverlayProps) {
  if (result === null) return null;

  const isSuccess = result === 20;

  return createPortal(
    <div
      className={`${styles.effect} ${isSuccess ? styles.success : styles.failure}`}
      style={{'--critical-roll-duration': `${CRITICAL_ROLL_EFFECT_DURATION_MS}ms`} as CSSProperties}
      role="status"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className={styles.vignette} aria-hidden="true" />
      <div className={styles.flash} aria-hidden="true" />
      <div className={styles.aftershock} aria-hidden="true" />
      <div className={styles.rays} aria-hidden="true" />
      <div className={styles.shockwave} aria-hidden="true" />
      <div className={styles.energyRings} aria-hidden="true">
        <svg viewBox="0 0 200 200" focusable="false">
          <circle cx="100" cy="100" r="92" />
          <circle cx="100" cy="100" r="78" />
          <path d="M100 3 112 18 100 33 88 18Zm97 97-15 12-15-12 15-12ZM100 197l-12-15 12-15 12 15ZM3 100l15-12 15 12-15 12Z" />
          <path d="m100 17 59 24 24 59-24 59-59 24-59-24-24-59 24-59Z" />
        </svg>
      </div>
      <div className={styles.particles} aria-hidden="true">
        {PARTICLES.map((particle) => <span key={particle} />)}
      </div>
      <div className={styles.fragments} aria-hidden="true">
        {FRAGMENTS.map((fragment) => <span key={fragment} />)}
      </div>

      <div className={styles.sigil} aria-hidden="true">
        <svg viewBox="0 0 120 120" focusable="false">
          <path className={styles.dieSurface} d="M60 7 111 37 96 104H24L9 37Z" />
          <path className={styles.dieOutline} d="M60 7 111 37 96 104H24L9 37 60 7Z" />
          <path className={styles.dieFacet} d="m60 7 20 36 31-6M60 7 40 43 9 37m31 6 20 5 20-5M9 37l31 6-16 61m87-67-31 6 16 61M24 104l36-56 36 56M24 104l36-18 36 18" />
        </svg>
        <strong>{result}</strong>
      </div>

      <div className={styles.banner}>
        <span className={styles.rule} aria-hidden="true" />
        <strong className={styles.title}>
          {isSuccess ? 'Критическая удача' : 'Критическая неудача'}
        </strong>
        <span className={styles.rule} aria-hidden="true" />
      </div>
    </div>,
    document.body,
  );
}
