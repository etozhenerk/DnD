import {FantasyIcon} from '../../../../shared/ui/FantasyIcon';
import styles from './CharacterVitals.module.css';

export type CharacterVitalsProps = {maxHp: number; baseAc: number};

export function CharacterVitals({maxHp, baseAc}: CharacterVitalsProps) {
  return (
    <dl className={styles.vitals}>
      <div><dt><span><FantasyIcon name="heart" /></span>Здоровье</dt><dd>{maxHp}</dd></div>
      <div><dt><span><FantasyIcon name="shield" /></span>Защита</dt><dd>{baseAc}</dd></div>
    </dl>
  );
}
