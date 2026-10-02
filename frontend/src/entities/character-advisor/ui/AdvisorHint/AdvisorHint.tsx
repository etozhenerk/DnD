import type {AdvisorStep} from '../../model/types';
import styles from './AdvisorHint.module.css';

export type AdvisorHintProps = {step: AdvisorStep};

export function AdvisorHint({step}: AdvisorHintProps) {
  return (
    <div className={styles.slot} role="status" aria-live="polite" aria-atomic="true"
      aria-label="Подсказка советника">
      <div key={step.id} className={styles.bubble}>
        <p>{step.text}</p>
      </div>
    </div>
  );
}
