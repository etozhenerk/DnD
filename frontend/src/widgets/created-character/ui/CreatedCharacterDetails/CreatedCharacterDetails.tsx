import {RequestState} from '../../../../shared/ui/RequestState';
import {useCreatedCharacter} from '../../model/useCreatedCharacter';
import {CharacterSheet} from '../CharacterSheet';
import {CharacterSheetSkeleton} from '../CharacterSheetSkeleton';

export type CreatedCharacterDetailsProps = {id: string};

export function CreatedCharacterDetails({id}: CreatedCharacterDetailsProps) {
  const resource = useCreatedCharacter(id);
  if (resource.state.status === 'loading') return <CharacterSheetSkeleton />;
  if (resource.state.status === 'error') {
    return <RequestState title="Не удалось открыть персонажа" message={resource.state.message} isError onRetry={resource.retry} />;
  }
  const {character, catalog} = resource.state.data;
  return <CharacterSheet character={character} catalog={catalog} />;
}
