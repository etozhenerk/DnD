import {getAutomaticAttackLabel} from '../../../../entities/combat/model/guestSkills';
import {isCombatVictory} from '../../../../entities/combat/model/combatObjectives';
import {useEffect, useMemo, useState} from 'react';
import {
  getPendingDamageRange,
  getPendingDamageRoll,
} from '../../../../entities/combat/model/combatRules';
import type {
  CombatDefinition,
  CombatEvent,
  CombatHeroSource,
  CombatInventoryItemState,
  CombatState,
} from '../../../../entities/combat/model/types';
import type {CombatSkillVideoCue} from '../../../../entities/combat/model/skillVideo';
import {getCombatSavingThrowPresentation} from '../../../../entities/combat/model/savingThrowPresentation';
import type {CombatPortraitPresentation} from '../../../../entities/combat/model/view';
import {useCombatSkillVideosEnabled} from '../../../../features/run-combat/model/combatPresentationSettings';
import {createCombatArenaView} from '../../../../features/run-combat/model/createCombatArenaView';
import {getCombatHelpingReaction} from '../../../../features/run-combat/model/combatHelpingReaction';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {
  formatDiceExpression,
  formatDicePoolExpression,
  getDamageRoll,
  getRawDiceRange,
} from '../../../../shared/lib/dice/diceExpression';
import type {DiceSelectionMode} from '../../../../shared/lib/dice/diceSelection';
import {CombatArena} from '../CombatArena/CombatArena';
import {CombatSkillVideoOverlay} from '../CombatSkillVideoOverlay/CombatSkillVideoOverlay';

interface CombatEncounterHudProps {
  combat: CombatState;
  customEnemyTurn?: boolean;
  definition: CombatDefinition;
  diceError: boolean;
  diceReady: boolean;
  fallbackEnemyToken: string;
  heroes: CombatHeroSource[];
  heroHp: Record<string, number>;
  participantConditions?: Record<string, string[]>;
  participantTemporaryModifiers?: Record<string, number>;
  inventoryState: Record<string, CombatInventoryItemState>;
  resourceUses: Record<string, number>;
  heroPortraits?: Record<string, CombatPortraitPresentation>;
  heroTokens: Record<string, string>;
  inputValue: string;
  isRolling: boolean;
  onDefeatFallback?: () => void;
  onApplyDamage: (rawDiceTotal: number) => false | {savingThrowRequired: boolean};
  onCancelPendingAttack?: () => void;
  onContinue: () => void;
  onCombatResolved?: () => void;
  onEnemyAttack: (targetId: string, roll: number, useHelpingReaction?: boolean) => void;
  onEquipItem: (actionId: string | null) => void;
  onHeroAttack: (heroId: string, targetId: string, roll: number, rerolledFrom?: number) => boolean;
  onSummonedAllyAttack: (allyId: string, targetId: string, roll: number) => void;
  onResolveSavingThrow: (roll: number, rerolledFrom?: number, useHelpingReaction?: boolean) => boolean;
  onInputChange: (value: string) => void;
  onResetDie: () => void;
  onRoll: (expression: string, label: string, selectionMode?: DiceSelectionMode) => void;
  onSelectAction: (actionId: string) => void;
  onUseAction: (actionId: string, targetId: string, roll?: number) => boolean;
  suggestedEnemyTargetId?: string;
  timelineEvents?: readonly {id: string; type: string}[];
  victoryWordmark?: string;
}

type CombatAttackResolvedEvent = Extract<CombatEvent, {type: 'combat-attack-resolved'}>;

interface PendingInspiredAttack {
  savingThrow?: boolean;
  heroId: string;
  targetId: string;
  firstRoll: number;
  rerolling: boolean;
}

