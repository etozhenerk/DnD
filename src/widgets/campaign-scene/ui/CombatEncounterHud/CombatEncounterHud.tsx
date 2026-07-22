import {useEffect, useMemo, useState} from 'react';
import {getPendingDamageRange} from '../../../../entities/combat/model/combatRules';
import type {CombatDefinition, CombatHeroSource, CombatState} from '../../../../entities/combat/model/types';
import type {CombatPortraitPresentation} from '../../../../entities/combat/model/view';
import {createCombatArenaView} from '../../../../features/run-combat/model/createCombatArenaView';
import {formatDiceExpression, getDamageRoll, getRawDiceRange} from '../../../../shared/lib/dice/diceExpression';
import {CombatArena} from '../CombatArena/CombatArena';

interface CombatEncounterHudProps {
  combat: CombatState;
  definition: CombatDefinition;
  diceError: boolean;
  diceReady: boolean;
  fallbackEnemyToken: string;
  heroes: CombatHeroSource[];
  heroHp: Record<string, number>;
  heroPortraits?: Record<string, CombatPortraitPresentation>;
  heroTokens: Record<string, string>;
  inputValue: string;
  isRolling: boolean;
  onApplyDamage: (rawDiceTotal: number) => void;
  onContinue: () => void;
  onEnemyAttack: (targetId: string, roll: number) => void;
  onEquipItem: (actionId: string | null) => void;
  onHeroAttack: (heroId: string, targetId: string, roll: number) => void;
  onInputChange: (value: string) => void;
  onReset: () => void;
  onResetDie: () => void;
  onRoll: (expression: string, label: string) => void;
  onSelectAction: (actionId: string) => void;
  onUndo: () => void;
  onUseAction: (actionId: string, targetId: string, roll: number) => void;
  victoryWordmark?: string;
}

export function CombatEncounterHud({
  combat,
  definition,
  diceError,
  diceReady,
  fallbackEnemyToken,
  heroes,
  heroHp,
  heroPortraits,
  heroTokens,
  inputValue,
  isRolling,
  onApplyDamage,
  onContinue,
  onEnemyAttack,
  onEquipItem,
  onHeroAttack,
  onInputChange,
  onReset,
  onResetDie,
  onRoll,
  onSelectAction,
  onUndo,
  onUseAction,
  victoryWordmark,
}: CombatEncounterHudProps) {
  const [heroTargetId, setHeroTargetId] = useState(heroes[0]?.id ?? '');
  const [enemyTargetId, setEnemyTargetId] = useState('');
  const activeCombatantId = combat.initiativeOrder[combat.turnIndex];
  const activeEnemy = combat.enemies[activeCombatantId];
  const encounter = definition.encounters.find((item) => item.id === combat.encounterId);

  useEffect(() => {
    if (!activeEnemy) return;
    const suggestedTarget = [...heroes]
      .filter((hero) => (heroHp[hero.id] ?? 0) > 0)
      .sort((a, b) => (heroHp[a.id] ?? 0) - (heroHp[b.id] ?? 0) || a.id.localeCompare(b.id))[0];
    if (suggestedTarget) setHeroTargetId(suggestedTarget.id);
  }, [activeEnemy, heroHp, heroes]);

  useEffect(() => {
    const firstLivingEnemy = Object.values(combat.enemies).find((enemy) => enemy.hp > 0);
    if (firstLivingEnemy && (combat.enemies[enemyTargetId]?.hp ?? 0) <= 0) {
      setEnemyTargetId(firstLivingEnemy.id);
    }
  }, [combat.enemies, enemyTargetId]);

  useEffect(() => {
    onResetDie();
  }, [activeCombatantId]);

  const view = useMemo(() => encounter ? createCombatArenaView({
    actions: definition.combatActions,
    combat,
    encounter,
    fallbackEnemyToken,
    heroes,
    heroHp,
    heroPortraits,
    heroTokens,
    requestedEnemyTargetId: enemyTargetId,
    requestedHeroTargetId: heroTargetId,
  }) : null, [
    combat,
    definition.combatActions,
    encounter,
    enemyTargetId,
    fallbackEnemyToken,
    heroHp,
    heroPortraits,
    heroes,
    heroTargetId,
    heroTokens,
  ]);
  if (!view) return null;

  const pendingRange = combat.pendingAttack ? getPendingDamageRange(combat.pendingAttack) : null;
  const utilityDice = view.utilityAction?.rollExpression ? getDamageRoll(view.utilityAction.rollExpression) : null;
  const utilityRange = utilityDice ? getRawDiceRange(utilityDice) : null;
  const inputMin = pendingRange?.min ?? utilityRange?.min ?? 1;
  const inputMax = pendingRange?.max ?? utilityRange?.max ?? 20;
  const numericInput = Number(inputValue);
  const inputValid = Number.isInteger(numericInput) && numericInput >= inputMin && numericInput <= inputMax;
  const damageDice = combat.pendingAttack
    ? getDamageRoll(combat.pendingAttack.damageExpression, combat.pendingAttack.critical)
    : null;
  const rawDamageExpression = damageDice
    ? formatDiceExpression(damageDice, false)
    : view.utilityAction?.rollExpression ?? '1d20';

  const applyAttack = () => {
    if (!inputValid || !view.selectedTarget) return;
    if (view.activeHero) onHeroAttack(view.activeHero.id, view.selectedTarget.id, numericInput);
    else onEnemyAttack(view.selectedTarget.id, numericInput);
    onResetDie();
  };
  const applyDamage = () => {
    if (!inputValid || !combat.pendingAttack) return;
    onApplyDamage(numericInput);
    onResetDie();
  };
  const applyUtility = () => {
    if (!inputValid || !view.utilityAction || view.utilityAction.disabled) return;
    onUseAction(view.utilityAction.id, view.selectedHeroTargetId, numericInput);
    onResetDie();
  };

  return (
    <CombatArena
      actions={view.actions}
      active={view.active}
      attackEnhancements={view.attackEnhancements}
      diceError={diceError}
      diceReady={diceReady}
      encounterName={view.encounter.name}
      equippedItemId={view.equippedItemId}
      inputMax={inputMax}
      inputMin={inputMin}
      inputValue={inputValue}
      isInputValid={inputValid}
      isRolling={isRolling}
      logs={combat.log}
      onApplyAttack={applyAttack}
      onApplyDamage={applyDamage}
      onApplyUtility={applyUtility}
      onContinue={onContinue}
      onEquipItem={onEquipItem}
      onInputChange={onInputChange}
      onReset={onReset}
      onRollAttack={() => onRoll('1d20', 'Бросок атаки')}
      onRollDamage={() => onRoll(rawDamageExpression, 'Бросок урона')}
      onRollUtility={() => onRoll(
        view.utilityAction?.rollExpression ?? '1d20',
        `Действие: ${view.utilityAction?.name ?? 'предмет'}`,
      )}
      onSelectAction={(actionId) => {
        onSelectAction(actionId);
        onResetDie();
      }}
      onSelectTarget={(targetId) => {
        if (view.activeHero) setEnemyTargetId(targetId);
        else setHeroTargetId(targetId);
        onInputChange('');
      }}
      onSupportTargetChange={(targetId) => {
        setHeroTargetId(targetId);
        onInputChange('');
      }}
      onUndo={() => {
        onResetDie();
        onUndo();
      }}
      participants={view.participants}
      party={view.party}
      pendingAttack={combat.pendingAttack}
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
  );
}
