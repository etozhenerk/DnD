import type {CSSProperties} from 'react';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {CombatJournalDialog} from './CombatJournalDialog';
import type {CombatantView, CombatTargetView} from './combatTypes';
import {combatPortraitStyle} from './combatPortraitStyle';
import styles from './CombatPartyBar.module.css';

interface CombatPartyBarProps {
  combatants: CombatantView[];
  heroes: CombatTargetView[];
  logs: string[];
}

const hpIcon = 'assets/concepts/ui/hero-book-icon-hp.png';
const frameAtlasPath = 'assets/concepts/campaigns/penisuela/ui/token-frame-atlas.png';

export function CombatPartyBar({combatants, heroes, logs}: CombatPartyBarProps) {
  const extraParticipants = Math.max(0, heroes.length - 5);
  const partyDensityStyle = {
    '--party-token-size': `${Math.max(2.9, 4.35 - extraParticipants * 0.36)}rem`,
    '--party-token-size-compact': `${Math.max(2.35, 3.3 - extraParticipants * 0.22)}rem`,
    '--party-token-size-small': `${Math.max(2.2, 3.1 - extraParticipants * 0.21)}rem`,
  } as CSSProperties;

  return (
    <footer className={styles.footer} aria-label="Состояние команды и журнал боя">
      <div className={styles.partyRail} style={partyDensityStyle}>
        <div className={styles.heroes} aria-label="Здоровье героев">
          {heroes.map((hero) => {
            const healthPercent = Math.max(0, Math.min(100, hero.hp / hero.maxHp * 100));
            return (
              <span
                className={`${styles.hero} ${hero.hp <= 0 ? styles.downed : ''}`}
                key={hero.id}
                style={{
                  ...combatPortraitStyle(hero),
                  '--health-percent': `${healthPercent}%`,
                } as CSSProperties}
                title={`${hero.name}: ${hero.hp}/${hero.maxHp} HP, AC ${hero.ac}`}
                aria-label={`${hero.name}, здоровье ${hero.hp} из ${hero.maxHp}, броня ${hero.ac}`}
              >
                <span className={styles.heroMedallion} aria-hidden="true">
                  <span className={styles.heroViewport}>
                    <img className={styles.heroAvatar} src={resolveAsset(hero.token)} alt="" />
                  </span>
                  <span className={styles.heroFrame}><img src={resolveAsset(frameAtlasPath)} alt="" /></span>
                </span>
                <span className={styles.heroHp} aria-hidden="true">
                  <img src={resolveAsset(hpIcon)} alt="" />
                  <b>{hero.hp}</b><small>/{hero.maxHp}</small>
                </span>
                <strong className={styles.heroName}>{hero.name}</strong>
              </span>
            );
          })}
        </div>
        <CombatJournalDialog combatants={combatants} logs={logs} />
      </div>
    </footer>
  );
}
