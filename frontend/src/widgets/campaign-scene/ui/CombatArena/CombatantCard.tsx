import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import type {CombatantView} from './combatTypes';
import {combatPortraitStyle} from './combatPortraitStyle';
import {CombatEffectBadge} from './CombatEffectBadge';
import {CombatStatsDialog} from './CombatStatsDialog';
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
  const effects = combatant.effects ?? [];
  return (
    <article
      className={styles.card}
      data-compact={compact}
      data-faction={combatant.faction}
      style={combatPortraitStyle(combatant)}
      aria-label={`Сейчас ходит: ${combatant.name}`}
    >
      <div className={styles.portraitWrap} data-faction={combatant.faction}>
        <span className={styles.portraitViewport} aria-hidden="true">
          <img className={styles.portrait} src={resolveAsset(combatant.token)} alt="" />
        </span>
        <span className={styles.tokenFrame} aria-hidden="true"><img src={resolveAsset(tokenFramePath)} alt="" /></span>
      </div>
      <div className={styles.details}>
        <div className={styles.identity}>
          <span className={styles.turnLabel}>Ход</span>
          <h2 title={combatant.name}>{combatant.name}</h2>
          <p title={combatant.attackName}>{combatant.attackName}</p>
        </div>
        {effects.length ? (
          <ul className={styles.effects} aria-label="Активные боевые эффекты">
            {effects.map((effect) => (
              <li key={effect.id}>
                <CombatEffectBadge effect={effect} ownerName={combatant.name} />
              </li>
            ))}
          </ul>
        ) : null}
        <dl className={styles.stats}>
          <div><dt><img src={resolveAsset(statIcons.hp)} alt="" />HP</dt><dd>{combatant.hp}/{combatant.maxHp}</dd></div>
          <div><dt><img src={resolveAsset(statIcons.ac)} alt="" />AC</dt><dd>{combatant.ac}</dd></div>
          <div><dt><img src={resolveAsset(statIcons.attack)} alt="" />АТК</dt><dd>{combatant.attackBonus >= 0 ? '+' : ''}{combatant.attackBonus}</dd></div>
        </dl>
        <CombatStatsDialog combatant={combatant} />
      </div>
    </article>
  );
}
