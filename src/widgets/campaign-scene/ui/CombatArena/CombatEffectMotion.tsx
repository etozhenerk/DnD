import type {ReactNode} from 'react';
import {combatEffectVisuals} from '../../../../entities/combat/model/combatEffectVisuals';
import type {CombatEffectCue} from '../../model/useCombatEffectFeedback';
import {CombatEffectGlyph} from './CombatEffectGlyph';
import styles from './CombatEffectMotion.module.css';

/** A finite application clip. No active-status layers, idle animation or persistent avatar transforms. */
export function CombatEffectMotion({cue, children}: {
  cue?: CombatEffectCue;
  children: ReactNode;
}) {
  const posture = cue?.effect.visual === 'prone' ? 'prone'
    : cue?.effect.visual === 'fly' ? 'flying'
    : cue?.effect.visual === 'shrink' ? 'small'
    : cue?.effect.visual === 'rise' ? 'rising' : 'standing';

  return <span className={styles.stage} data-combat-motion>
    <span key={cue?.key ?? 'idle'} className={styles.body} data-posture={posture}>{children}</span>
    <span className={styles.layers} aria-hidden="true">
      {(cue ? [cue] : []).map(({effect, key}) => {
        const visual = effect.visual ?? 'resonance';
        const motion = combatEffectVisuals[visual].motion;
        return <span key={key} className={styles.effect} data-effect={visual} data-motion={motion}
          data-phase="applied" data-tone={effect.tone}>
          <svg className={styles.field} viewBox="0 0 100 100">
            <ellipse className={styles.ring} cx="50" cy="60" rx="42" ry="19" />
            <path className={styles.arc} d="M14 50A36 36 0 0 1 86 50M20 72A40 24 0 0 0 80 72" />
            <g className={styles.particles}>
              <path d="m15 62 4-7 4 7-4 7Zm61-30 3-6 3 6-3 6ZM48 8l3-6 3 6-3 6Z" />
              <circle cx="28" cy="30" r="2.5" /><circle cx="85" cy="67" r="3" /><circle cx="55" cy="87" r="2" />
            </g>
            {motion === 'flame' ? <g className={styles.flames}>
              <path d="M24 87C5 76 23 62 15 48c17 8 11 19 16 24 3-8 2-13 8-19-3 13 6 28-15 34Z" />
              <path d="M51 91C30 80 43 65 38 47c9 5 12 13 13 24 5-9 15-13 11-28 22 19 15 44-11 48Z" />
              <path d="M78 86C57 78 70 67 66 57c7 2 10 6 11 12 8-11 3-18 9-26 2 17 20 35-8 43Z" />
            </g> : null}
            {motion === 'vortex' ? <g className={styles.wind}>
              <path d="M9 36C-6 55 100 64 89 42M16 19C-4 36 102 47 84 25M18 65C1 79 99 90 85 68" />
            </g> : null}
            {motion === 'shield' ? <path className={styles.barrier} d="M50 5 90 21v33c0 22-40 42-40 42S10 76 10 54V21Z" /> : null}
            {motion === 'crystal' ? <g className={styles.crystals}>
              <path d="m10 48 8-22 6 22-6 16ZM76 48l8-22 6 22-6 16ZM40 18 50 1l10 17-10 10Z" />
            </g> : null}
          </svg>
          <span className={styles.symbol}><CombatEffectGlyph visual={visual} /></span>
        </span>;
      })}
    </span>
  </span>;
}
