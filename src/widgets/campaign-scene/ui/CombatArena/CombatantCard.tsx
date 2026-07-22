import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import type {CombatantView} from './combatTypes';
import {combatPortraitStyle} from './combatPortraitStyle';
import styles from './CombatantCard.module.css';

interface CombatantCardProps {
  combatant: CombatantView;
  compact?: boolean;
}

const tokenFramePath = 'assets/concepts/campaigns/penisuela/ui/token-frame-atlas.png';
const statIcons = {
  hp: 'assets/concepts/ui/hero-book-icon-hp.png',
  ac: 'assets/concepts/ui/hero-book-icon-ac.png',
  attack: 'assets/concepts/ui/hero-book-icon-attack.png',
};

export function CombatantCard({combatant, compact = false}: CombatantCardProps) {
  return (
    <article
      className={styles.card}
      data-compact={compact}
      style={combatPortraitStyle(combatant)}
      aria-label={`Сейчас ходит: ${combatant.name}`}
    >
      <div className={styles.portraitWrap} data-faction={combatant.faction}>
        <img className={styles.portrait} src={resolveAsset(combatant.token)} alt="" />
        {combatant.faction === 'enemy' ? (
          <span className={styles.tokenFrame} aria-hidden="true"><img src={resolveAsset(tokenFramePath)} alt="" /></span>
        ) : null}
      </div>
      <div className={styles.identity}>
        <span>Ход</span>
        <h2 title={combatant.name}>{combatant.name}</h2>
        <p title={combatant.attackName}>{combatant.attackName}</p>
      </div>
      <span className={styles.health} aria-hidden="true">
        <i style={{width: `${Math.max(0, combatant.hp / combatant.maxHp * 100)}%`}} />
      </span>
      <dl className={styles.stats}>
        <div><dt><img src={resolveAsset(statIcons.hp)} alt="" />HP</dt><dd>{combatant.hp}/{combatant.maxHp}</dd></div>
        <div><dt><img src={resolveAsset(statIcons.ac)} alt="" />AC</dt><dd>{combatant.ac}</dd></div>
        <div><dt><img src={resolveAsset(statIcons.attack)} alt="" />АТК</dt><dd>{combatant.attackBonus >= 0 ? '+' : ''}{combatant.attackBonus}</dd></div>
      </dl>
    </article>
  );
}
