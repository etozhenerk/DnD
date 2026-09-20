export type {
  CombatActionView,
  CombatantView,
  CombatTargetView,
} from '../../../../entities/combat/model/view';

export interface CombatArmorFeedback {
  critical: boolean;
  hit: boolean;
  id: string;
  targetAc: number;
  targetId: string;
  total: number;
}

export interface CombatOptionalReroll {
  firstRoll: number;
  rerolling: boolean;
  onKeep: () => void;
  onRequestReroll: () => void;
}

export interface CombatHelpingReaction {
  description: string;
  onUse: () => void;
}
