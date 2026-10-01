import {Link, Navigate} from 'react-router-dom';
import {useCharacterForm} from '../../../../entities/character-form';
import {useSaveCharacter} from '../../../../features/save-character';
import {RequestState} from '../../../../shared/ui/RequestState';
import {useViewTransitions} from '../../../../shared/lib/view-transitions';
import {getCreatorNavigation} from '../../model/creator-navigation';
import {getAvailableStepIndex} from '../../model/creator-access';
import {useCreatorMedia} from '../../model/useCreatorMedia';
import {creatorSteps} from '../../config/creator-steps';
import {CreatorProgress} from '../CreatorProgress';
import {CreatorIdentity} from '../CreatorIdentity';
import {CreatorStepPreview} from '../CreatorStepPreview';
import {CreatorAdvisorPreview} from '../CreatorAdvisorPreview';
import styles from './CharacterCreator.module.css';

export type CharacterCreatorProps = {stepId: string};

export function CharacterCreator({stepId}: CharacterCreatorProps) {
  const controller = useCharacterForm();
  const media = useCreatorMedia();
  const saving = useSaveCharacter(controller.formData, controller.form.validation);
  const viewTransition = useViewTransitions();
  const navigation = getCreatorNavigation(stepId);
  if (!navigation) return <RequestState title="Такого шага нет" message="Выберите шаг из конструктора персонажей." />;
  const availableUntil = getAvailableStepIndex(controller.form.formData, controller.form.validation);
  if (navigation.number - 1 > availableUntil) {
    return <Navigate replace to={'/characters/new/' + creatorSteps[availableUntil].id} />;
  }
  return (
    <section className={styles.creator}>
      <header className={styles.header}>
        <Link to="/characters" viewTransition={viewTransition} aria-label="Назад ко всем персонажам"
          aria-disabled={saving.isPending} onClick={(event) => {if (saving.isPending) event.preventDefault();}}>← Назад</Link>
        <h1>Создание героя</h1>
      </header>
      <div className={styles.hero}><CreatorIdentity form={controller.form}
        portrait={media.selected?.url} /></div>
      <div className={styles.workspace}>
        <div inert={saving.isPending}><CreatorProgress currentId={navigation.step.id} availableUntil={availableUntil} /></div>
        <div className={styles.layout}>
          <fieldset className={styles.form} disabled={saving.isPending}
            onClickCapture={(event) => {if (saving.isPending) event.preventDefault();}}>
            <CreatorStepPreview step={navigation.step} controller={controller} media={media} saving={saving} />
          </fieldset>
          <CreatorAdvisorPreview stepId={navigation.step.id} />
        </div>
      </div>
    </section>
  );
}
