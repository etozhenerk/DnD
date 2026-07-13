import type {Campaign, CampaignPerson} from '../../../../entities/campaign/model/types';
import {CampaignMedia} from '../../../../entities/campaign/ui/CampaignMedia/CampaignMedia';
import type {Region} from '../../../../entities/region/model/types';
import {RegionOrderSeal} from '../../../../entities/region/ui/RegionOrderSeal/RegionOrderSeal';
import {characters} from '../../../../shared/config/gameData';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {getRegionArtworkViewBox} from '../../../../shared/lib/map/getRegionArtworkViewBox';
import {JourneyBook} from '../../../journey-book/ui/JourneyBook/JourneyBook';
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
  const partyMembers = (campaign.partyAtTime ?? [])
    .filter((member) => member.visual)
    .map((member) => ({member, character: charactersById.get(member.characterId)}));
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
                <CampaignMedia visual={location.visual!} />
                <figcaption><span>{String(location.order).padStart(2, '0')}</span><div><strong>{location.name}</strong><p>{location.summary}</p></div></figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <JourneyBook campaign={campaign} />

      {partyMembers.length > 0 && (
        <section className={styles.party} aria-label="Герои завершённого похода">
          <div className={styles.sectionHeading}>
            <span>Состав экспедиции</span>
            <h2>Герои этого похода</h2>
          </div>
          {campaign.groupVisual && (
            <figure className={styles.groupVisual}>
              <CampaignMedia visual={campaign.groupVisual} />
              <figcaption>
                <strong>{presentation?.groupTitle ?? 'Герои завершённого похода'}</strong>
                {gameMaster && <span>{gameMaster.name} — мастер игры</span>}
              </figcaption>
            </figure>
          )}
          <div className={styles.partyGrid}>
            {partyMembers.map(({member, character}) => (
              <article key={member.characterId}>
                <CampaignMedia visual={member.visual!} />
                <div className={styles.partyCopy}><span>{character?.race ?? 'Герой'}</span><h3>{member.displayName}</h3><p>{member.note ?? character?.role}</p></div>
              </article>
            ))}
          </div>
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
                <div className={styles.castCopy}><span>{getPersonLabel(person)}</span><h3>{person.name}</h3><p>{getPersonSummary(person)}</p></div>
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
          <div className={styles.castGrid}>
            {campaign.enemies.map((enemy) => (
              <article key={enemy.id}>
                {enemy.visual
                  ? <CampaignMedia visual={enemy.visual} />
                  : <div className={styles.castPlaceholder} aria-hidden="true"><span>✦</span></div>}
                <div className={styles.castCopy}><span>{getPersonLabel(enemy)}</span><h3>{enemy.name}</h3><p>{getPersonSummary(enemy)}</p></div>
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
            <CampaignMedia visual={campaign.ending.visual} />
          </figure>
        )}
        <div className={styles.rewardCopy}>
          <span>{chronicle?.statusLabel}</span>
          <h2>{campaign.ending.featureTitle ?? 'Финал кампании'}</h2>
          <p className={styles.final}>{chronicle?.finalResult}</p>
          <p>{campaign.ending.reward}</p>
        </div>
      </section>

      {campaign.ending.closingVisual && (
        <section className={styles.closing} aria-label="Последний сюжетный кадр кампании">
          <div className={styles.sectionHeading}>
            <span>Эпилог финальной битвы</span>
            <h2>{campaign.ending.closingTitle ?? 'Последний кадр кампании'}</h2>
          </div>
          <figure>
            <CampaignMedia visual={campaign.ending.closingVisual} />
            {campaign.ending.closingCaption && <figcaption>{campaign.ending.closingCaption}</figcaption>}
          </figure>
        </section>
      )}
    </div>
  );
}
