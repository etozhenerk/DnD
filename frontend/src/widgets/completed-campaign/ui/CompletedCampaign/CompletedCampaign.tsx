import {Link} from 'react-router-dom';
import type {Campaign, CampaignPerson} from '../../../../entities/campaign/model/types';
import {CampaignMedia} from '../../../../entities/campaign/ui/CampaignMedia/CampaignMedia';
import type {Region} from '../../../../entities/region/model/types';
import {RegionOrderSeal} from '../../../../entities/region/ui/RegionOrderSeal/RegionOrderSeal';
import {characters} from '../../../../entities/character/model/data';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {getRegionArtworkViewBox} from '../../../../shared/lib/map/getRegionArtworkViewBox';
import {JourneyBook} from '../../../journey-book/ui/JourneyBook/JourneyBook';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene/ui/SceneTextPanel/SceneTextPanel';
import styles from './CompletedCampaign.module.css';

interface CompletedCampaignProps {
  campaign: Campaign;
  region: Region;
}

const enemyTierLabels: Record<string, string> = {
  minion: 'Рядовой противник',
  brute: 'Тяжёлый противник',
  lieutenant: 'Особый противник',
  'final-boss': 'Финальный босс',
};

function getPersonLabel(person: CampaignPerson & {tier?: string}): string {
  return person.role ?? enemyTierLabels[person.tier ?? ''] ?? 'Противник';
}

function getPersonSummary(person: CampaignPerson & {tier?: string}): string {
  return person.description ?? person.story ?? person.motivation ?? getPersonLabel(person);
}

