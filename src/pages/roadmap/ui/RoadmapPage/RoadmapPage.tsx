import {useState} from 'react';
import {roadmapOverview, roadmapResearch, roadmapStages} from '../../model/roadmap';
import {RoadmapGraph} from '../RoadmapGraph/RoadmapGraph';
import {RoadmapResearch} from '../RoadmapResearch/RoadmapResearch';
import {RoadmapStageDetails} from '../RoadmapStageDetails/RoadmapStageDetails';
import styles from './RoadmapPage.module.css';

export function RoadmapPage() {
  const [selectedStage, setSelectedStage] = useState(1);
  const [section, setSection] = useState<'stages' | 'research'>('stages');
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
      <nav className={styles.sections} aria-label="Разделы продуктового roadmap">
        <button aria-pressed={section === 'stages'} className={section === 'stages' ? styles.active : undefined} onClick={() => setSection('stages')} type="button">
          <span>01</span> Этапы развития
        </button>
        <button aria-pressed={section === 'research'} className={section === 'research' ? styles.active : undefined} onClick={() => setSection('research')} type="button">
          <span>02</span> Сравнение {roadmapResearch.length} сервисов
        </button>
      </nav>
      <div className={styles.content}>
        {section === 'stages' ? (
          <>
            <RoadmapGraph stages={roadmapStages} selectedStage={selectedStage} onSelect={setSelectedStage} />
            <RoadmapStageDetails stage={stage} />
          </>
        ) : <RoadmapResearch products={roadmapResearch} />}
      </div>
    </main>
  );
}
