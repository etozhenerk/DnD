import {isCombatCreature} from '../../../entities/combat/model/combatObjectives.ts';
import {getCombatHeroAc} from '../../../entities/combat/model/combatRules';
import {getCombatActionActivation, isCombatActionSourceAvailable} from '../../run-combat/model/combatCommands';
import type {
  GalleryGameplayDefinition,
  GalleryHeroSource,
} from '../../../entities/campaign-session/model/galleryGameplay';
import type {GallerySessionSnapshot} from '../../../entities/campaign-session/model/gallerySession';
import {
  getNpcDecisionOptions,
  selectNpcDecision,
} from '../../../entities/combat/model/npcBehavior';
import type {
  NpcBehaviorActionDefinition,
  NpcBehaviorDefinition,
  NpcBehaviorParticipant,
  NpcDecision,
} from '../../../entities/combat/model/npcBehavior';

export interface NpcDecisionActorView {
  id: string;
  name: string;
  active: boolean;
  support: boolean;
}

export interface NpcDecisionView {
  actor: NpcDecisionActorView;
  skillActionIds: string[];
  suggestion: NpcDecision;
  options: NpcDecision[];
}

interface CreateNpcDecisionInput {
  actorId: string;
  definition: GalleryGameplayDefinition;
  heroes: GalleryHeroSource[];
  phaseId?: string;
  state: GallerySessionSnapshot;
}

function getHeroConditions(state: GallerySessionSnapshot, heroId: string) {
  return [...new Set([
    ...(state.participantConditions[heroId] ?? []),
    ...(state.flags[`show18-shamed-${heroId}`] ? ['shamed'] : []),
    ...(state.flags[`show18-assigned-role-${heroId}`] ? ['assigned-role'] : []),
    ...(state.flags[`performing-choreography-${heroId}`] ? ['performing-choreography'] : []),
  ])];
}

function getParticipants(
  state: GallerySessionSnapshot,
  heroes: GalleryHeroSource[],
  includeOlva: boolean,
): NpcBehaviorParticipant[] {
  return [
    ...heroes.map((hero): NpcBehaviorParticipant => ({
      id: hero.id,
      name: hero.name,
      faction: 'hero',
      hp: state.heroHp[hero.id] ?? 0,
      maxHp: state.heroMaxHp[hero.id] ?? hero.maxHp,
      ac: state.combat ? getCombatHeroAc(state.combat, {...hero, ac: state.heroAc[hero.id] ?? hero.ac}) : state.heroAc[hero.id] ?? hero.ac,
      stats: hero.stats,
      threat: state.heroAttackBonuses[hero.id] ?? Math.max(0, ...Object.values(hero.stats)),
      conditions: getHeroConditions(state, hero.id),
    })),
    ...Object.values(state.combat?.enemies ?? {}).filter(isCombatCreature).map((enemy): NpcBehaviorParticipant => ({
      id: enemy.id,
      name: enemy.name,
      faction: 'enemy',
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      ac: enemy.ac,
      conditions: state.participantConditions[enemy.id] ?? [],
    })),
    ...(includeOlva ? [{
      id: 'olga-vasilenko',
      name: 'Леди Оливия',
      faction: 'hero' as const,
      hp: 1,
      maxHp: 1,
      ac: 10,
      conditions: [],
    }] : []),
  ];
}

function createFallbackProfile(
  encounterId: string,
  actorId: string,
  actionId: string,
  actionName: string,
): NpcBehaviorDefinition {
  return {
    id: `${actorId}-fallback-behavior`,
    encounterId,
    actorIds: [actorId],
    actions: [{
      id: actionId,
      name: actionName,
      category: 'attack',
      target: 'one-opponent',
      baseScore: 100,
      explanation: 'NPC применяет единственную доступную атаку',
    }],
    targetPriorities: [
      {rule: 'lowest-hp', score: 30, explanation: 'цель имеет минимальные текущие HP'},
      {rule: 'lowest-ac', score: 10, explanation: 'при равенстве цель хуже защищена'},
    ],
  };
}

function getPreviousTargetIds(state: GallerySessionSnapshot, actorId: string) {
  const includeOwnPreviousTarget = state.combat?.encounterId === 'dressing-room-mirror-doubles';
  const show18Targets = Object.keys(state.heroHp).filter(
    (heroId) => state.flags[`show18-first-round-target-${heroId}`],
  );
  const otherNpcTargets = Object.entries(state.npcOverrides).flatMap(([enemyId, override]) => (
    enemyId === actorId && !includeOwnPreviousTarget
      ? []
      : override.targetIds ?? (override.targetId ? [override.targetId] : [])
  ));
  return [...new Set([...show18Targets, ...otherNpcTargets])];
}

