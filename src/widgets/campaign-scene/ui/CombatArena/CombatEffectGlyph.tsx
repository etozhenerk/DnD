import {combatEffectVisuals, type CombatEffectVisualId} from '../../../../entities/combat/model/combatEffectVisuals';
import styles from './CombatEffectGlyph.module.css';

export function CombatEffectGlyph({visual = 'resonance'}: {visual?: CombatEffectVisualId}) {
  return <svg className={styles.glyph} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d={combatEffectVisuals[visual].path} />
  </svg>;
}
