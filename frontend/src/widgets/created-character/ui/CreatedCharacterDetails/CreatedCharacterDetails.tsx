import {RequestState} from '../../../../shared/ui/RequestState';
import {useCreatedCharacter} from '../../model/useCreatedCharacter';
import {CharacterFacts} from '../CharacterFacts';
import {CharacterStory} from '../CharacterStory';
import {CharacterAbilities} from '../CharacterAbilities';
import {CharacterEquipment} from '../CharacterEquipment';
import styles from './CreatedCharacterDetails.module.css';

export type CreatedCharacterDetailsProps = {id: string};

export function CreatedCharacterDetails({id}: CreatedCharacterDetailsProps) {
  const resource = useCreatedCharacter(id);
  if (resource.state.status === 'loading') return <RequestState title="Открываем персонажа…" isLoading />;
  if (resource.state.status === 'error') {
    return <RequestState title="Не удалось открыть персонажа" message={resource.state.message} isError onRetry={resource.retry} />;
  }
  const {character, catalog} = resource.state.data;
  return (
    <div className={styles.layout}>
      <CharacterFacts character={character} catalog={catalog} />
      <div className={styles.sections}>
        <CharacterStory character={character} />
        <CharacterAbilities abilities={character.abilities} />
        <CharacterEquipment items={character.equipment} />
      </div>
    </div>
  );
}
