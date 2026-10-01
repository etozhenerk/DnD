import {creatorSteps} from '../../config/creator-steps';
import {CreatorStepLink} from '../CreatorStepLink';
import {useProgressScroll} from '../../model/useProgressScroll';
import styles from './CreatorProgress.module.css';

export type CreatorProgressProps = {currentId: string; availableUntil: number};

export function CreatorProgress({currentId, availableUntil}: CreatorProgressProps) {
  const scrollRef = useProgressScroll(currentId);
  return (
    <nav ref={scrollRef} className={styles.progress} aria-label="Шаги создания персонажа" aria-describedby={availableUntil < creatorSteps.length - 1 ? 'creator-progress-hint' : undefined}>
      <ol>
        {creatorSteps.map((step, index) => (
          <li key={step.id}>
            <CreatorStepLink step={step} number={index + 1} current={currentId === step.id}
              available={index <= availableUntil} completed={index < availableUntil} />
          </li>
        ))}
      </ol>
      {availableUntil < creatorSteps.length - 1 && (
        <p id="creator-progress-hint" className={styles.hint}>Заполните текущий этап, чтобы открыть следующий.</p>
      )}
    </nav>
  );
}
