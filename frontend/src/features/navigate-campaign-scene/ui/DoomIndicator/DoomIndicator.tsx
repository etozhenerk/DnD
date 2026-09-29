import type {CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import styles from './DoomIndicator.module.css';

export function DoomIndicator({stage, from, appearing = false}: {stage: number; from: number | null; appearing?: boolean}) {
  const increasing = from !== null && stage > from;
  return createPortal(<aside aria-label={`Аварийный процесс: этап ${stage} из 5`} aria-live="polite"
    className={`${styles.indicator} ${increasing ? styles.increased : appearing ? styles.appearing : ''}`}>
    <div className={styles.meter} aria-hidden="true">
      {Array.from({length:5}, (_, index) => <span key={index}
        style={{'--doom-division-index': index} as CSSProperties}
        className={`${index < stage ? styles.active : ''} ${increasing && index >= from && index < stage ? styles.ignite : ''}`} />)}
    </div>
    <strong>{stage}<small>/5</small></strong>
  </aside>, document.body);
}
