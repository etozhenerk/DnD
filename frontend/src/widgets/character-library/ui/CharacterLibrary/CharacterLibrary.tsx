import {StartCharacterButton} from '../../../../features/start-character';
import {ActionButton} from '../../../../shared/ui/ActionButton';
import {RequestState} from '../../../../shared/ui/RequestState';
import {FantasyHeading} from '../../../../shared/ui/FantasyHeading';
import {useCharacterLibrary} from '../../model/useCharacterLibrary';
import {CharacterGrid} from '../CharacterGrid';
import {CharacterGridSkeleton} from '../CharacterGridSkeleton';
import styles from './CharacterLibrary.module.css';

export function CharacterLibrary() {
  const library = useCharacterLibrary();
  return (
    <section aria-label="Все персонажи конструктора">
      <div className={styles.toolbar}>
        <FantasyHeading>Все персонажи</FantasyHeading>
        <StartCharacterButton />
      </div>
      {library.state.status === 'loading' && <CharacterGridSkeleton />}
      {library.state.status === 'error' && (
        <RequestState title="Не удалось открыть список" message={library.state.message} isError onRetry={library.retry} />
      )}
      {library.state.status === 'ready' && (
        <>
          {library.state.data.items.length === 0 && (
            <RequestState title="Здесь начинается история" message="Готовых персонажей пока нет. Начните создание своего первого героя." />
          )}
          <CharacterGrid items={library.state.data.items} catalog={library.state.data.catalog} />
          {(library.hasPrevious || library.state.data.hasNext) && (
            <nav className={styles.pagination} aria-label="Страницы персонажей">
              <ActionButton tone="secondary" disabled={!library.hasPrevious} onClick={library.previous}>Назад</ActionButton>
              <span>Страница {library.pageNumber}</span>
              <ActionButton tone="secondary" disabled={!library.state.data.hasNext} onClick={library.next}>Далее</ActionButton>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
