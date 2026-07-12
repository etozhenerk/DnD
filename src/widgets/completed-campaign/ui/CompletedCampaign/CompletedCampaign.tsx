import type {Region} from '../../../../entities/region/model/types';
import {RegionOrderSeal} from '../../../../entities/region/ui/RegionOrderSeal/RegionOrderSeal';
import {norIlSkaldCampaign} from '../../../../shared/config/gameData';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {getRegionArtworkViewBox} from '../../../../shared/lib/map/getRegionArtworkViewBox';
import {JourneyBook} from '../../../journey-book/ui/JourneyBook/JourneyBook';
import styles from './CompletedCampaign.module.css';

export function CompletedCampaign({region}: {region: Region}) {
  const chronicle = norIlSkaldCampaign.completedChronicle;
  const trialsCount = chronicle?.trials.length ?? norIlSkaldCampaign.locations.length;
  const enemiesCount = chronicle?.defeatedEnemies.reduce((total, enemy) => total + enemy.count, 0) ?? 1;
  const restoredCount = chronicle?.restored.length ?? 0;
  const sealTrials = chronicle?.trials.filter((trial) => trial.id.includes('seal')) ?? [];
  const enemiesById = new Map(norIlSkaldCampaign.enemies.map((enemy) => [enemy.id, enemy]));

  return (
    <div className={styles.campaign}>
      <section className={styles.hero}>
        <div className={styles.mapStage} aria-label={`Освобождённый регион «${region.name}»`}>
          <span className={styles.magicAura} aria-hidden="true"><i /><i /><i /><i /></span>
          <svg viewBox={getRegionArtworkViewBox(region.id)} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Освобождённый регион «${region.name}»`}>
            <image href={resolveAsset(region.image)} width="1024" height="1024" />
          </svg>
          <svg className={styles.chapterSeal} viewBox="0 0 64 64" aria-hidden="true"><RegionOrderSeal order={region.order} x={32} y={32} /></svg>
        </div>

        <article className={styles.heroCopy}>
          <p className={styles.kicker}>Завершённая кампания</p>
          <h2>{norIlSkaldCampaign.title}</h2>
          <p className={styles.subtitle}>{norIlSkaldCampaign.subtitle}</p>
          <p className={styles.summary}>{chronicle?.completedSummary}</p>
          <div className={styles.status}>
            <div className={styles.seal}><strong>Рейс</strong><b>закрыт</b></div>
            <div><small>{chronicle?.statusLabel}</small><p>{chronicle?.finalResult}</p></div>
          </div>
        </article>
      </section>

      <section className={styles.scoreboard} aria-label="Краткие итоги завершённой кампании">
        <div><strong>{trialsCount}</strong><span>испытаний пройдено</span></div>
        <div><strong>{sealTrials.length}</strong><span>печати разбиты</span></div>
        <div><strong>{enemiesCount}</strong><span>врагов побеждено</span></div>
        <div><strong>{restoredCount}</strong><span>потери возвращены</span></div>
      </section>

      <section className={styles.sealTrack} aria-label="Разбитые навигационные печати">
        <div className={styles.sectionHeading}>
          <span>Навигационные печати</span>
          <h2>Защита АэроДракса снята</h2>
        </div>
        <ol>
          {sealTrials.map((trial, index) => (
            <li key={trial.id}>
              <span>{index + 1}</span>
              <div><strong>{trial.title}</strong><p>{trial.result}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <JourneyBook campaign={norIlSkaldCampaign} />

      <section className={styles.aftermath} aria-label="Побеждённые враги и последствия">
        <div className={styles.sectionHeading}>
          <span>Итоги стычек</span>
          <h2>Кто больше не задерживает рейсы</h2>
        </div>
        <div className={styles.enemyLedger}>
          {chronicle?.defeatedEnemies.map((defeated) => {
            const enemy = enemiesById.get(defeated.enemyId);
            return (
              <article key={defeated.enemyId}>
                <span>{defeated.count}</span>
                <div><strong>{enemy?.name}</strong><p>{defeated.outcome}</p></div>
              </article>
            );
          })}
        </div>
        <div className={styles.restored}>
          {chronicle?.restored.map((entry) => <p key={entry.id}><strong>{entry.title}</strong><span>{entry.result}</span></p>)}
        </div>
      </section>

      <section className={styles.reward}>
        <figure className={styles.rewardArt}>
          <img src={resolveAsset('assets/concepts/rewards/key-nor-il-skald.png')} alt="Ключ Нор’Иль’Скальда — ледяной артефакт награды" />
        </figure>
        <div className={styles.rewardCopy}>
          <span>{chronicle?.statusLabel}</span>
          <h2>Ключ Нор’Иль’Скальда</h2>
          <p className={styles.final}>{chronicle?.finalResult}</p>
          <p>{norIlSkaldCampaign.ending.reward}</p>
        </div>
      </section>
    </div>
  );
}
