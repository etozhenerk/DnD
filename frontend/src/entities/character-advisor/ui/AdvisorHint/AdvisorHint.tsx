import type {AdvisorStep} from '../../model/types';
import styles from './AdvisorHint.module.css';

export type AdvisorHintProps = {step: AdvisorStep; text?: string};

export function AdvisorHint({step, text}: AdvisorHintProps) {
  return (
    <div className={styles.slot} role="status" aria-live="polite" aria-atomic="true"
      aria-label="Подсказка советника">
      <div key={text || step.id} className={styles.bubble}>
        <p>{text || step.text}</p>
      </div>
    </div>
  );
}
