import {useState} from 'react';
import {roadmapOverview, roadmapStages} from '../../model/roadmap';
import {RoadmapStageDetails} from '../RoadmapStageDetails/RoadmapStageDetails';
import {RoadmapStageList} from '../RoadmapStageList/RoadmapStageList';
import styles from './RoadmapPage.module.css';

export function RoadmapPage() {
  const [selectedStage, setSelectedStage] = useState(1);
  const stage = roadmapStages.find((item) => item.number === selectedStage) ?? roadmapStages[0];

  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <div>
          <span className={styles.eyebrow}>План развития проекта</span>
          <h1>{roadmapOverview.title}</h1>
        </div>
        <div className={styles.overview} aria-label="Состояние roadmap">
          <strong>{roadmapStages.length}</strong>
          <span>согласованных<br />этапов</span>
          <small>{roadmapOverview.updatedAt}<br />{roadmapOverview.status}</small>
        </div>
      </header>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}><span>Общий путь</span><small>Выберите этап</small></div>
          <label className={styles.picker}>
            <span>Этап roadmap</span>
            <select value={selectedStage} onChange={(event) => setSelectedStage(Number(event.target.value))}>
              {roadmapStages.map((item) => <option key={item.number} value={item.number}>{item.number}. {item.title}</option>)}
            </select>
          </label>
          <div className={styles.stageList}><RoadmapStageList stages={roadmapStages} selectedStage={selectedStage} onSelect={setSelectedStage} /></div>
        </aside>
        <RoadmapStageDetails stage={stage} />
      </div>
    </main>
  );
}
