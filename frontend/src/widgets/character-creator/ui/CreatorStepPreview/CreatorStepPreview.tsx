import type {CharacterFormController} from '../../../../entities/character-form';
import type {SaveCharacterController} from '../../../../features/save-character';
import type {CreatorStep} from '../../config/creator-steps';
import type {CreatorMedia} from '../../model/useCreatorMedia';
import {FantasyHeading} from '../../../../shared/ui/FantasyHeading';
import {CreatorStepBody} from '../CreatorStepBody';
import styles from './CreatorStepPreview.module.css';

export type CreatorStepPreviewProps = {step: CreatorStep; controller: CharacterFormController; media: CreatorMedia; saving: SaveCharacterController};

export function CreatorStepPreview({step, controller, media, saving}: CreatorStepPreviewProps) {
  return (
    <section key={step.id} className={styles.step} aria-labelledby="creator-step-title">
      <header><FantasyHeading id="creator-step-title">{step.heading}</FantasyHeading></header>
      <CreatorStepBody step={step} controller={controller} media={media} saving={saving} />
      <div className={styles.status}>Без входа прогресс не сохраняется. Закрытие страницы очистит анкету и загруженные изображения.</div>
    </section>
  );
}
