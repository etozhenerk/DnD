import {useParams} from 'react-router-dom';
import {CharacterCreator} from '../../../../widgets/character-creator';
import {FantasyPage} from '../../../../shared/ui/FantasyPage';

export function CharacterCreatorPage() {
  const {stepId = 'appearance'} = useParams();
  return <FantasyPage animated layout="workspace"><CharacterCreator stepId={stepId} /></FantasyPage>;
}
