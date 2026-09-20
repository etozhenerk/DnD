export type NpcBehaviorCategory = 'phase' | 'support' | 'control' | 'attack' | 'retreat';

export type NpcBehaviorTarget =
  | 'none'
  | 'self'
  | 'one-opponent'
  | 'multiple-opponents'
  | 'all-opponents'
  | 'one-ally';

export type NpcTargetRule =
  | 'active-channel'
  | 'last-interactor'
  | 'highest-check-bonus'
  | 'highest-threat'
  | 'highest-hp'
  | 'lowest-hp'
  | 'lowest-ac'
  | 'most-wounded-ally'
  | 'required-condition'
  | 'different-target';

export interface NpcBehaviorActionDefinition {
  id: string;
  name: string;
  category: NpcBehaviorCategory;
  target: NpcBehaviorTarget;
  baseScore: number;
  explanation: string;
  maxTargets?: number;
  leaveOneOpponentSafe?: boolean;
  avoidPreviousTargets?: boolean;
  phaseIds?: string[];
  minRound?: number;
  maxRound?: number;
  requiresFlags?: string[];
  forbidsFlags?: string[];
  resourceId?: string;
  actorHpRatioLte?: number;
  requiredTargetConditions?: string[];
  excludedTargetConditions?: string[];
  resolution?:
    | {type: 'attack'}
    | {
      type: 'telegraphed-saving-throw';
      telegraphFlag: string;
      stat: string;
      dc: number;
      damage: string;
      condition: string;
    }
    | {type: 'support'}
    | {type: 'custom'};
}

export interface NpcBehaviorTargetPriorityDefinition {
  rule: NpcTargetRule;
  score: number;
  explanation: string;
  actionIds?: string[];
  minRound?: number;
  maxRound?: number;
}

export interface NpcBehaviorDefinition {
  id: string;
  encounterId: string;
  actorIds: string[];
  actions: NpcBehaviorActionDefinition[];
  targetPriorities: NpcBehaviorTargetPriorityDefinition[];
}

export interface NpcBehaviorParticipant {
  id: string;
  name: string;
  faction: 'hero' | 'enemy';
  hp: number;
  maxHp: number;
  ac: number;
  stats?: Record<string, number>;
  threat?: number;
  conditions?: string[];
}

export interface NpcBehaviorContext {
  encounterId: string;
  actorId: string;
  round: number;
  phaseId?: string;
  participants: NpcBehaviorParticipant[];
  flags?: Record<string, boolean>;
  resources?: Record<string, number>;
  availableActionIds?: string[];
  activeChannelTargetId?: string;
  lastInteractorId?: string;
  previousTargetIds?: string[];
}

export interface NpcDecision {
  actionId: string;
  actionName: string;
  category: NpcBehaviorCategory | 'skip';
  targetIds: string[];
  legalTargetIds: string[];
  score: number;
  explanation: string;
}

const categoryLabels: Record<NpcBehaviorCategory, string> = {
  phase: 'фазовый приоритет',
  support: 'поддержка',
  control: 'контроль',
  attack: 'атака',
  retreat: 'отступление',
};

function stableDecisionKey(decision: Pick<NpcDecision, 'actionId' | 'targetIds'>) {
  return `${decision.actionId}:${decision.targetIds.join(',')}`;
}

function hasEveryFlag(flags: Record<string, boolean>, required: string[] | undefined) {
  return !required?.some((flag) => !flags[flag]);
}

function hasNoForbiddenFlag(flags: Record<string, boolean>, forbidden: string[] | undefined) {
  return !forbidden?.some((flag) => flags[flag]);
}

function hasAnyCondition(participant: NpcBehaviorParticipant, conditionIds: string[] | undefined) {
  return !conditionIds?.length
    || conditionIds.some((conditionId) => participant.conditions?.includes(conditionId));
}

function hasNoExcludedCondition(participant: NpcBehaviorParticipant, conditionIds: string[] | undefined) {
  return !conditionIds?.some((conditionId) => participant.conditions?.includes(conditionId));
}

