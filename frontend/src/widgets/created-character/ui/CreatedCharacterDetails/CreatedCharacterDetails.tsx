import {RequestState} from '../../../../shared/ui/RequestState';
import {LoadingTransition} from '../../../../shared/ui/LoadingTransition';
import {useCreatedCharacter} from '../../model/useCreatedCharacter';
import {CharacterSheet} from '../CharacterSheet';
import {CharacterSheetSkeleton} from '../CharacterSheetSkeleton';

export type CreatedCharacterDetailsProps = {id: string};

export function CreatedCharacterDetails({id}: CreatedCharacterDetailsProps) {
  const resource = useCreatedCharacter(id);
  return (
    <LoadingTransition loading={resource.state.status === 'loading'} placeholder={<CharacterSheetSkeleton />}>
      {resource.state.status === 'error' && (
        <RequestState title="Не удалось открыть персонажа" message={resource.state.message} isError onRetry={resource.retry} />
      )}
      {resource.state.status === 'ready' && (
        <CharacterSheet character={resource.state.data.character} catalog={resource.state.data.catalog} />
      )}
    </LoadingTransition>
  );
}
