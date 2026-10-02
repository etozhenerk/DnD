import {useState} from 'react';
import {useAdvisorChat} from '../../../../features/chat-with-advisor';
import {useAdvisorProactive} from '../../model/useAdvisorProactive';
import {useAdvisorArtwork} from '../../model/useAdvisorArtwork';
import type {CreatorMedia} from '../../model/useCreatorMedia';
import {useAdvisorProposal} from '../../model/useAdvisorProposal';
import {advisorOwl} from '../../config/creator-art';
import {AdvisorHint, AdvisorOwl, getAdvisorStep, useAdvisorMood} from '../../../../entities/character-advisor';
import type {CreatorStep} from '../../config/creator-steps';
import type {CharacterFormData} from '../../../../entities/character-form';
import {getAdvisorContext} from '../../model/advisor-context';
import {FantasyHeading} from '../../../../shared/ui/FantasyHeading';
import {CreatorAdvisorChat} from '../CreatorAdvisorChat';
import styles from './CreatorAdvisorPreview.module.css';

export type CreatorAdvisorPreviewProps = {stepId: CreatorStep['id']; formData: CharacterFormData; onApply: (form: CharacterFormData) => void; media: CreatorMedia; disabled: boolean};

export function CreatorAdvisorPreview({stepId, formData, onApply, media, disabled}: CreatorAdvisorPreviewProps) {
  const [isChatOpen, setChatOpen] = useState(false);
  const prompt = getAdvisorStep(stepId);
  const chat = useAdvisorChat(getAdvisorContext(stepId, formData));
  const application = useAdvisorProposal(formData, onApply);
  const artwork = useAdvisorArtwork(chat, application, media);
  const note = useAdvisorProactive(chat, disabled || isChatOpen || artwork.busy);
  const mood = useAdvisorMood(chat.pending, chat.error, chat.latestReplyId, application.appliedId);
  return (
    <aside className={styles.advisor} aria-label="Советник">
      <header>
        <FantasyHeading>Советник</FantasyHeading>
        <p>Твой пернатый сообщник</p>
      </header>
      <div className={styles.stage}>
        <div className={styles.speech}><AdvisorHint step={prompt} text={note} /></div>
        <div className={styles.art}>
          <AdvisorOwl key={stepId} image={advisorOwl} mood={mood} />
        </div>
      </div>
      <CreatorAdvisorChat placeholder={prompt.placeholder} chat={chat} application={application} media={media} artwork={artwork}
        disabled={disabled} isOpen={isChatOpen} onOpenChange={setChatOpen} />
    </aside>
  );
}
