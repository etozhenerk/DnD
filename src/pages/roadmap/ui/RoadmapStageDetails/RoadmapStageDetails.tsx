import type {RoadmapStage} from '../../model/roadmap';
import {MarkdownContent} from '../MarkdownContent/MarkdownContent';
import styles from './RoadmapStageDetails.module.css';

export function RoadmapStageDetails({stage}: {stage: RoadmapStage}) {
  return (
    <article className={styles.details} id="roadmap-stage-details" key={stage.number} aria-labelledby="selected-stage-title">
      <header>
        <div className={styles.meta}><span>Этап {stage.number} из 7</span><span className={styles.status}><i aria-hidden="true" />{stage.status}</span></div>
        <h2 id="selected-stage-title">{stage.title}</h2>
        <p>{stage.goal}</p>
      </header>
      <div className={styles.sections}>
        {stage.sections.map((section, index) => (
          <details key={section.title} open={index < 2}>
            <summary><span>{section.title}</span><i aria-hidden="true" /></summary>
            <div className={styles.sectionBody}><MarkdownContent blocks={section.blocks} /></div>
          </details>
        ))}
      </div>
    </article>
  );
}
