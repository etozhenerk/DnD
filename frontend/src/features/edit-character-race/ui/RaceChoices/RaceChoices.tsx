import {getRaceArtwork, playableRaces} from '../../../../entities/character-form';
import {ChoiceTile} from '../../../../shared/ui/ChoiceTile';
import styles from './RaceChoices.module.css';

export type RaceChoicesProps = {value?: string; onChange: (id: string) => void};

export function RaceChoices({value, onChange}: RaceChoicesProps) {
  return (
    <div className={styles.choices} aria-label="Доступные расы">
      {playableRaces.map((race) => <ChoiceTile key={race.id} title={race.name}
        image={getRaceArtwork(race.id)} selected={value === race.id} onSelect={() => onChange(race.id)} />)}
    </div>
  );
}
