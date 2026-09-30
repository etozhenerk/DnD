import {creatorSteps} from '../../config/creator-steps';
import {CreatorStepLink} from '../CreatorStepLink';
import styles from './CreatorProgress.module.css';

export type CreatorProgressProps = {currentId: string; availableUntil: number};

export function CreatorProgress({currentId, availableUntil}: CreatorProgressProps) {
  return (
    <nav className={styles.progress} aria-label="Шаги создания персонажа">
      <ol>
        {creatorSteps.map((step, index) => (
          <li key={step.id}>
            <CreatorStepLink step={step} number={index + 1} current={currentId === step.id}
              available={index <= availableUntil} completed={index < availableUntil} />
          </li>
        ))}
      </ol>
    </nav>
  );
}
