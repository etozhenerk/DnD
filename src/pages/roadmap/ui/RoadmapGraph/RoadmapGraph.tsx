import type {RoadmapStage} from '../../model/roadmap';
import styles from './RoadmapGraph.module.css';

interface RoadmapGraphProps {
  stages: RoadmapStage[];
  selectedStage: number;
  onSelect: (stage: number) => void;
}

export function RoadmapGraph({stages, selectedStage, onSelect}: RoadmapGraphProps) {
  return (
    <section className={styles.graph} aria-labelledby="roadmap-graph-title">
      <header className={styles.header}>
        <div>
          <span>Общий путь</span>
          <h2 id="roadmap-graph-title">От готового мира до совместной игры</h2>
        </div>
        <p>Каждый этап даёт работающий результат и подготавливает следующий.</p>
      </header>
      <div className={styles.canvas}>
        <svg className={styles.path} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="roadmap-arrow" markerHeight="6" markerWidth="6" orient="auto" refX="5" refY="3">
              <path className={styles.arrow} d="M 0 0 L 6 3 L 0 6 Z" />
            </marker>
          </defs>
          <path className={styles.route} d="M 29.5 15 H 37.2" />
          <path className={styles.route} d="M 62.8 15 H 70.5" />
          <path className={styles.route} d="M 83.3 28 V 37" />
          <path className={styles.route} d="M 70.5 50 H 62.8" />
          <path className={styles.route} d="M 37.2 50 H 29.5" />
          <path className={styles.route} d="M 16.7 63 V 73" />
        </svg>
        <ol className={styles.stages} aria-label="Семь этапов развития проекта">
          {stages.map((stage) => {
            const isSelected = stage.number === selectedStage;
            return (
              <li key={stage.number}>
                <button
                  aria-controls="roadmap-stage-details"
                  aria-pressed={isSelected}
                  className={isSelected ? styles.selected : undefined}
                  onClick={() => onSelect(stage.number)}
                  type="button"
                >
                  <span className={styles.stageMeta}>
                    <b>{String(stage.number).padStart(2, '0')}</b>
                    <small>Этап {stage.number}</small>
                  </span>
                  <strong>{stage.shortTitle}</strong>
                  <span className={styles.summary}>{stage.summary}.</span>
                  <span className={styles.action}>{isSelected ? 'Подробности открыты' : 'Открыть подробности'}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
