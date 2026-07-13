import type {Campaign, CampaignPerson} from '../../../../entities/campaign/model/types';
import type {Region} from '../../../../entities/region/model/types';
import {RegionOrderSeal} from '../../../../entities/region/ui/RegionOrderSeal/RegionOrderSeal';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {getRegionArtworkViewBox} from '../../../../shared/lib/map/getRegionArtworkViewBox';
import {JourneyBook} from '../../../journey-book/ui/JourneyBook/JourneyBook';
import styles from './CompletedCampaign.module.css';

interface CompletedCampaignProps {
  campaign: Campaign;
  region: Region;
}

function getPersonSummary(person: CampaignPerson): string {
  return person.description ?? person.story ?? person.role ?? '';
}

export function CompletedCampaign({campaign, region}: CompletedCampaignProps) {
  const chronicle = campaign.completedChronicle;
  const trialsCount = chronicle?.trials.length ?? campaign.locations.length;
  const enemiesCount = chronicle?.defeatedEnemies.reduce((total, enemy) => total + enemy.count, 0) ?? 0;
  const restoredCount = chronicle?.restored.length ?? 0;
  const enemiesById = new Map(campaign.enemies.map((enemy) => [enemy.id, enemy]));
  const regionImages = region.imageLayers ?? [region.image];
  const illustratedLocations = campaign.locations.filter((location) => location.visual);
  const illustratedCast = [...(campaign.npcs ?? []), ...campaign.enemies].filter((person) => person.visual);
  const presentation = campaign.presentation;
  const statusSeal = presentation?.statusSeal ?? {primary: 'Глава', secondary: 'закрыта'};

  return (
    <div className={styles.campaign}>
      <section className={styles.hero}>
        <div className={styles.mapStage} aria-label={`Освобождённый регион «${region.name}»`}>
          <span className={styles.magicAura} aria-hidden="true"><i /><i /><i /><i /></span>
          <svg viewBox={getRegionArtworkViewBox(region.id)} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Освобождённый регион «${region.name}»`}>
            {regionImages.map((image) => <image href={resolveAsset(image)} key={image} width="1024" height="1024" />)}
          </svg>
          <svg className={styles.chapterSeal} viewBox="0 0 64 64" aria-hidden="true"><RegionOrderSeal order={region.order} x={32} y={32} /></svg>
        </div>

        <article className={styles.heroCopy}>
          <p className={styles.kicker}>Завершённая кампания</p>
          <h2>{campaign.title}</h2>
          <p className={styles.subtitle}>{campaign.subtitle}</p>
          <p className={styles.summary}>{chronicle?.completedSummary ?? campaign.summary}</p>
          <div className={styles.status}>
            <div className={styles.seal}><strong>{statusSeal.primary}</strong><b>{statusSeal.secondary}</b></div>
            <div><small>{chronicle?.statusLabel}</small><p>{chronicle?.finalResult}</p></div>
          </div>
        </article>
      </section>

      <section className={styles.scoreboard} aria-label="Краткие итоги завершённой кампании">
        <div><strong>{trialsCount}</strong><span>испытаний пройдено</span></div>
        <div><strong>{campaign.partyCharacterIds.length}</strong><span>героев в походе</span></div>
        <div><strong>{enemiesCount}</strong><span>врагов побеждено</span></div>
        <div><strong>{restoredCount}</strong><span>итога освобождения</span></div>
      </section>

      <section className={styles.sealTrack} aria-label="Ключевые испытания кампании">
        <div className={styles.sectionHeading}>
          <span>{presentation?.milestonesEyebrow ?? 'Ключевые испытания'}</span>
          <h2>{presentation?.milestonesTitle ?? 'Путь завершённой кампании'}</h2>
        </div>
        <ol>
          {chronicle?.trials.map((trial, index) => (
            <li key={trial.id}>
              <span>{index + 1}</span>
              <div><strong>{trial.title}</strong><p>{trial.result}</p></div>
            </li>
          ))}
        </ol>
      </section>

      {illustratedLocations.length > 0 && (
        <section className={styles.artGallery} aria-label="Иллюстрированный маршрут кампании">
          <div className={styles.sectionHeading}>
            <span>{presentation?.galleryEyebrow ?? 'Концепт-арты кампании'}</span>
            <h2>{presentation?.galleryTitle ?? 'Маршрут от начала до финала'}</h2>
          </div>
          <div className={styles.locationGallery}>
            {illustratedLocations.map((location) => (
              <figure key={location.id}>
                <img src={resolveAsset(location.visual!.image)} alt={location.visual!.alt} loading="lazy" decoding="async" />
                <figcaption><span>{String(location.order).padStart(2, '0')}</span><div><strong>{location.name}</strong><p>{location.summary}</p></div></figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <JourneyBook campaign={campaign} />

      {illustratedCast.length > 0 && (
        <section className={styles.cast} aria-label="Персонажи кампании">
          <div className={styles.sectionHeading}>
            <span>Лица кампании</span>
            <h2>{presentation?.castTitle ?? 'Союзники и противники'}</h2>
          </div>
          <div className={styles.castGrid}>
            {illustratedCast.map((person) => (
              <article key={person.id}>
                <img src={resolveAsset(person.visual!.image)} alt={person.visual!.alt} loading="lazy" decoding="async" />
                <div><span>{person.role ?? 'Противник'}</span><h3>{person.name}</h3><p>{getPersonSummary(person)}</p></div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className={styles.aftermath} aria-label="Побеждённые враги и последствия">
        <div className={styles.sectionHeading}>
          <span>{presentation?.aftermathEyebrow ?? 'Итоги стычек'}</span>
          <h2>{presentation?.aftermathTitle ?? 'Побеждённые противники'}</h2>
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
        {campaign.ending.visual && (
          <figure className={styles.rewardArt}>
            <img src={resolveAsset(campaign.ending.visual.image)} alt={campaign.ending.visual.alt} loading="lazy" decoding="async" />
          </figure>
        )}
        <div className={styles.rewardCopy}>
          <span>{chronicle?.statusLabel}</span>
          <h2>{campaign.ending.featureTitle ?? 'Финал кампании'}</h2>
          <p className={styles.final}>{chronicle?.finalResult}</p>
          <p>{campaign.ending.reward}</p>
        </div>
      </section>
    </div>
  );
}
