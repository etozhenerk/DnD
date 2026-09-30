import {Link} from 'react-router-dom';
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
  if (!available) {
    return (
      <button className={styles.step} type="button" disabled title="Сначала заполните предыдущие этапы" aria-label={`${step.title}: сначала заполните предыдущие этапы`}>
        <span className={styles.number}>{number}</span>{step.title}
      </button>
    );
  }
  return (
    <Link className={styles.step} to={`/characters/new/${step.id}`} aria-current={current ? 'step' : undefined}>
      <span className={styles.number}>{completed ? '✓' : number}</span>{step.title}
    </Link>
  );
}
