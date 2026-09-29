import type {CSSProperties} from 'react';
import {getCombatantIndexLabel} from '../../../../entities/combat/model/combatantIndex';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import type {CombatantView} from './combatTypes';
import {combatPortraitStyle} from './combatPortraitStyle';
import styles from './InitiativeRail.module.css';

interface InitiativeRailProps {
  activeId: string;
  participants: CombatantView[];
}

const frameAtlasPath = 'assets/concepts/campaigns/penisuela/ui/token-frame-atlas.png';
const initiativeArcPath = 'assets/concepts/campaigns/penisuela/ui/floating-hud/initiative-arc.png';

export function InitiativeRail({activeId, participants}: InitiativeRailProps) {
  const railStyle = {'--initiative-count': participants.length} as CSSProperties;
  return (
    <div className={styles.rail} style={railStyle} aria-label="Порядок инициативы">
      <span className={styles.arcCrop} aria-hidden="true">
        <img className={styles.arc} src={resolveAsset(initiativeArcPath)} alt="" />
      </span>
      <ol className={styles.list}>
        {participants.map((participant, index) => {
          const active = participant.id === activeId;
          const downed = participant.hp <= 0;
          const midpoint = Math.max((participants.length - 1) / 2, 1);
          const distanceFromCenter = Math.abs(index - midpoint) / midpoint;
          const arcOffset = Math.round((1 - distanceFromCenter * distanceFromCenter) * 26);
          const participantIndex = participant.faction === 'enemy' || participant.kind === 'summon'
            ? getCombatantIndexLabel(participant.name)
            : undefined;
          const queueEffect = participant.effects?.find((effect) => (
            effect.id === 'condition-stunned' || effect.id === 'recently-skipped'
          ));
          const willSkip = queueEffect?.id === 'condition-stunned';
          const didSkip = queueEffect?.id === 'recently-skipped';
          const skipLabel = willSkip ? 'Пропустит ход' : didSkip ? 'Ход пропущен' : null;
          return (
            <li
              className={`${styles.participant} ${active ? styles.active : ''} ${downed ? styles.downed : ''} ${willSkip ? styles.willSkip : ''}`}
              data-effect-tone={queueEffect?.tone}
              data-faction={participant.faction}
              data-participant-id={participant.id}
              key={participant.id}
              style={{
                ...combatPortraitStyle(participant),
                '--initiative-offset': `${arcOffset}px`,
              } as CSSProperties}
              aria-label={`${participant.name}${queueEffect ? `, эффект очереди: ${queueEffect.label}` : ''}`}
              title={`${participant.name}${queueEffect ? ` · ${queueEffect.label}` : ''}`}
              aria-current={active ? 'step' : undefined}
            >
              <span className={styles.token}>
                <span className={styles.portraitViewport}>
                  <img className={styles.portrait} src={resolveAsset(participant.token)} alt="" />
                </span>
                <span className={styles.frame} aria-hidden="true">
                  <img src={resolveAsset(frameAtlasPath)} alt="" />
                </span>
                {downed ? <span className={styles.downedMark} aria-hidden="true">×</span> : null}
                {participantIndex ? <span className={styles.participantIndex} aria-hidden="true">{participantIndex}</span> : null}
              </span>
              {queueEffect && !downed ? (
                <span className={styles.effectBadge} data-tone={queueEffect.tone}>
                  {skipLabel}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
