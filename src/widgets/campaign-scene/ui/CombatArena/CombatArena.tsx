import {useEffect, useState} from 'react';
import type {getCombatSavingThrowPresentation} from '../../../../entities/combat/model/savingThrowPresentation';
import type {
  CombatPendingAttack,
  CombatPendingSavingThrow,
  CombatRollMode,
} from '../../../../entities/combat/model/types';
import {CombatActionTray} from './CombatActionTray';
import {CombatDefeatFallbackDialog} from './CombatDefeatFallbackDialog';
import {CombatJournalDialog} from './CombatJournalDialog';
import {CombatRollPanel} from './CombatRollPanel';
import {CombatTargetList} from './CombatTargetList';
import {CombatVictoryDialog} from './CombatVictoryDialog';
import {InitiativeRail} from './InitiativeRail';
import type {
  CombatActionView,
  CombatArmorFeedback,
  CombatOptionalReroll,
  CombatHelpingReaction,
  CombatantView,
  CombatTargetView,
} from './combatTypes';
import styles from './CombatArena.module.css';

interface CombatArenaProps {
  savingThrowPresentation?: ReturnType<typeof getCombatSavingThrowPresentation>;
  actions: CombatActionView[];
  active: CombatantView;
  armorFeedback?: CombatArmorFeedback;
  automaticAttackLabel?: string;
  attackRollMode: CombatRollMode;
  attackEnhancements: string[];
  customEnemyTurn: boolean;
  diceError: boolean;
  diceReady: boolean;
  defeatFallback?: {
    onConfirm: () => void;
    summary: string;
  };
  encounterName: string;
  enemyTargets: CombatTargetView[];
  enemySavingThrow?: {
    dc: number;
    statLabel: string;
  };
  inputMax: number;
  inputMin: number;
  inputValue: string;
  isInputValid: boolean;
  isRolling: boolean;
  logs: string[];
  optionalReroll?: CombatOptionalReroll;
  helpingReaction?: CombatHelpingReaction;
  pendingReactionAction?: {
    label: string;
    onUse: () => void;
  };
  onApplyAttack: () => void;
  onApplyDamage: () => void;
  onApplyUtility: () => void;
  onContinue: () => void;
  onEquipItem: (actionId: string | null) => void;
  onInputChange: (value: string) => void;
  onRollAttack: () => void;
  onRollDamage: () => void;
  onRollUtility: () => void;
  onSelectAction: (actionId: string) => void;
  onSelectTarget: (targetId: string) => void;
  onSupportTargetChange: (targetId: string) => void;
  participants: CombatantView[];
  party: CombatTargetView[];
  pendingAttack: CombatPendingAttack | null;
  pendingSavingThrow: CombatPendingSavingThrow | null;
  round: number;
  selectedActionIds: string[];
  selectedTargetId: string;
  supportTargetId: string;
  supportTargets: CombatTargetView[];
  targets: CombatTargetView[];
  utilityAction?: CombatActionView;
  victory: boolean;
  victorySummary: string;
  victoryWordmark?: string;
}

