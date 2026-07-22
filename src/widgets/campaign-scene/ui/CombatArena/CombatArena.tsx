import {useEffect, useState} from 'react';
import type {CombatPendingAttack} from '../../../../entities/combat/model/types';
import {CombatActionTray} from './CombatActionTray';
import {CombatPartyBar} from './CombatPartyBar';
import {CombatRollPanel} from './CombatRollPanel';
import {CombatTargetList} from './CombatTargetList';
import {CombatVictoryDialog} from './CombatVictoryDialog';
import {InitiativeRail} from './InitiativeRail';
import type {CombatActionView, CombatantView, CombatTargetView} from './combatTypes';
import styles from './CombatArena.module.css';

interface CombatArenaProps {
  actions: CombatActionView[];
  active: CombatantView;
  attackEnhancements: string[];
  diceError: boolean;
  diceReady: boolean;
  encounterName: string;
  equippedItemId: string;
  inputMax: number;
  inputMin: number;
  inputValue: string;
  isInputValid: boolean;
  isRolling: boolean;
  logs: string[];
  onApplyAttack: () => void;
  onApplyDamage: () => void;
  onApplyUtility: () => void;
  onContinue: () => void;
  onEquipItem: (actionId: string | null) => void;
  onInputChange: (value: string) => void;
  onReset: () => void;
  onRollAttack: () => void;
  onRollDamage: () => void;
  onRollUtility: () => void;
  onSelectAction: (actionId: string) => void;
  onSelectTarget: (targetId: string) => void;
  onSupportTargetChange: (targetId: string) => void;
  onUndo: () => void;
  participants: CombatantView[];
  party: CombatTargetView[];
  pendingAttack: CombatPendingAttack | null;
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
  actions,
  active,
  attackEnhancements,
  diceError,
  diceReady,
  encounterName,
  equippedItemId,
  inputMax,
  inputMin,
  inputValue,
  isInputValid,
  isRolling,
  logs,
  onApplyAttack,
  onApplyDamage,
  onApplyUtility,
  onContinue,
  onEquipItem,
  onInputChange,
  onReset,
  onRollAttack,
  onRollDamage,
  onRollUtility,
  onSelectAction,
  onSelectTarget,
  onSupportTargetChange,
  onUndo,
  participants,
  party,
  pendingAttack,
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
  const selectedTarget = targets.find((target) => target.id === selectedTargetId);
  const utilityTargets = utilityAction?.target === 'ally'
    ? supportTargets
    : utilityAction?.target === 'self'
      ? party.filter((hero) => hero.id === active.id)
      : [];
  const visibleTargets = utilityAction ? utilityTargets : targets;
  const visibleTargetId = utilityAction?.target === 'self' ? active.id
    : utilityAction ? supportTargetId
      : selectedTargetId;
  const [masterOpen, setMasterOpen] = useState(false);

  useEffect(() => {
    if (!masterOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMasterOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [masterOpen]);

  return (
    <div className={styles.overlay} role="region" aria-label={`Бой: ${encounterName}`}>
      <header className={styles.header}>
        <div className={styles.title}>
          <span>Раунд {round}</span>
          <h1>{encounterName}</h1>
        </div>
        <InitiativeRail activeId={active.id} participants={participants} />
      </header>

      <div className={styles.masterControl}>
        <button
          type="button"
          aria-expanded={masterOpen}
          aria-controls="combat-master-menu"
          onClick={() => setMasterOpen((open) => !open)}
        >
          Мастер
        </button>
        {masterOpen ? (
          <div className={styles.masterMenu} id="combat-master-menu" role="group" aria-label="Управление мастера">
            <button type="button" onClick={() => { onUndo(); setMasterOpen(false); }}>Отменить последний шаг</button>
            <button type="button" onClick={() => { onReset(); setMasterOpen(false); }}>Начать бой заново</button>
          </div>
        ) : null}
      </div>

      <aside className={styles.leftColumn} aria-label={utilityAction ? 'Союзники для действия' : 'Цели действия'}>
        <CombatTargetList
          allowDowned={Boolean(utilityAction)}
          locked={Boolean(pendingAttack) || utilityAction?.target === 'self'}
          onSelect={utilityAction ? onSupportTargetChange : onSelectTarget}
          selectedId={visibleTargetId}
          targets={visibleTargets}
        />
      </aside>

      <CombatPartyBar combatants={participants} heroes={party} logs={logs} />

      <section className={styles.dock} aria-label="Управление боем">
        {!victory ? (
          <div className={styles.dockMain}>
            <CombatRollPanel
              active={active}
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
              selectedTarget={selectedTarget}
              supportTargetId={supportTargetId}
              supportTargets={supportTargets}
              utilityAction={utilityAction}
            />
            {active.faction === 'hero' && !pendingAttack ? (
              <CombatActionTray
                actions={actions}
                activeId={active.id}
                activeName={active.name}
                equippedItemId={equippedItemId}
                onEquipItem={onEquipItem}
                onSelectAction={onSelectAction}
                selectedActionIds={selectedActionIds}
              />
            ) : null}
          </div>
        ) : null}
      </section>

      {victory ? (
        <CombatVictoryDialog
          encounterName={encounterName}
          onConfirm={onContinue}
          round={round}
          summary={victorySummary}
          wordmark={victoryWordmark}
        />
      ) : null}
    </div>
  );
}
