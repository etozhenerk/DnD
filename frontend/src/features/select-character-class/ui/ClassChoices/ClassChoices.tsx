import {classProfiles, getClassArtwork} from '../../../../entities/character-form';
import {ChoiceTile} from '../../../../shared/ui/ChoiceTile';
import {getClassPresentation} from '../../model/class-presentation';
import styles from './ClassChoices.module.css';

export type ClassChoicesProps = {value?: string; onChange: (id: string) => void};

export function ClassChoices({value, onChange}: ClassChoicesProps) {
  return (
    <div className={styles.choices} aria-label="Доступные классы">
      {classProfiles.map((profile) => <ChoiceTile key={profile.id} title={profile.name}
        subtitle={getClassPresentation(profile).subtitle} icon={<img src={getClassArtwork(profile.id)} alt="" loading="lazy" />}
        selected={value === profile.id} onSelect={() => onChange(profile.id)} />)}
    </div>
  );
}
