import type {CSSProperties} from 'react';
import type {Region} from '../../../../entities/region/model/types';
import {getCharacterById} from '../../../../entities/character/model/data';
import {RegionOrderSeal} from '../../../../entities/region/ui/RegionOrderSeal/RegionOrderSeal';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {getRegionArtworkViewBox} from '../../../../shared/lib/map/getRegionArtworkViewBox';
import styles from './PlannedCampaign.module.css';

export function PlannedCampaign({region}: {region: Region}) {
  const gameMaster = getCharacterById(region.gameMasterCharacterId);
  const teaser = region.teaser;
  const bookStyle = {
    '--chronicle-cover': `url("${resolveAsset('assets/concepts/style/planned-campaign-open-book.png')}")`,
  } as CSSProperties;

  return (
    <section className={styles.scene}>
      <div className={styles.atmosphere} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <article className={styles.chronicle} style={bookStyle} aria-label="Открытая летопись будущей кампании">
        <div className={styles.chronicleInner}>
          <section className={`${styles.bookPage} ${styles.illustrationPage} ${teaser ? styles.teaserPage : ''}`} aria-label={`Иллюстрация региона «${region.name}»`}>
            <div className={`${styles.pageIllustration} ${teaser ? styles.teaserArtwork : ''}`}>
              <span className={styles.magicAura} aria-hidden="true"><i /><i /><i /><i /><i /></span>
              {teaser ? (
                <img src={resolveAsset(teaser.image)} alt={`Тизер кампании «${teaser.title}»`} />
              ) : (
                <svg viewBox={getRegionArtworkViewBox(region.id)} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Концепт региона «${region.name}»`}>
                  <image href={resolveAsset(region.image)} width="1024" height="1024" />
                </svg>
              )}
            </div>
            <svg className={styles.chapterSeal} viewBox="0 0 64 64" aria-hidden="true"><RegionOrderSeal order={region.order} x={32} y={32} /></svg>
          </section>
          <section className={`${styles.bookPage} ${styles.detailsPage} ${teaser ? styles.teaserDetails : ''}`}>
            <div className={styles.copy}>
              <p className={styles.kicker}>{teaser?.eyebrow ?? 'Неизведанная земля'}</p>
              <h2>{teaser?.title ?? 'Летопись ещё молчит'}</h2>
              <p className={styles.description}>{teaser?.description ?? region.description}</p>
              {gameMaster ? <p className={styles.assignment}><span>Мастер региона</span><strong>{gameMaster.name}</strong></p> : null}
              <p className={styles.legend}>{teaser ? '«Райский остров уже готовит первую страницу. Осталось дождаться, когда будет сломана печать новой кампании».' : '«Чернила ещё не коснулись этой страницы. Когда печать будет сломлена, земля откроет мастеру свои дороги, тайны и имена».'}</p>
              <p className={styles.contentsTitle}>В грядущей главе</p>
              <ul className={styles.contents}>
                {teaser ? <><li>Разрушительный мальчишник</li><li>Райский тропический остров</li><li>Новая глава Восьми Земель</li></> : <><li>Пути сквозь неизведанное</li><li>Лица, хранящие тайны</li><li>Испытания и реликвии</li></>}
              </ul>
            </div>
            <div className={styles.status}>
              <span aria-hidden="true">◈</span>
              <div><small>Статус экспедиции</small><strong>{teaser ? 'Кампания скоро' : 'Подготовка к путешествию'}</strong></div>
            </div>
          </section>
        </div>
      </article>
    </section>
  );
}
