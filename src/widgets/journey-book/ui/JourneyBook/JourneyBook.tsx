import type {Campaign} from '../../../../entities/campaign/model/types';
import styles from './JourneyBook.module.css';

export function JourneyBook({campaign}: {campaign: Campaign}) {
  return (
    <section className={styles.book}>
      <article className={styles.page}>
        <p className={styles.kicker}>Хроника похода</p>
        <h2>Путь через вечный рейс</h2>
        <p className={styles.lead}>{campaign.summary}</p>
        <div className={styles.route}>
          {campaign.locations.map((location) => (
            <div className={styles.stop} key={location.id}>
              <span>{location.order}</span>
              <div><strong>{location.name}</strong><p>{location.summary}</p></div>
            </div>
          ))}
        </div>
      </article>
      <article className={styles.page}>
        <p className={styles.kicker}>Финал легенды</p>
        <h2>Дракон побеждён</h2>
        <ul className={styles.seals}>
          <li><span>Ⅰ</span><strong>Башня расписания</strong><small>Диспетчерская больше не меняет пути жителей.</small></li>
          <li><span>Ⅱ</span><strong>Катакомбы багажа</strong><small>Украденные реликвии вернулись домой.</small></li>
          <li><span>Ⅲ</span><strong>Полоса нулевой видимости</strong><small>Последняя защита АэроДракса пала.</small></li>
        </ul>
        <div className={styles.enemy}>
          <span>Побеждённый противник</span>
          <strong>{campaign.enemies.find((enemy) => enemy.id === 'aerodrax')?.name}</strong>
          <p>95 HP · 17 AC · финальный босс</p>
        </div>
        <p className={styles.ending}>{campaign.ending.readAloud}</p>
      </article>
    </section>
  );
}