export function CombatArena({
  savingThrowPresentation,
  actions,
  active,
  armorFeedback,
  automaticAttackLabel,
  attackRollMode,
  attackEnhancements,
  customEnemyTurn,
  diceError,
  diceReady,
  defeatFallback,
  encounterName,
  enemyTargets,
  enemySavingThrow,
  inputMax,
  inputMin,
  inputValue,
  isInputValid,
  isRolling,
  logs,
  optionalReroll,
  helpingReaction,
  pendingReactionAction,
  onApplyAttack,
  onApplyDamage,
  onApplyUtility,
  onContinue,
  onEquipItem,
  onInputChange,
  onRollAttack,
  onRollDamage,
  onRollUtility,
  onSelectAction,
  onSelectTarget,
  onSupportTargetChange,
  participants,
  party,
  pendingAttack,
  pendingSavingThrow,
  round,
  selectedActionIds,
  selectedTargetId,
  supportTargetId,
  supportTargets,
  targets,
  utilityAction,
  victory,
  victorySummary,
  victoryWordmark,
}: CombatArenaProps) {
  const [previewActionId, setPreviewActionId] = useState<string | null>(null);
  const customEnemyTurnActive = customEnemyTurn
    && active.faction === 'enemy'
    && !pendingAttack
    && !pendingSavingThrow;
  const selectedTarget = targets.find((target) => target.id === selectedTargetId);
  const selectedActions = actions.filter((action) => selectedActionIds.includes(action.id));
  const previewAction = actions.find((action) => action.id === previewActionId);
  const selectedAction = previewAction ?? selectedActions[selectedActions.length - 1];
  const targetSide = previewAction
    ? null
    : utilityAction
      ? active.faction === 'enemy'
        ? utilityAction.target === 'self' ? 'enemies' : 'party'
        : utilityAction.target === 'ally' || utilityAction.target === 'self' || utilityAction.target === 'all-allies'
        ? 'party'
        : 'enemies'
      : selectedTarget
        ? selectedTarget.faction === 'hero' ? 'party' : 'enemies'
        : active.faction === 'enemy' ? 'party' : 'enemies';
  const selectionLocked = Boolean(pendingAttack || pendingSavingThrow || optionalReroll)
    || customEnemyTurnActive
    || Boolean(previewAction);
  const partyLocked = selectionLocked
    || targetSide !== 'party'
    || utilityAction?.target === 'self'
    || utilityAction?.target === 'all-allies'
    || (active.faction === 'enemy' && utilityAction?.target === 'all-enemies');
  const enemiesLocked = selectionLocked
    || targetSide !== 'enemies'
    || utilityAction?.target === 'all-enemies';
  const partySelectedId = targetSide !== 'party' ? ''
    : utilityAction?.target === 'self' ? active.id
      : utilityAction?.target === 'all-allies' || (active.faction === 'enemy' && utilityAction?.target === 'all-enemies') ? ''
        : utilityAction?.target === 'ally' ? supportTargetId
          : party.some((target) => target.id === selectedTargetId) ? selectedTargetId : '';
  const enemySelectedId = targetSide === 'enemies'
    && utilityAction?.target !== 'all-enemies'
    && enemyTargets.some((target) => target.id === selectedTargetId)
    ? selectedTargetId
    : '';
  useEffect(() => {
    setPreviewActionId(null);
  }, [active.id]);

  return (
    <div className={styles.overlay} role="region" aria-label={`Бой: ${encounterName}`}>
      {!victory ? (
        <>
          <header className={styles.header}>
            <div className={styles.title}>
              <span>Раунд {round}</span>
              <h1>{encounterName}</h1>
            </div>
            <InitiativeRail activeId={active.id} participants={participants} />
          </header>

          <aside className={styles.leftColumn} aria-label="Противники">
            <CombatTargetList
              armorFeedback={armorFeedback}
              heading="Противники"
              locked={enemiesLocked}
              onSelect={onSelectTarget}
              selectedId={enemySelectedId}
              side="left"
              targets={enemyTargets}
            />
          </aside>

          <aside className={styles.rightColumn} aria-label="Союзники и журнал боя">
            <CombatTargetList
              allowDowned={supportTargets.some((target) => target.hp <= 0)}
              armorFeedback={armorFeedback}
              heading="Союзники"
              locked={partyLocked}
              onSelect={utilityAction?.target === 'ally' ? onSupportTargetChange : onSelectTarget}
              selectedId={partySelectedId}
              selectableIds={utilityAction?.target === 'ally'
                ? supportTargets.map((target) => target.id)
                : undefined}
              side="right"
              targets={party}
            />
            <CombatJournalDialog combatants={participants} logs={logs} />
          </aside>
        </>
      ) : null}

      {!victory && !customEnemyTurnActive ? (
        <section className={styles.dock} aria-label="Управление боем">
          <div className={styles.dockMain}>
            <CombatRollPanel
              savingThrowPresentation={savingThrowPresentation}
              active={active}
              automaticAttackLabel={automaticAttackLabel}
              attackRollMode={attackRollMode}
              attackEnhancements={attackEnhancements}
              diceError={diceError}
              diceReady={diceReady}
              inputMax={inputMax}
              inputMin={inputMin}
              inputValue={inputValue}
              isInputValid={isInputValid}
              isRolling={isRolling}
              onApplyAttack={onApplyAttack}
              onApplyDamage={onApplyDamage}
              onApplyUtility={onApplyUtility}
              onInputChange={onInputChange}
              onRollAttack={onRollAttack}
              onRollDamage={onRollDamage}
              onRollUtility={onRollUtility}
              pendingAttack={pendingAttack}
              pendingSavingThrow={pendingSavingThrow}
              optionalReroll={optionalReroll}
              helpingReaction={helpingReaction}
              previewOnly={Boolean(previewAction)}
              selectedAction={selectedAction}
              selectedTarget={selectedTarget}
              savingThrow={enemySavingThrow}
              supportTargetId={supportTargetId}
              supportTargets={supportTargets}
              utilityAction={utilityAction}
            />
            {pendingAttack && pendingReactionAction ? (
              <button
                className={styles.reactionAction}
                type="button"
                onClick={pendingReactionAction.onUse}
              >
                {pendingReactionAction.label}
              </button>
            ) : null}
            {actions.length > 0 && !pendingAttack && !pendingSavingThrow && !optionalReroll ? (
              <CombatActionTray
                actions={actions}
                activeId={active.id}
                onClearPreview={() => setPreviewActionId(null)}
                onBasicAttack={() => {
                  setPreviewActionId(null);
                  const action = selectedActions.find((candidate) => candidate.activation !== 'passive');
                  if (action) onSelectAction(action.id);
                }}
                onEquipItem={(actionId) => {
                  setPreviewActionId(null);
                  onEquipItem(actionId);
                }}
                onSelectAction={(actionId) => {
                  const action = actions.find((candidate) => candidate.id === actionId);
                  if (action?.activation === 'passive' || action?.disabled) {
                    setPreviewActionId((current) => current === actionId ? null : actionId);
                    return;
                  }
                  setPreviewActionId(null);
                  onSelectAction(actionId);
                }}
                previewActionId={previewActionId}
                selectedActionIds={selectedActionIds}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {victory ? (
        <CombatVictoryDialog
          encounterName={encounterName}
          onConfirm={onContinue}
          round={round}
          summary={victorySummary}
          wordmark={victoryWordmark}
        />
      ) : null}
      {!victory && defeatFallback ? (
        <CombatDefeatFallbackDialog
          onConfirm={defeatFallback.onConfirm}
          summary={defeatFallback.summary}
        />
      ) : null}
    </div>
  );
}