export function CompletedCampaign({campaign, region}: CompletedCampaignProps) {
  const chronicle = campaign.completedChronicle;
  const trialsCount = chronicle?.trials.length ?? campaign.locations.length;
  const enemiesCount = chronicle?.defeatedEnemies.reduce((total, enemy) => total + enemy.count, 0) ?? 0;
  const restoredCount = chronicle?.restored.length ?? 0;
  const enemiesById = new Map(campaign.enemies.map((enemy) => [enemy.id, enemy]));
  const regionImages = region.imageLayers ?? [region.image];
  const illustratedLocations = campaign.locations.filter((location) => location.visual);
  const npcCast = campaign.npcs ?? [];
  const charactersById = new Map(characters.map((character) => [character.id, character]));
  const gameMaster = campaign.gameMasterCharacterId
    ? charactersById.get(campaign.gameMasterCharacterId)
    : undefined;
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

        <SceneTextPanel className={styles.heroCopy} resetKey={campaign.id} collapsible={false}>
          <p className={styles.kicker}>Завершённая кампания</p>
          <h2>{campaign.title}</h2>
          <p className={styles.subtitle}>{campaign.subtitle}</p>
          <p className={styles.summary}>{chronicle?.completedSummary ?? campaign.summary}</p>
          <div className={styles.status}>
            <div className={styles.seal}><strong>{statusSeal.primary}</strong><b>{statusSeal.secondary}</b></div>
            <div><small>{chronicle?.statusLabel}</small><p>{chronicle?.finalResult}</p></div>
          </div>
        </SceneTextPanel>
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
              <SceneTextPanel resetKey={trial.id} collapsible={false}><strong>{trial.title}</strong><p>{trial.result}</p></SceneTextPanel>
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
                <CampaignMedia visual={location.visual!} />
                <figcaption>
                  <span>{String(location.order).padStart(2, '0')}</span>
                  <SceneTextPanel resetKey={location.id} collapsible={false}>
                    <strong>{location.name}</strong>
                    <p>{location.summary}</p>
                    {location.story?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </SceneTextPanel>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <JourneyBook campaign={campaign} />

      {campaign.highlights && (
        <section className={styles.artGallery} aria-label={campaign.highlights.title}>
          <div className={styles.sectionHeading}>
            <span>{campaign.highlights.eyebrow}</span>
            <h2>{campaign.highlights.title}</h2>
          </div>
          <div className={styles.locationGallery}>
            {campaign.highlights.entries.map((entry, index) => (
              <figure key={entry.id}>
                <CampaignMedia visual={entry.visual} />
                <figcaption>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <SceneTextPanel resetKey={entry.id} collapsible={false}>
                    <strong>{entry.title}</strong><p>{entry.description}</p>
                  </SceneTextPanel>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {campaign.groupVisual && (
        <section className={styles.party} aria-label="Групповой портрет завершённого похода">
          <div className={styles.sectionHeading}>
            <span>Состав экспедиции</span>
            <h2>Герои этого похода</h2>
          </div>
          <figure className={styles.groupVisual}>
            <CampaignMedia visual={campaign.groupVisual} />
            <figcaption>
              <strong>{presentation?.groupTitle ?? 'Герои завершённого похода'}</strong>
              {gameMaster && <span>{gameMaster.name} — мастер игры</span>}
            </figcaption>
          </figure>
        </section>
      )}

      {npcCast.length > 0 && (
        <section className={styles.cast} aria-label="Неигровые персонажи кампании">
          <div className={styles.sectionHeading}>
            <span>Встреченные в пути</span>
            <h2>NPC кампании</h2>
          </div>
          <div className={`${styles.castGrid} ${styles.npcGrid}`}>
            {npcCast.map((person) => (
              <article key={person.id}>
                {person.visual
                  ? <CampaignMedia visual={person.visual} />
                  : <div className={styles.castPlaceholder} aria-hidden="true"><span>✦</span></div>}
                <SceneTextPanel className={styles.castCopy} resetKey={person.id} collapsible={false}><span>{getPersonLabel(person)}</span><h3>{person.name}</h3><p>{getPersonSummary(person)}</p></SceneTextPanel>
              </article>
            ))}
          </div>
        </section>
      )}

      {campaign.enemies.length > 0 && (
        <section className={styles.cast} aria-label="Противники кампании">
          <div className={styles.sectionHeading}>
            <span>Бестиарий похода</span>
            <h2>{presentation?.castTitle ?? 'Противники кампании'}</h2>
          </div>
          <div className={`${styles.castGrid} ${campaign.enemies.length === 2 ? styles.castPair : ''}`}>
            {campaign.enemies.map((enemy) => (
              <article key={enemy.id}>
                {enemy.visual
                  ? <CampaignMedia visual={enemy.visual} />
                  : <div className={styles.castPlaceholder} aria-hidden="true"><span>✦</span></div>}
                <SceneTextPanel className={styles.castCopy} resetKey={enemy.id} collapsible={false}><span>{getPersonLabel(enemy)}</span><h3>{enemy.name}</h3><p>{getPersonSummary(enemy)}</p></SceneTextPanel>
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
                <span aria-label={`Количество: ${defeated.count}`}>×{defeated.count}</span>
                <SceneTextPanel resetKey={defeated.enemyId} collapsible={false}><strong>{enemy?.name}</strong><p>{defeated.outcome}</p></SceneTextPanel>
              </article>
            );
          })}
        </div>
        <div className={styles.restored}>
          {chronicle?.restored.map((entry) => <SceneTextPanel key={entry.id} resetKey={entry.id} collapsible={false}><p><strong>{entry.title}</strong><span>{entry.result}</span></p></SceneTextPanel>)}
        </div>
      </section>

      <section className={styles.reward}>
        {campaign.ending.visual && (
          <figure className={styles.rewardArt}>
            <CampaignMedia visual={campaign.ending.visual} />
          </figure>
        )}
        <SceneTextPanel className={styles.rewardCopy} resetKey={campaign.id} collapsible={false}>
          <span>{chronicle?.statusLabel}</span>
          <h2>{campaign.ending.featureTitle ?? 'Финал кампании'}</h2>
          <p className={styles.final}>{chronicle?.finalResult}</p>
          <p>{campaign.ending.reward}</p>
        </SceneTextPanel>
      </section>

      {campaign.ending.rewards && campaign.ending.rewards.length > 0 && (
        <section className={styles.artGallery} aria-label="Награды кампании">
          <div className={styles.sectionHeading}>
            <span>Память о спасённой свадьбе</span>
            <h2>Награды похода</h2>
          </div>
          <div className={styles.rewardList}>
            {campaign.ending.rewards.map((reward) => (
              <article key={reward.id} className={styles.rewardCard}>
                <CampaignMedia className={styles.rewardIcon} visual={reward.visual} />
                <SceneTextPanel className={styles.castCopy} resetKey={reward.id} collapsible={false}>
                  <span>{reward.recipient}</span>
                  <h3>{reward.title}</h3>
                  <p>{reward.description}</p>
                </SceneTextPanel>
              </article>
            ))}
          </div>
        </section>
      )}

      {campaign.ending.closingVisual && (
        <section className={styles.closing} aria-label="Последний сюжетный кадр кампании">
          <div className={styles.sectionHeading}>
            <span>Эпилог финальной битвы</span>
            <h2>{campaign.ending.closingTitle ?? 'Последний кадр кампании'}</h2>
          </div>
          <figure>
            <CampaignMedia visual={campaign.ending.closingVisual} />
            {campaign.ending.closingCaption && <figcaption><SceneTextPanel resetKey={campaign.id} collapsible={false}>{campaign.ending.closingCaption}</SceneTextPanel></figcaption>}
          </figure>
        </section>
      )}

      {campaign.playableEntry && (
        <footer className={styles.playableEntry}>
          <div className={styles.sectionHeading}>
            <span>Вернуться к первой странице</span>
            <h2>У каждой легенды есть начало</h2>
          </div>
          <Link className={styles.startButton} to={campaign.playableEntry.to}>
            <svg className={styles.startSeal} viewBox="0 0 64 64" aria-hidden="true">
              <RegionOrderSeal order={region.order} x={32} y={32} />
            </svg>
            <span>{campaign.playableEntry.label}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </footer>
      )}
    </div>
  );
}
