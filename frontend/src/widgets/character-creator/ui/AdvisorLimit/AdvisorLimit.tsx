import type {AdvisorSession} from '../../../../entities/character-advisor';
import styles from './AdvisorLimit.module.css';

export type AdvisorLimitProps = {session?: AdvisorSession};

export function AdvisorLimit({session}: AdvisorLimitProps) {
  const remaining = session ? Math.max(0, Math.floor(100 * (1 - session.accountedMicroRub / session.budgetMicroRub))) : 100;
  return (
    <div className={styles.limit}>
      <label htmlFor="advisor-limit">Запас советника <span>{remaining}%</span></label>
      <meter id="advisor-limit" min={0} max={100} low={20} high={60} optimum={100} value={remaining}
        aria-label={`Запас советника: ${remaining}%`} />
      <small>На создание этого героя</small>
    </div>
  );
}