export function CombatEncounterHud({
  combat,
  customEnemyTurn = false,
  definition,
  diceError,
  diceReady,
  fallbackEnemyToken,
  heroes,
  heroHp,
  participantConditions = {},
  participantTemporaryModifiers = {},
  inventoryState,
  heroPortraits,
  heroTokens,
  inputValue,
  isRolling,
  onDefeatFallback,
  onApplyDamage,
  onCancelPendingAttack,
  onContinue,
  onCombatResolved,
  onEnemyAttack,
  onEquipItem,
  onHeroAttack,
  onSummonedAllyAttack,
  onResolveSavingThrow,
  onInputChange,
  onResetDie,
  onRoll,
  onSelectAction,
  onUseAction,
  resourceUses,
  suggestedEnemyTargetId,
  timelineEvents = [],
  victoryWordmark,
}: CombatEncounterHudProps) {
  const [heroTargetId, setHeroTargetId] = useState(heroes[0]?.id ?? '');
  const [enemyTargetId, setEnemyTargetId] = useState('');
  const [skillVideosEnabled] = useCombatSkillVideosEnabled();
  const [pendingSkillVideo, setPendingSkillVideo] = useState<CombatSkillVideoCue | null>(null);
  const [queuedSkillVideos, setQueuedSkillVideos] = useState<Array<{cue: CombatSkillVideoCue; actorId: string; round: number; encounterId: string; eventCount: number; attack: boolean; waitForTurnEnd: boolean}>>([]);
  const [pendingInspiredAttack, setPendingInspiredAttack] = useState<PendingInspiredAttack | null>(null);
  const activeCombatantId = combat.initiativeOrder[combat.turnIndex];
  const activeEnemy = combat.enemies[activeCombatantId];
  const encounter = definition.encounters.find((item) => item.id === combat.encounterId);
  const activeSavingThrow = activeEnemy?.attack.savingThrow;
  const skillVideoCues = useMemo<CombatSkillVideoCue[]>(() => definition.combatActions.flatMap((action) => (
    [action.skillVideo, action.deactivationVideo].flatMap((video) => video?.source
      ? [{
          id: action.id,
          title: action.name,
          videoSrc: resolveAsset(video.source),
          posterSrc: video.poster
            ? resolveAsset(video.poster)
            : undefined,
        }]
      : [])
  )), [definition.combatActions]);
  const latestAttackResolution = useMemo<CombatAttackResolvedEvent | undefined>(() => {
    for (let index = timelineEvents.length - 1; index >= 0; index -= 1) {
      const event = timelineEvents[index];
      if (event.type === 'combat-attack-resolved') {
        return event as CombatAttackResolvedEvent;
      }
    }
    return undefined;
  }, [timelineEvents]);

  useEffect(() => {
    if (!activeEnemy) return;
    const livingHeroes = heroes.filter((hero) => (heroHp[hero.id] ?? 0) > 0);
    const suggestedTarget = livingHeroes.find((hero) => hero.id === suggestedEnemyTargetId) ?? [...livingHeroes]
      .filter((hero) => (heroHp[hero.id] ?? 0) > 0)
      .sort((a, b) => (heroHp[a.id] ?? 0) - (heroHp[b.id] ?? 0) || a.id.localeCompare(b.id))[0];
    if (suggestedTarget) setHeroTargetId(suggestedTarget.id);
  }, [activeEnemy, heroHp, heroes, suggestedEnemyTargetId]);

  useEffect(() => {
    const firstLivingEnemy = Object.values(combat.enemies).find((enemy) => enemy.hp > 0);
    if (firstLivingEnemy && (combat.enemies[enemyTargetId]?.hp ?? 0) <= 0) {
      setEnemyTargetId(firstLivingEnemy.id);
    }
  }, [combat.enemies, enemyTargetId]);

  useEffect(() => {
    onResetDie();
    setPendingInspiredAttack(null);
  }, [activeCombatantId]);

  useEffect(() => {
    if (skillVideosEnabled) return;
    setPendingSkillVideo(null);
    setQueuedSkillVideos([]);
  }, [skillVideosEnabled]);

  useEffect(() => {
    const queuedSkillVideo = queuedSkillVideos[0];
    if (!queuedSkillVideo || pendingSkillVideo) return;
    if (queuedSkillVideo.encounterId !== combat.encounterId || timelineEvents.length < queuedSkillVideo.eventCount) {
      setQueuedSkillVideos((queue) => queue.slice(1));
      return;
    }
    // A multi-target skill can request several saves (and a burning die after each failure).
    // Wait for its resolution; bonus actions and movement keep the current turn.
    if (combat.pendingAttack || combat.pendingSavingThrow) return;
    if (queuedSkillVideo.waitForTurnEnd && queuedSkillVideo.actorId === activeCombatantId && queuedSkillVideo.round === combat.round && !isCombatVictory(combat)) return;
    if (!queuedSkillVideo.attack || latestAttackResolution?.hit) setPendingSkillVideo(queuedSkillVideo.cue);
    setQueuedSkillVideos((queue) => queue.slice(1));
  }, [queuedSkillVideos, pendingSkillVideo, activeCombatantId, combat, timelineEvents.length, latestAttackResolution]);

  const queueVideo = (cue?: CombatSkillVideoCue, {attack = false, waitForTurnEnd = true}: {attack?: boolean; waitForTurnEnd?: boolean} = {}) => {
    if (skillVideosEnabled && cue) setQueuedSkillVideos((queue) => [...queue, {
      cue, actorId: activeCombatantId, round: combat.round, encounterId: combat.encounterId,
      eventCount: timelineEvents.length ? timelineEvents.length + 1 : 0, attack, waitForTurnEnd,
    }]);
  };

  useEffect(() => {
    if (!onCombatResolved || queuedSkillVideos.length || pendingSkillVideo || combat.pendingAttack || combat.pendingSavingThrow) return;
    if (isCombatVictory(combat) || heroes.every((hero) => (heroHp[hero.id] ?? 0) <= 0)) onCombatResolved();
  }, [onCombatResolved, queuedSkillVideos.length, pendingSkillVideo, combat, heroes, heroHp]);

  const view = useMemo(() => encounter ? createCombatArenaView({
    actions: definition.combatActions,
    combat,
    encounter,
    fallbackEnemyToken,
    heroes,
    heroHp,
    inventoryState,
    participantConditions,
    heroPortraits,
    heroTokens,
    requestedEnemyTargetId: enemyTargetId,
    requestedHeroTargetId: heroTargetId,
    resourceUses,
  }) : null, [
    combat,
    definition.combatActions,
    encounter,
    enemyTargetId,
    fallbackEnemyToken,
    heroHp,
    inventoryState,
    participantConditions,
    heroPortraits,
    heroes,
    heroTargetId,
    heroTokens,
    resourceUses,
  ]);
  if (!view) return null;

  const automaticAttackLabel = !combat.pendingAttack && !combat.pendingSavingThrow
    ? getAutomaticAttackLabel(combat, view.active.id, view.selectedTargetId) : undefined;
  const pendingRange = combat.pendingAttack ? getPendingDamageRange(combat.pendingAttack) : null;
  const pendingSavingDice = combat.pendingSavingThrow
    ? getDamageRoll(combat.pendingSavingThrow.rollExpression ?? '1d20')
    : null;
  const pendingSavingRange = pendingSavingDice ? getRawDiceRange(pendingSavingDice) : null;
  const utilityDice = view.utilityAction?.requiresRoll && view.utilityAction.rollExpression
    ? getDamageRoll(view.utilityAction.rollExpression)
    : null;
  const utilityRange = utilityDice ? getRawDiceRange(utilityDice) : null;
  const rawUtilityExpression = utilityDice
    ? formatDiceExpression(utilityDice, false)
    : view.utilityAction?.rollExpression ?? '1d20';
  const inputMin = pendingRange?.min ?? pendingSavingRange?.min ?? utilityRange?.min ?? 1;
  const inputMax = pendingRange?.max ?? pendingSavingRange?.max ?? utilityRange?.max ?? 20;
  const numericInput = Number(inputValue);
  const inputValid = Number.isInteger(numericInput) && numericInput >= inputMin && numericInput <= inputMax;
  const damageRoll = combat.pendingAttack
    ? getPendingDamageRoll(combat.pendingAttack)
    : null;
  const rawDamageExpression = damageRoll
    ? formatDicePoolExpression(damageRoll.dice)
    : view.utilityAction?.rollExpression ?? '1d20';
  const defeatFallbackAvailable = Boolean(onDefeatFallback)
    && !combat.pendingAttack
    && !combat.pendingSavingThrow
    && heroes.every((hero) => (heroHp[hero.id] ?? 0) <= 0)
    && !isCombatVictory(combat);

  const selectedAttackVideoCue = () => {
    const selectedAttackAction = view.actions.find((action) => (
      action.activation === 'attack'
      && combat.selectedActionIds.includes(action.id)
      && !action.disabled
    ));
    return selectedAttackAction?.skillVideo?.source
      ? {
          id: selectedAttackAction.id,
          title: selectedAttackAction.name,
          videoSrc: resolveAsset(selectedAttackAction.skillVideo.source),
          posterSrc: selectedAttackAction.skillVideo.poster
            ? resolveAsset(selectedAttackAction.skillVideo.poster)
            : undefined,
        }
      : undefined;
  };

  const commitHeroAttack = (
    heroId: string,
    targetId: string,
    roll: number,
    rerolledFrom?: number,
  ) => {
    const attackVideoCue = selectedAttackVideoCue();
    const hit = onHeroAttack(heroId, targetId, roll, rerolledFrom);
    if (hit) queueVideo(attackVideoCue, {attack: true});
    return hit;
  };

  const applyAttack = (useHelpingReaction = false) => {
    const roll = pendingInspiredAttack && !pendingInspiredAttack.rerolling ? pendingInspiredAttack.firstRoll : numericInput;
    if ((!inputValid && !automaticAttackLabel && !pendingInspiredAttack) || !view.selectedTarget) return;
    if (automaticAttackLabel) {
      if (view.activeHero) commitHeroAttack(view.activeHero.id, view.selectedTarget.id, 20);
      else onEnemyAttack(view.selectedTarget.id, 0);
      onResetDie();
      return;
    }
    if (combat.pendingSavingThrow) {
      const save = combat.pendingSavingThrow;
      const canReroll = !['action-healing', 'area-damage-status', 'enemy-attack-reroll'].includes(save.kind ?? '')
        && combat.statuses.some((status) => status.kind === 'inspired' && status.targetId === save.targetId && status.charges > 0);
      if (pendingInspiredAttack?.rerolling) {
        onResolveSavingThrow(roll, pendingInspiredAttack.firstRoll, useHelpingReaction);
        setPendingInspiredAttack(null);
      } else if (canReroll && !useHelpingReaction) {
        setPendingInspiredAttack({heroId: save.targetId, targetId: save.targetId, firstRoll: numericInput, rerolling: false, savingThrow: true});
      } else {
        onResolveSavingThrow(roll, undefined, useHelpingReaction);
        setPendingInspiredAttack(null);
      }
    } else if (view.activeHero) {
      if (pendingInspiredAttack?.rerolling) {
        commitHeroAttack(
          pendingInspiredAttack.heroId,
          pendingInspiredAttack.targetId,
          numericInput,
          pendingInspiredAttack.firstRoll,
        );
        setPendingInspiredAttack(null);
      } else if ((combat.statuses ?? []).some((status) => (
        status.kind === 'inspired'
        && status.targetId === view.activeHero?.id
        && status.charges > 0
      ))) {
        setPendingInspiredAttack({
          heroId: view.activeHero.id,
          targetId: view.selectedTarget.id,
          firstRoll: numericInput,
          rerolling: false,
        });
      } else {
        commitHeroAttack(view.activeHero.id, view.selectedTarget.id, numericInput);
      }
    }
    else if (view.activeAlly) onSummonedAllyAttack(view.activeAlly.id, view.selectedTarget.id, numericInput);
    else if (!customEnemyTurn) {
      onEnemyAttack(view.selectedTarget.id, numericInput, useHelpingReaction);
      queueVideo(selectedAttackVideoCue(), {attack: true});
    }
    onResetDie();
  };
  const helpingRoll = pendingInspiredAttack && !pendingInspiredAttack.rerolling ? pendingInspiredAttack.firstRoll : numericInput;
  const temporaryModifier = activeEnemy ? participantTemporaryModifiers[activeEnemy.id] ?? 0 : 0;
  const helpingCombat = activeEnemy && temporaryModifier ? {
    ...combat,
    enemies: {...combat.enemies, [activeEnemy.id]: {...activeEnemy, attack: {...activeEnemy.attack, bonus: activeEnemy.attack.bonus + temporaryModifier}}},
  } : combat;
  const helpingReaction = !customEnemyTurn && !isRolling && (inputValid || pendingInspiredAttack)
    && (!view.utilityAction || combat.pendingSavingThrow) && !combat.pendingAttack && view.selectedTarget
    ? getCombatHelpingReaction({combat: helpingCombat, definition, heroes, heroHp, inventoryState, resourceUses, participantConditions},
      view.selectedTarget.id, helpingRoll, pendingInspiredAttack?.rerolling ? pendingInspiredAttack.firstRoll : undefined)
    : undefined;
  const applyDamage = () => {
    if (!inputValid || !combat.pendingAttack) return;
    const result = onApplyDamage(numericInput);
    if (!result) return;
    onResetDie();
  };
  const applyUtility = () => {
    const utilityAction = view.utilityAction;
    if (
      !utilityAction
      || utilityAction.disabled
      || (utilityAction.requiresRoll && !inputValid)
    ) return;
    const roll = utilityAction.requiresRoll ? numericInput : undefined;
    const targetId = utilityAction.target === 'enemy'
      ? view.selectedTargetId
      : view.selectedHeroTargetId;
    const skillVideoCue = utilityAction.skillVideo?.source
      ? {
          id: utilityAction.id,
          title: utilityAction.name,
          videoSrc: resolveAsset(utilityAction.skillVideo.source),
          posterSrc: utilityAction.skillVideo.poster
            ? resolveAsset(utilityAction.skillVideo.poster)
            : undefined,
        }
      : undefined;
    const applied = onUseAction(utilityAction.id, targetId, roll);
    if (!applied) return;
    onResetDie();
    queueVideo(skillVideoCue, {waitForTurnEnd: utilityAction.activation === 'action'});
  };

  return (
    <>
    <CombatArena
      savingThrowPresentation={combat.pendingSavingThrow ? getCombatSavingThrowPresentation(combat.pendingSavingThrow, combat) : undefined}
      actions={view.actions}
      active={view.active}
      armorFeedback={latestAttackResolution && !latestAttackResolution.attack.automatic ? {
        critical: latestAttackResolution.attack.critical,
        hit: latestAttackResolution.hit,
        id: latestAttackResolution.id,
        targetAc: latestAttackResolution.attack.targetAc,
        targetId: latestAttackResolution.attack.targetId,
        total: latestAttackResolution.attack.total,
      } : undefined}
      automaticAttackLabel={automaticAttackLabel}
      attackRollMode={view.attackRollMode}
      attackEnhancements={view.attackEnhancements}
      customEnemyTurn={customEnemyTurn}
      diceError={diceError}
      diceReady={diceReady}
      defeatFallback={defeatFallbackAvailable && onDefeatFallback ? {
        onConfirm: onDefeatFallback,
        summary: 'Противники не добивают героев. Аварийный протокол завершит столкновение, вернёт каждому 1 HP и сохранит обязательный сюжетный путь.',
      } : undefined}
      encounterName={view.encounter.name}
      enemyTargets={view.enemyTargets}
      enemySavingThrow={activeSavingThrow ? {
        dc: activeSavingThrow.dc,
        statLabel: activeSavingThrow.stat === 'wisdom' ? 'Мудрость' : activeSavingThrow.stat,
      } : undefined}
      inputMax={inputMax}
      inputMin={inputMin}
      inputValue={inputValue}
      isInputValid={inputValid}
      isRolling={isRolling}
      logs={combat.log}
      helpingReaction={helpingReaction ? {...helpingReaction, onUse: () => applyAttack(true)} : undefined}
      optionalReroll={pendingInspiredAttack ? {
        firstRoll: pendingInspiredAttack.firstRoll,
        rerolling: pendingInspiredAttack.rerolling,
        onKeep: () => {
          if (pendingInspiredAttack.savingThrow) onResolveSavingThrow(pendingInspiredAttack.firstRoll);
          else commitHeroAttack(
            pendingInspiredAttack.heroId,
            pendingInspiredAttack.targetId,
            pendingInspiredAttack.firstRoll,
          );
          setPendingInspiredAttack(null);
          onResetDie();
        },
        onRequestReroll: () => {
          setPendingInspiredAttack({...pendingInspiredAttack, rerolling: true});
          onResetDie();
        },
      } : undefined}
      onApplyAttack={() => applyAttack()}
      onApplyDamage={applyDamage}
      onApplyUtility={applyUtility}
      onContinue={onContinue}
      onEquipItem={onEquipItem}
      onInputChange={onInputChange}
      onRollAttack={() => onRoll(
        combat.pendingSavingThrow?.rollExpression ?? '1d20',
        combat.pendingSavingThrow
          ? getCombatSavingThrowPresentation(combat.pendingSavingThrow).title
          : activeSavingThrow ? 'Спасбросок Мудрости' : 'Бросок атаки',
        pendingInspiredAttack?.rerolling || combat.pendingSavingThrow || activeSavingThrow
          ? 'sum'
          : view.attackRollMode === 'advantage'
            ? 'highest'
            : view.attackRollMode === 'disadvantage' ? 'lowest' : 'sum',
      )}
      onRollDamage={() => onRoll(rawDamageExpression, 'Бросок урона')}
      onRollUtility={() => onRoll(
        rawUtilityExpression,
        `Действие: ${view.utilityAction?.name ?? 'предмет'}`,
      )}
      onSelectAction={(actionId) => {
        onSelectAction(actionId);
        onResetDie();
      }}
      onSelectTarget={(targetId) => {
        if (view.activeHero || view.activeAlly) setEnemyTargetId(targetId);
        else setHeroTargetId(targetId);
        onInputChange('');
      }}
      onSupportTargetChange={(targetId) => {
        setHeroTargetId(targetId);
        onInputChange('');
      }}
      participants={view.participants}
      party={view.party}
      pendingReactionAction={combat.pendingAttack
        && combat.enemies[combat.pendingAttack.actorId]
        && !combat.enemies[combat.pendingAttack.targetId]
        && (inventoryState['red-button-18-plus']?.quantity ?? 0) > 0
        && (inventoryState['red-button-18-plus']?.charges ?? 0) > 0
        && onCancelPendingAttack
        ? {
            label: 'Красная кнопка 18+: отменить реакцию',
            onUse: () => {
              setQueuedSkillVideos([]);
              onCancelPendingAttack();
            },
          }
        : undefined}
      pendingAttack={combat.pendingAttack}
      pendingSavingThrow={combat.pendingSavingThrow}
      round={combat.round}
      selectedActionIds={combat.selectedActionIds}
      selectedTargetId={view.selectedTargetId}
      supportTargetId={view.selectedHeroTargetId}
      supportTargets={view.supportTargets}
      targets={view.targets}
      utilityAction={view.utilityAction}
      victory={view.victory}
      victorySummary={view.encounter.victoryText ?? 'Противники побеждены.'}
        victoryWordmark={victoryWordmark}
      />
      <CombatSkillVideoOverlay
        cue={skillVideosEnabled ? pendingSkillVideo : null}
        preloadCues={skillVideosEnabled ? skillVideoCues : []}
        onComplete={() => setPendingSkillVideo(null)}
      />
    </>
  );
}
