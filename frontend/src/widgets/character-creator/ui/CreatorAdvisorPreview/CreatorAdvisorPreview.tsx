import {advisorOwl} from '../../config/creator-art';
import {AdvisorHint, AdvisorOwl, getAdvisorStep} from '../../../../entities/character-advisor';
import type {CreatorStep} from '../../config/creator-steps';
import type {CharacterFormData} from '../../../../entities/character-form';
import {getAdvisorContext} from '../../model/advisor-context';
import {FantasyHeading} from '../../../../shared/ui/FantasyHeading';
import {CreatorAdvisorChat} from '../CreatorAdvisorChat';
import styles from './CreatorAdvisorPreview.module.css';

export type CreatorAdvisorPreviewProps = {stepId: CreatorStep['id']; formData: CharacterFormData};

export function CreatorAdvisorPreview({stepId, formData}: CreatorAdvisorPreviewProps) {
  const prompt = getAdvisorStep(stepId);
  return (
    <aside className={styles.advisor} aria-label="Советник">
      <header>
        <FantasyHeading>Советник</FantasyHeading>
        <p>Твой пернатый сообщник</p>
      </header>
      <div className={styles.stage}>
        <div className={styles.speech}><AdvisorHint step={prompt} /></div>
        <div className={styles.art}>
          <AdvisorOwl key={stepId} image={advisorOwl} mood="greeting" />
        </div>
      </div>
      <CreatorAdvisorChat placeholder={prompt.placeholder} context={getAdvisorContext(stepId, formData)} />
    </aside>
  );
}