export function createNpcDecisionView({
  actorId,
  definition,
  heroes,
  phaseId,
  state,
}: CreateNpcDecisionInput): NpcDecisionView | null {
  const combat = state.combat;
  if (!combat) return null;
  const activeActorId = combat.initiativeOrder[combat.turnIndex] ?? '';
  const enemy = combat.enemies[actorId];
  const support = actorId === 'olga-vasilenko';
  if ((!enemy && !support) || (enemy && !isCombatCreature(enemy))) return null;
  if (support && combat.encounterId !== 'universal-advice-algorithm') return null;

  const configuredProfile = definition.npcBehaviors.find((candidate) => (
    candidate.encounterId === combat.encounterId && candidate.actorIds.includes(actorId)
  ));
  const profile = configuredProfile ?? (enemy
    ? createFallbackProfile(combat.encounterId, actorId, enemy.attack.id, enemy.attack.name)
    : undefined);
  if (!profile) return null;

  const availableActionIds = support
    ? ['olga-restore-boundary']
    : actorId === 'rail-prop-kraken'
      ? [enemy!.attack.id, 'rail-charge']
      : [enemy!.attack.id, ...definition.combatActions.filter((action) => (
        action.characterId === actorId && action.encounterIds.includes(combat.encounterId)
        && getCombatActionActivation(action) !== 'passive'
        && isCombatActionSourceAvailable(action, state)
      )).map((action) => action.id)];
  const flags = {
    ...state.flags,
    'combat-weakness-exposed': combat.weaknessExposed,
  };
  const context = {
    encounterId: combat.encounterId,
    actorId,
    round: combat.round,
    phaseId,
    participants: getParticipants(state, heroes, support),
    flags,
    resources: {
      'show18-olva-assist': state.flags['show18-olva-assist-used'] ? 0 : 1,
    },
    availableActionIds,
    activeChannelTargetId: state.lastRoll?.heroId,
    lastInteractorId: state.lastRoll?.heroId,
    previousTargetIds: getPreviousTargetIds(state, actorId),
  };
  const options = getNpcDecisionOptions(profile, context);
  const prepared = state.npcOverrides[actorId];
  const preparedOption = prepared && !prepared.confirmed && !prepared.skipped
    && combat.selectedActionIds.includes(prepared.actionId)
    ? options.find((option) => option.actionId === prepared.actionId) : undefined;
  const preparedTargets = prepared?.targetIds ?? [];
  const suggestion = preparedOption && preparedTargets.length === preparedOption.targetIds.length
    && preparedTargets.every((id) => preparedOption.legalTargetIds.includes(id))
    ? {...preparedOption, targetIds: preparedTargets}
    : selectNpcDecision(profile, context);
  return {
    skillActionIds: definition.combatActions.filter((action) => availableActionIds.includes(action.id)).map((action) => action.id),
    actor: {
      id: actorId,
      name: enemy?.name ?? 'Оливия',
      active: actorId === activeActorId,
      support,
    },
    suggestion,
    options,
  };
}

export function createNpcDecisionActors(
  definition: GalleryGameplayDefinition,
  state: GallerySessionSnapshot,
  heroes: GalleryHeroSource[],
  phaseId?: string,
): NpcDecisionActorView[] {
  const combat = state.combat;
  if (!combat) return [];
  const activeActorId = combat.initiativeOrder[combat.turnIndex] ?? '';
  const enemies = Object.values(combat.enemies)
    .filter((enemy) => isCombatCreature(enemy) && enemy.hp > 0)
    .map((enemy) => ({id: enemy.id, name: enemy.name, active: enemy.id === activeActorId, support: false}));
  const olvaDecision = createNpcDecisionView({
    actorId: 'olga-vasilenko',
    definition,
    heroes,
    phaseId,
    state,
  });
  return [
    ...enemies,
    ...(olvaDecision && olvaDecision.suggestion.actionId !== 'skip' ? [olvaDecision.actor] : []),
  ];
}

export function getNpcBehaviorAction(
  definition: GalleryGameplayDefinition,
  encounterId: string,
  actorId: string,
  actionId: string,
): NpcBehaviorActionDefinition | undefined {
  return definition.npcBehaviors
    .find((profile) => profile.encounterId === encounterId && profile.actorIds.includes(actorId))
    ?.actions.find((action) => action.id === actionId);
}
