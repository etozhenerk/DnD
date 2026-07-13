import {useState} from 'react';
import {roadmapOverview, roadmapStages} from '../../model/roadmap';
import {RoadmapGraph} from '../RoadmapGraph/RoadmapGraph';
import {RoadmapStageDetails} from '../RoadmapStageDetails/RoadmapStageDetails';
import styles from './RoadmapPage.module.css';

export function RoadmapPage() {
  const [selectedStage, setSelectedStage] = useState(1);
  const stage = roadmapStages.find((item) => item.number === selectedStage) ?? roadmapStages[0];

  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <div>
          <span className={styles.eyebrow}>{roadmapOverview.title}</span>
          <h1>Путь к совместной игре</h1>
          <p>Семь последовательных шагов: от завершения энциклопедии мира до общей партии с подключением игроков.</p>
        </div>
        <div className={styles.overview} aria-label="Состояние roadmap">
          <strong>{roadmapStages.length}</strong>
          <span>согласованных<br />этапов</span>
          <small>{roadmapOverview.updatedAt}<br />{roadmapOverview.status}</small>
        </div>
      </header>
      <div className={styles.content}>
        <RoadmapGraph stages={roadmapStages} selectedStage={selectedStage} onSelect={setSelectedStage} />
        <RoadmapStageDetails stage={stage} />
      </div>
    </main>
  );
}
