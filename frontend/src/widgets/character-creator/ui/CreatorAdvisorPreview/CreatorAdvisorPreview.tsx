import {advisorOwl} from '../../config/creator-art';
import {advisorPrompts} from '../../config/advisor-prompts';
import type {CreatorStep} from '../../config/creator-steps';
import {FantasyHeading} from '../../../../shared/ui/FantasyHeading';
import styles from './CreatorAdvisorPreview.module.css';

export type CreatorAdvisorPreviewProps = {stepId: CreatorStep['id']};

export function CreatorAdvisorPreview({stepId}: CreatorAdvisorPreviewProps) {
  const prompt = advisorPrompts[stepId];
  return (
    <aside className={styles.advisor} aria-label="Советник">
      <header><FantasyHeading>Советник</FantasyHeading><p>{prompt.intro}</p></header>
      <img className={styles.art} src={advisorOwl} alt="" />
      <div className={styles.conversation}>
        <p>{prompt.text}</p>
        <label className={styles.question}>
          <span>Спросить советника</span>
          <textarea placeholder={prompt.placeholder} disabled rows={2} />
        </label>
        <button className={styles.action} type="button" disabled title="Советник появится после подключения агента">✦ {prompt.action}</button>
        <small>Советник появится позже</small>
      </div>
    </aside>
  );
}
