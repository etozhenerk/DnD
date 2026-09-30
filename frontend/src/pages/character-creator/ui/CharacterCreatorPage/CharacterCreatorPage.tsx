import {useParams} from 'react-router-dom';
import {CharacterCreator} from '../../../../widgets/character-creator';
import {FantasyPage} from '../../../../shared/ui/FantasyPage';

export function CharacterCreatorPage() {
  const {stepId = 'appearance'} = useParams();
  return <FantasyPage><CharacterCreator stepId={stepId} /></FantasyPage>;
}
