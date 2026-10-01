import {creationRules, getSelectedRace} from '../../../../entities/character-form';
import type {CharacterFormController} from '../../../../entities/character-form';
import {RaceChoices} from '../../../../features/edit-character-race';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene';
import styles from './RaceStep.module.css';

export type RaceStepProps = {controller: CharacterFormController};

export function RaceStep({controller}: RaceStepProps) {
  const race = getSelectedRace(controller.formData);
  return (
    <div className={styles.step}>
      <p className={styles.hint}>{creationRules.raceSelection.explanation}</p>
      <RaceChoices value={race?.id} onChange={(raceId) => controller.setSection('race', {raceId})} />
      {race ? <SceneTextPanel collapsible={false} resetKey={race.id} className={styles.detail}>
        <h3>{race.name}</h3><p>{race.description}</p>
        <h4>Расовая особенность: {race.feature.name}</h4><p>{race.feature.effect}</p>
      </SceneTextPanel> : <p className={styles.hint}>Выберите народ, чтобы узнать его особенность.</p>}
    </div>
  );
}
