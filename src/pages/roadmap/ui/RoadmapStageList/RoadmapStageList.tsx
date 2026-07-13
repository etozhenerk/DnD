import type {RoadmapStage} from '../../model/roadmap';
import styles from './RoadmapStageList.module.css';

interface RoadmapStageListProps {
  stages: RoadmapStage[];
  selectedStage: number;
  onSelect: (stage: number) => void;
}

export function RoadmapStageList({stages, selectedStage, onSelect}: RoadmapStageListProps) {
  return (
    <ol className={styles.list} aria-label="Этапы развития проекта">
      {stages.map((stage) => {
        const isSelected = selectedStage === stage.number;
        return (
          <li key={stage.number}>
            <button aria-controls="roadmap-stage-details" aria-pressed={isSelected} className={isSelected ? styles.selected : undefined} onClick={() => onSelect(stage.number)} type="button">
              <span className={styles.number} aria-hidden="true">{String(stage.number).padStart(2, '0')}</span>
              <span className={styles.copy}>
                <strong>{stage.title}</strong>
                <span>{stage.goal}</span>
                <small><i aria-hidden="true" />{stage.status}</small>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
