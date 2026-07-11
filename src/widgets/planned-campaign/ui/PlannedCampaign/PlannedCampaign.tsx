import type {Region} from '../../../../entities/region/model/types';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './PlannedCampaign.module.css';

export function PlannedCampaign({region}: {region: Region}) {
  return (
    <section className={styles.scene}>
      <div className={styles.art}><img src={resolveAsset(region.image)} alt={`Концепт региона «${region.name}»`} /></div>
      <article className={styles.scroll}>
        <p className={styles.kicker}>Летопись ещё не открыта</p>
        <h2>{region.name}</h2>
        <p>{region.description}</p>
        <div className={styles.divider}>✦</div>
        <strong>История ждёт своего часа</strong>
        <span>Предания, герои и опасности этой земли появятся в следующей главе хроники.</span>
      </article>
    </section>
  );
}
