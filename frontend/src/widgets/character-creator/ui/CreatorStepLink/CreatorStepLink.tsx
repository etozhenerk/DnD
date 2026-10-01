import {Link} from 'react-router-dom';
import {useViewTransitions} from '../../../../shared/lib/view-transitions';
import {LockIcon} from '../../../../shared/ui/LockIcon';
import type {CreatorStep} from '../../config/creator-steps';
import styles from './CreatorStepLink.module.css';

export type CreatorStepLinkProps = {
  step: CreatorStep;
  number: number;
  available: boolean;
  current: boolean;
  completed: boolean;
};

export function CreatorStepLink({step, number, available, current, completed}: CreatorStepLinkProps) {
  const viewTransition = useViewTransitions();
  if (!available) {
    return (
      <button className={styles.step} type="button" disabled title="Сначала заполните предыдущие этапы" aria-label={`${step.title}: сначала заполните предыдущие этапы`}>
        <span className={styles.number}><span className={styles.value}>{number}</span><span className={styles.lock}><LockIcon /></span></span>
        <span className={styles.label}>{step.title}</span>
      </button>
    );
  }
  return (
    <Link className={styles.step} to={`/characters/new/${step.id}`} viewTransition={viewTransition} aria-current={current ? 'step' : undefined}>
      <span className={styles.number}><span className={completed && !current ? styles.check : styles.value}>{completed && !current ? '✓' : number}</span></span>
      <span className={styles.label}>{step.title}</span>
    </Link>
  );
}
