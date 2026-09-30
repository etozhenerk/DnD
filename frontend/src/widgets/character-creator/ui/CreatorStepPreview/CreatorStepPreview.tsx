import {FantasyFrame} from '../../../../shared/ui/FantasyFrame';
import type {CreatorStep} from '../../config/creator-steps';
import {FantasySeal} from '../../../../shared/ui/FantasySeal';
import styles from './CreatorStepPreview.module.css';

export type CreatorStepPreviewProps = {step: CreatorStep; number: number};

export function CreatorStepPreview({step, number}: CreatorStepPreviewProps) {
  return (
    <section className={styles.step} aria-labelledby="creator-step-title">
      <FantasyFrame />
      <header>
        <span>Шаг {number} из 7</span>
        <h2 id="creator-step-title">{step.heading}</h2>
      </header>
      <p>{step.description}</p>
      <div className={styles.placeholder}>
        <div className={styles.seal}><FantasySeal /></div>
        <h3>Этот шаг ещё готовится</h3>
        <p>Поля появятся здесь по мере готовности конструктора. Ваш черновик уже открыт — к нему можно вернуться позже.</p>
      </div>
    </section>
  );
}
