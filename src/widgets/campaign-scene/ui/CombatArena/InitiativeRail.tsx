import type {CSSProperties} from 'react';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import type {CombatantView} from './combatTypes';
import {combatPortraitStyle} from './combatPortraitStyle';
import styles from './InitiativeRail.module.css';

interface InitiativeRailProps {
  activeId: string;
  participants: CombatantView[];
}

const railPath = 'assets/concepts/campaigns/penisuela/ui/initiative-rail-frame.png';
const frameAtlasPath = 'assets/concepts/campaigns/penisuela/ui/token-frame-atlas.png';

export function InitiativeRail({activeId, participants}: InitiativeRailProps) {
  const railStyle = {'--initiative-count': participants.length} as CSSProperties;
  return (
    <div className={styles.rail} style={railStyle} aria-label="Порядок инициативы">
      <img className={styles.railArt} src={resolveAsset(railPath)} alt="" aria-hidden="true" />
      <ol className={styles.list}>
        {participants.map((participant) => {
          const active = participant.id === activeId;
          const downed = participant.hp <= 0;
          const enemyIndex = participant.faction === 'enemy'
            ? participant.name.match(/\b([IVX]+)$/u)?.[1]
            : undefined;
          return (
            <li
              className={`${styles.participant} ${active ? styles.active : ''} ${downed ? styles.downed : ''}`}
              data-faction={participant.faction}
              data-participant-id={participant.id}
              key={participant.id}
              style={combatPortraitStyle(participant)}
              title={participant.name}
              aria-current={active ? 'step' : undefined}
            >
              <span className={styles.token}>
                <span className={styles.portraitViewport}>
                  <img className={styles.portrait} src={resolveAsset(participant.token)} alt="" />
                </span>
                {participant.faction === 'enemy' ? (
                  <span className={styles.frame} aria-hidden="true">
                    <img src={resolveAsset(frameAtlasPath)} alt="" />
                  </span>
                ) : null}
                {downed ? <span className={styles.downedMark} aria-hidden="true">×</span> : null}
                {enemyIndex ? <span className={styles.enemyIndex} aria-hidden="true">{enemyIndex}</span> : null}
              </span>
              <span className={styles.name}>{participant.name}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
