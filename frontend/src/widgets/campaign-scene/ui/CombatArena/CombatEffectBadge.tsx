import type {CombatEffectView} from '../../../../entities/combat/model/view';
import {CombatEffectGlyph} from './CombatEffectGlyph';
import {CombatMechanicsHelp} from './CombatMechanicsHelp';
import styles from './CombatEffectBadge.module.css';

interface CombatEffectBadgeProps {
  effect: CombatEffectView;
  ownerName: string;
}

export function CombatEffectBadge({effect, ownerName}: CombatEffectBadgeProps) {
  return <CombatMechanicsHelp
    actionName={effect.shortLabel}
    contextLabel={ownerName}
    help={{entries: [{term: 'Как действует', description: effect.label}]}}
    trigger={{
      className: `${styles.badge} ${styles[effect.tone]}`,
      label: `Эффект «${effect.shortLabel}» — ${ownerName}: открыть описание`,
      content: <><CombatEffectGlyph visual={effect.visual} /><strong>{effect.shortLabel}</strong></>,
    }}
  />;
}