function getHighestCheckBonus(participant: NpcBehaviorParticipant) {
  return Math.max(0, ...Object.values(participant.stats ?? {}));
}

function getTargetPool(
  action: NpcBehaviorActionDefinition,
  actor: NpcBehaviorParticipant,
  participants: NpcBehaviorParticipant[],
  context: NpcBehaviorContext,
) {
  if (action.target === 'none') return [];
  if (action.target === 'self') return actor.hp > 0 ? [actor] : [];
  const wantsAlly = action.target === 'one-ally';
  const legalTargets = participants.filter((participant) => (
    participant.hp > 0
    && participant.id !== actor.id
    && (wantsAlly ? participant.faction === actor.faction : participant.faction !== actor.faction)
    && hasAnyCondition(participant, action.requiredTargetConditions)
    && hasNoExcludedCondition(participant, action.excludedTargetConditions)
  ));
  if (!action.avoidPreviousTargets) return legalTargets;
  const freshTargets = legalTargets.filter(
    (participant) => !(context.previousTargetIds ?? []).includes(participant.id),
  );
  return freshTargets.length ? freshTargets : legalTargets;
}

function isActionLegal(
  action: NpcBehaviorActionDefinition,
  actor: NpcBehaviorParticipant,
  context: NpcBehaviorContext,
) {
  const flags = context.flags ?? {};
  const resources = context.resources ?? {};
  const hpRatio = actor.maxHp > 0 ? actor.hp / actor.maxHp : 0;
  return actor.hp > 0
    && (!context.availableActionIds || context.availableActionIds.includes(action.id))
    && (!action.phaseIds?.length || Boolean(context.phaseId && action.phaseIds.includes(context.phaseId)))
    && (action.minRound === undefined || context.round >= action.minRound)
    && (action.maxRound === undefined || context.round <= action.maxRound)
    && hasEveryFlag(flags, action.requiresFlags)
    && hasNoForbiddenFlag(flags, action.forbidsFlags)
    && (!action.resourceId || (resources[action.resourceId] ?? 0) > 0)
    && (action.actorHpRatioLte === undefined || hpRatio <= action.actorHpRatioLte);
}

function getTargetRuleScore(
  rule: NpcBehaviorTargetPriorityDefinition,
  target: NpcBehaviorParticipant,
  targets: NpcBehaviorParticipant[],
  context: NpcBehaviorContext,
) {
  if (rule.actionIds?.length && !rule.actionIds.includes(context.availableActionIds?.[0] ?? '')) return 0;
  if (rule.minRound !== undefined && context.round < rule.minRound) return 0;
  if (rule.maxRound !== undefined && context.round > rule.maxRound) return 0;

  const highestHp = Math.max(...targets.map((candidate) => candidate.hp));
  const lowestHp = Math.min(...targets.map((candidate) => candidate.hp));
  const lowestAc = Math.min(...targets.map((candidate) => candidate.ac));
  const greatestCheckBonus = Math.max(...targets.map(getHighestCheckBonus));
  const greatestThreat = Math.max(...targets.map((candidate) => candidate.threat ?? 0));
  const mostMissingHp = Math.max(...targets.map((candidate) => candidate.maxHp - candidate.hp));
  const matches = (
    (rule.rule === 'active-channel' && target.id === context.activeChannelTargetId)
    || (rule.rule === 'last-interactor' && target.id === context.lastInteractorId)
    || (rule.rule === 'highest-check-bonus' && getHighestCheckBonus(target) === greatestCheckBonus)
    || (rule.rule === 'highest-threat' && (target.threat ?? 0) === greatestThreat)
    || (rule.rule === 'highest-hp' && target.hp === highestHp)
    || (rule.rule === 'lowest-hp' && target.hp === lowestHp)
    || (rule.rule === 'lowest-ac' && target.ac === lowestAc)
    || (rule.rule === 'most-wounded-ally' && target.maxHp - target.hp === mostMissingHp && mostMissingHp > 0)
    || (rule.rule === 'required-condition' && (target.conditions?.length ?? 0) > 0)
    || (rule.rule === 'different-target' && !(context.previousTargetIds ?? []).includes(target.id))
  );
  return matches ? rule.score : 0;
}

