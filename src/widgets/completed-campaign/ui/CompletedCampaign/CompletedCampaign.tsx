import type {Region} from '../../../../entities/region/model/types';
import {norIlSkaldCampaign} from '../../../../shared/config/gameData';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {DiceRoller} from '../../../../features/dice-roll/ui/DiceRoller/DiceRoller';
import {JourneyBook} from '../../../journey-book/ui/JourneyBook/JourneyBook';
import styles from './CompletedCampaign.module.css';

export function CompletedCampaign({region}: {region: Region}) {
  return (
    <div className={styles.campaign}>
      <section className={styles.hero}>
        <div className={styles.regionArt}><img src={resolveAsset(region.image)} alt="Ледяное королевство Нор’Иль’Скальд" /></div>
        <article className={styles.plaque}>
          <p>Летопись завершена</p>
          <h2>{norIlSkaldCampaign.title}</h2>
          <span>{norIlSkaldCampaign.subtitle}</span>
          <div className={styles.seal}><strong>Дракон</strong><b>побеждён</b></div>
          <blockquote>Три навигационные печати пали, Вечный Ледяной Двигатель умолк, а пленённый император вновь увидел свободный город. Последняя строка «Задержан» рассыпалась ледяной пылью — и на табло впервые появилось: «Прибытие — сейчас». АэроДракс побеждён, превращён в маленького ворчливого дракончика и отправлен заведовать санями. Нор’Иль’Скальд снова принадлежит тем, кто в нём живёт.</blockquote>
        </article>
      </section>
      <DiceRoller />
      <JourneyBook campaign={norIlSkaldCampaign} />
      <section className={styles.reward}>
        <span>Награда отряда</span>
        <h2>Ключ Нор’Иль’Скальда</h2>
        <p>{norIlSkaldCampaign.ending.reward}</p>
      </section>
    </div>
  );
}
