import {Link, Navigate} from 'react-router-dom';
import {useCharacterDraft} from '../../../../entities/character-draft';
import {StartCharacterButton} from '../../../../features/start-character';
import {RequestState} from '../../../../shared/ui/RequestState';
import {getCreatorNavigation} from '../../model/creator-navigation';
import {getAvailableStepIndex} from '../../model/creator-access';
import {creatorSteps} from '../../config/creator-steps';
import {CreatorProgress} from '../CreatorProgress';
import {DraftIdentity} from '../DraftIdentity';
import {CreatorStepPreview} from '../CreatorStepPreview';
import {CreatorAdvisorPreview} from '../CreatorAdvisorPreview';
import styles from './CharacterCreator.module.css';

export type CharacterCreatorProps = {stepId: string};

export function CharacterCreator({stepId}: CharacterCreatorProps) {
  const draft = useCharacterDraft();
  const navigation = getCreatorNavigation(stepId);
  if (!navigation) return <RequestState title="Такого шага нет" message="Выберите шаг из конструктора персонажей." />;
  if (!draft.session) {
    return <div className={styles.start}><RequestState title="Начните историю героя" message="Сохранённый черновик не найден. Создайте новый, чтобы открыть конструктор." /><StartCharacterButton /></div>;
  }
  if (draft.state.status === 'loading') return <RequestState title="Восстанавливаем черновик…" isLoading />;
  if (draft.state.status === 'error') {
    return <RequestState title="Не удалось открыть черновик" message={draft.state.message} isError onRetry={draft.retry} />;
  }
  if (!draft.state.data) return null;
  const availableUntil = getAvailableStepIndex(draft.state.data, draft.state.data.validation);
  if (navigation.number - 1 > availableUntil) {
    return <Navigate replace to={`/characters/new/${creatorSteps[availableUntil].id}`} />;
  }
  return (
    <section>
      <header className={styles.header}>
        <Link to="/characters" aria-label="Назад ко всем персонажам">← Назад</Link>
        <h1>Создание героя</h1>
      </header>
      {!draft.session.persistent && <p role="alert" className={styles.warning}>Браузер не сохраняет черновик между посещениями. Не закрывайте и не перезагружайте эту вкладку.</p>}
      <CreatorProgress currentId={navigation.step.id} availableUntil={availableUntil} />
      <div className={styles.layout}>
        <DraftIdentity draft={draft.state.data} />
        <CreatorStepPreview step={navigation.step} number={navigation.number} />
        <CreatorAdvisorPreview />
      </div>
    </section>
  );
}