function evaluateAction(
  profile: NpcBehaviorDefinition,
  action: NpcBehaviorActionDefinition,
  actor: NpcBehaviorParticipant,
  context: NpcBehaviorContext,
): NpcDecision | null {
  if (!isActionLegal(action, actor, context)) return null;
  const targets = getTargetPool(action, actor, context.participants, context);
  if (action.target !== 'none' && !targets.length) return null;

  const relevantRules = profile.targetPriorities.filter((rule) => (
    (!rule.actionIds?.length || rule.actionIds.includes(action.id))
    && (rule.minRound === undefined || context.round >= rule.minRound)
    && (rule.maxRound === undefined || context.round <= rule.maxRound)
  ));
  const scoredTargets = targets.map((target) => {
    const matchedRules = relevantRules.filter((rule) => (
      getTargetRuleScore(rule, target, targets, {...context, availableActionIds: [action.id]}) > 0
    ));
    return {
      target,
      score: matchedRules.reduce((sum, rule) => sum + rule.score, 0),
      reasons: matchedRules.map((rule) => rule.explanation),
    };
  }).sort((left, right) => (
    right.score - left.score || left.target.id.localeCompare(right.target.id)
  ));

  let targetCount = 0;
  if (action.target === 'self' || action.target === 'one-opponent' || action.target === 'one-ally') targetCount = 1;
  if (action.target === 'multiple-opponents') {
    const safeLimit = action.leaveOneOpponentSafe ? Math.max(0, targets.length - 1) : targets.length;
    targetCount = Math.min(action.maxTargets ?? targets.length, safeLimit);
  }
  if (action.target === 'all-opponents') targetCount = targets.length;
  if (action.target !== 'none' && targetCount === 0) return null;

  const selectedTargets = scoredTargets.slice(0, targetCount);
  const targetReasons = [...new Set(selectedTargets.flatMap((target) => target.reasons))];
  const targetNames = selectedTargets.map((target) => target.target.name).join(', ');
  const targetExplanation = targetNames
    ? `${selectedTargets.length > 1 ? 'Цели' : 'Цель'}: ${targetNames}${targetReasons.length ? ` — ${targetReasons.join('; ')}` : ''}.`
    : 'Действие не требует цели.';

  return {
    actionId: action.id,
    actionName: action.name,
    category: action.category,
    targetIds: selectedTargets.map((target) => target.target.id),
    legalTargetIds: scoredTargets.map((target) => target.target.id),
    score: action.baseScore + selectedTargets.reduce((sum, target) => sum + target.score, 0),
    explanation: `${categoryLabels[action.category]}: ${action.explanation} ${targetExplanation}`,
  };
}

export function getNpcDecisionOptions(
  profile: NpcBehaviorDefinition,
  context: NpcBehaviorContext,
): NpcDecision[] {
  if (profile.encounterId !== context.encounterId || !profile.actorIds.includes(context.actorId)) return [];
  const actor = context.participants.find((participant) => participant.id === context.actorId);
  if (!actor) return [];
  return profile.actions
    .map((action) => evaluateAction(profile, action, actor, context))
    .filter((decision): decision is NpcDecision => Boolean(decision))
    .sort((left, right) => (
      right.score - left.score || stableDecisionKey(left).localeCompare(stableDecisionKey(right))
    ));
}

export function selectNpcDecision(
  profile: NpcBehaviorDefinition,
  context: NpcBehaviorContext,
): NpcDecision {
  return getNpcDecisionOptions(profile, context)[0] ?? {
    actionId: 'skip',
    actionName: 'Пропустить ход',
    category: 'skip',
    targetIds: [],
    legalTargetIds: [],
    score: 0,
    explanation: 'Нет легального действия или доступной цели. Мастер может подтвердить пропуск хода.',
  };
}
