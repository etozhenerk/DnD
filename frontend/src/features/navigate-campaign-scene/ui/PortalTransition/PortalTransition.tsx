import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import styles from './PortalTransition.module.css';

export function PortalTransition({onCovered, onComplete}: {onCovered: () => void; onComplete: () => void}) {
  const callbacks = useRef({onCovered, onComplete});
  callbacks.current = {onCovered, onComplete};
  const covered = useRef(false);
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const skipRef = useRef<HTMLButtonElement>(null);
  const cover = () => {
    if (covered.current) return;
    covered.current = true;
    callbacks.current.onCovered();
  };
  const finish = () => {cover();callbacks.current.onComplete();};
  useEffect(() => {
    const previous = document.activeElement;
    skipRef.current?.focus();
    const midpoint = window.setTimeout(cover, reduced ? 200 : 1250);
    const end = window.setTimeout(() => callbacks.current.onComplete(), reduced ? 500 : 2800);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {event.preventDefault();finish();}
      if (event.key === 'Tab') {event.preventDefault();skipRef.current?.focus();}
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(midpoint);window.clearTimeout(end);
      document.removeEventListener('keydown', onKeyDown);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [reduced]);
  return createPortal(<div className={`${styles.overlay} ${reduced ? styles.reduced : ''}`} role="dialog" aria-modal="true" aria-label="Перенос через портал">
    <div className={styles.veil} />
    <div className={styles.tunnel} aria-hidden="true">
      <div className={styles.ring}/><div className={styles.ring}/><div className={styles.ring}/><div className={styles.ring}/>
      <div className={styles.core}/>
    </div>
    <button ref={skipRef} type="button" onClick={finish}>Пропустить</button>
  </div>, document.body);
}
