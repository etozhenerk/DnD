import type {CombatEncounterDefinition, CombatStat} from '../../combat/model/types';
import type {NpcBehaviorDefinition} from '../../combat/model/npcBehavior';

export interface FinalBossPhaseAttackDefinition {
  id: string;
  name: string;
  bonus: number;
  damage: string;
  targets: number;
  distinctTargets?: boolean;
  secondaryAttack?: {
    id: string;
    name: string;
    bonus: number;
    damage: string;
  };
  savingThrow?: {
    stat: CombatStat;
    dc: number;
    success: 'half-damage';
  };
}

export interface FinalBossPhaseDefinition {
  id: string;
  number: number;
  name: string;
  hpFrom: number;
  hpTo: number;
  background: string;
  readAloud: string;
  attack: FinalBossPhaseAttackDefinition;
  directorDc: number;
  preparedDirectorDc?: number;
}

export interface FinalBossPlanCondition {
  always?: boolean;
  allFlags?: string[];
  counterLte?: {
    counter: 'timePressure' | 'preFinalCombats';
    value: number;
  };
}

export interface FinalBossPlanDefinition {
  id: 'standard' | 'director' | 'physical';
  label: string;
  description: string;
  condition: FinalBossPlanCondition;
  check: null | {
    stats: CombatStat[];
    dc?: number;
    dcByPhase?: number[];
  };
  endingId: 'wedding' | 'director' | 'shutdown';
  endingFlag: string;
  epilogueSceneId: 'wedding-epilogue' | 'director-epilogue' | 'shutdown-epilogue';
}

export interface FinalBossPlanCheckResolution {
  dc: number;
  modifier: number;
  natural: number;
  success: boolean;
  total: number;
}

export interface FinalBossDefinition {
  version: number;
  campaignId: string;
  sceneId: 'last-take-boss';
  encounter: CombatEncounterDefinition;
  npcBehavior: NpcBehaviorDefinition;
  segmentedHp: number[];
  overflowDamageCarries: false;
  phases: FinalBossPhaseDefinition[];
  plans: FinalBossPlanDefinition[];
  defeatFallback: {
    label: string;
    resolution: string;
    endingId: 'shutdown';
    endingFlag: 'final-physical-shutdown';
    epilogueSceneId: 'shutdown-epilogue';
  };
}
