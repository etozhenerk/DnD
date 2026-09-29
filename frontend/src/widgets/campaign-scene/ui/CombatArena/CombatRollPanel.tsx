import {useEffect, useRef} from 'react';
import type {
  CombatPendingAttack,
  CombatPendingSavingThrow,
  CombatRollMode,
} from '../../../../entities/combat/model/types';
import {getPendingDamageRoll} from '../../../../entities/combat/model/combatRules';
import {getCombatSavingThrowPresentation} from '../../../../entities/combat/model/savingThrowPresentation';
import {triggerCriticalRollEffect} from '../../../../shared/lib/dice/criticalRollEffect';
import {
  formatDiceExpression,
  formatDicePoolExpression,
  parseDiceExpression,
} from '../../../../shared/lib/dice/diceExpression';
import {CombatMechanicsHelp} from './CombatMechanicsHelp';
import {CombatantCard} from './CombatantCard';
import {ArtworkFocus} from '../../../../shared/ui/ArtworkFocus/ArtworkFocus';
import type {
  CombatActionView,
  CombatantView,
  CombatOptionalReroll,
  CombatHelpingReaction,
  CombatTargetView,
} from './combatTypes';
import styles from './CombatRollPanel.module.css';

interface CombatRollPanelProps {
  savingThrowPresentation?: ReturnType<typeof getCombatSavingThrowPresentation>;
  active: CombatantView;
  automaticAttackLabel?: string;
  attackRollMode: CombatRollMode;
  attackEnhancements: string[];
  diceError: boolean;
  diceReady: boolean;
  inputMax: number;
  inputMin: number;
  inputValue: string;
  isInputValid: boolean;
  isRolling: boolean;
  onApplyAttack: () => void;
  onApplyDamage: () => void;
  onApplyUtility: () => void;
  onInputChange: (value: string) => void;
  onRollAttack: () => void;
  onRollDamage: () => void;
  onRollUtility: () => void;
  optionalReroll?: CombatOptionalReroll;
  helpingReaction?: CombatHelpingReaction;
  pendingAttack: CombatPendingAttack | null;
  pendingSavingThrow: CombatPendingSavingThrow | null;
  previewOnly?: boolean;
  selectedAction?: CombatActionView;
  selectedTarget: CombatTargetView | undefined;
  savingThrow?: {
    dc: number;
    statLabel: string;
  };
  supportTargetId: string;
  supportTargets: CombatTargetView[];
  utilityAction?: CombatActionView;
}

function modifierLabel(value: number) {
  if (value === 0) return '';
  return `${value > 0 ? '+' : '−'} ${Math.abs(value)}`;
}

function actionEffectSummary(action: CombatActionView) {
  return (
    <div className={styles.effectSummary}>
      <b>{action.effectLabel}</b>
      {action.effectRows?.length ? (
        <dl className={styles.effectRows}>
          {action.effectRows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.description}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

export function CombatRollPanel({
  savingThrowPresentation,
  active,
  automaticAttackLabel,
  attackRollMode,
  attackEnhancements,
  diceError,
  diceReady,
  inputMax,
  inputMin,
  inputValue,
  isInputValid,
  isRolling,
  onApplyAttack,
  onApplyDamage,
  onApplyUtility,
  onInputChange,
  onRollAttack,
  onRollDamage,
  onRollUtility,
  optionalReroll,
  helpingReaction,
  pendingAttack,
  pendingSavingThrow,
  previewOnly = false,
  selectedAction,
  selectedTarget,
  savingThrow,
  supportTargetId,
  supportTargets,
  utilityAction,
}: CombatRollPanelProps) {
  const manualInputEditedRef = useRef(false);
  const savePresentation = savingThrowPresentation ?? (pendingSavingThrow ? getCombatSavingThrowPresentation(pendingSavingThrow) : undefined);
  const pendingDamageRoll = pendingAttack ? getPendingDamageRoll(pendingAttack) : null;
  const pendingSavingDice = pendingSavingThrow?.rollExpression
    ? parseDiceExpression(pendingSavingThrow.rollExpression)
    : null;
  const damageModifier = pendingDamageRoll?.modifier ?? 0;
  const rawDamageDice = pendingDamageRoll
    ? formatDicePoolExpression(pendingDamageRoll.dice)
    : undefined;
  const baseDamageFormula = `${rawDamageDice}${modifierLabel(damageModifier) ? ` ${modifierLabel(damageModifier)}` : ''}`;
  const utilityDice = utilityAction?.rollExpression
    ? parseDiceExpression(utilityAction.rollExpression)
    : null;
  const rawUtilityDice = utilityDice
    ? formatDiceExpression(utilityDice, false)
    : utilityAction?.rollExpression;
  const passivePreview = selectedAction?.activation === 'passive';
  const actionPreview = previewOnly && Boolean(selectedAction) && !passivePreview;
  const mode = pendingAttack
    ? 'damage'
    : pendingSavingThrow ? 'effect-save'
      : passivePreview ? 'passive'
        : actionPreview ? 'preview'
          : utilityAction ? 'utility'
        : savingThrow ? 'save' : 'attack';
  const describedAction = passivePreview || actionPreview
    ? selectedAction
    : mode === 'utility' ? utilityAction
      : mode === 'attack' ? selectedAction : undefined;
  const noRollAttack = mode === 'attack' && Boolean(automaticAttackLabel);
  const noRollUtility = mode === 'utility' && !utilityAction?.requiresRoll;
  const attackModeLabel = attackRollMode === 'disadvantage'
    ? ' · помеха'
    : attackRollMode === 'advantage' ? ' · преимущество' : '';
  const formula = noRollAttack ? 'Без d20' : optionalReroll
    ? optionalReroll.rerolling ? 'Переброс: 1d20' : `Первый d20: ${optionalReroll.firstRoll}`
    : pendingAttack
    ? pendingDamageRoll?.multiplier === 2 ? `(${baseDamageFormula}) × 2` : baseDamageFormula
    : pendingSavingThrow
      ? savePresentation!.formula
      : passivePreview
        ? 'Пассивно'
        : actionPreview
          ? selectedAction?.disabledReason ?? 'Описание'
          : utilityAction?.requiresRoll && utilityAction.rollExpression
        ? utilityAction.rollExpression
        : noRollUtility ? 'Без броска'
          : savingThrow
            ? `1d20 + ${savingThrow.statLabel} цели против DC ${savingThrow.dc}`
            : `${attackRollMode === 'normal' ? '1d20' : '2d20'} ${modifierLabel(active.attackBonus)} против AC ${selectedTarget?.ac ?? '—'}${attackModeLabel}`;
  const rollLabel = optionalReroll
    ? '1d20'
    : pendingAttack
    ? rawDamageDice
    : pendingSavingThrow?.rollExpression
      ? pendingSavingThrow.rollExpression
    : utilityAction?.requiresRoll ? rawUtilityDice ?? 'd20' : 'd20';
  const digitalRollLabel = mode === 'attack' && attackRollMode !== 'normal' ? '2d20' : rollLabel;
  const pendingSavingThrowIsD20 = !pendingSavingDice
    || (pendingSavingDice.count === 1 && pendingSavingDice.sides === 20 && pendingSavingDice.modifier === 0);
  const manualRollLabel = mode === 'attack' && attackRollMode === 'advantage'
    ? 'Вручную · больший'
    : mode === 'attack' && attackRollMode === 'disadvantage'
      ? 'Вручную · меньший'
      : mode === 'attack' || mode === 'save' || (mode === 'effect-save' && pendingSavingThrowIsD20)
        ? 'Вручную'
        : 'Без мод.';
  const supportTarget = supportTargets.find((target) => target.id === supportTargetId);
  const targetReady = utilityAction?.target === 'ally'
    ? Boolean(supportTargetId)
    : utilityAction?.target === 'enemy' ? Boolean(selectedTarget) : true;
  const utilityDisabled = mode === 'utility' && Boolean(utilityAction?.disabled);
  const applyDisabled = isRolling || utilityDisabled
    || (!noRollUtility && !noRollAttack && !isInputValid)
    || ((mode === 'attack' || mode === 'save' || mode === 'effect-save') && !selectedTarget)
    || (mode === 'utility' && !targetReady);
  const activeRollOwner = active.faction === 'enemy' ? `Мастер за ${active.name}` : active.name;
  const targetRollOwner = selectedTarget
    ? selectedTarget.faction === 'enemy' ? `Мастер за ${selectedTarget.name}` : selectedTarget.name
    : undefined;
  const rollOwner = passivePreview || actionPreview || noRollUtility || noRollAttack
    ? undefined
    : mode === 'effect-save'
      ? pendingSavingThrow?.kind === 'enemy-attack-reroll' ? savePresentation?.rollOwner : targetRollOwner ?? pendingSavingThrow?.targetName
      : mode === 'save'
        ? targetRollOwner
        : mode === 'utility'
          ? utilityAction?.rollOwnerLabel ?? activeRollOwner
          : mode === 'damage'
            ? active.faction === 'enemy' ? `Мастер за ${pendingAttack?.actorName ?? active.name}` : pendingAttack?.actorName ?? active.name
            : activeRollOwner;
  const manualDiceExpression = mode === 'effect-save'
    ? pendingSavingThrow?.rollExpression ?? '1d20'
    : mode === 'attack' || mode === 'save'
      ? '1d20'
    : mode === 'utility' ? rawUtilityDice : undefined;
  const parsedManualDice = manualDiceExpression ? parseDiceExpression(manualDiceExpression) : null;
  const manualRollIsNaturalD20 = parsedManualDice?.count === 1
    && parsedManualDice.sides === 20
    && parsedManualDice.modifier === 0;
  const rollArtwork = mode === 'attack' || mode === 'damage'
    ? active.attackArtwork
    : mode === 'utility' ? utilityAction?.artwork
      : mode === 'preview' || mode === 'passive' ? selectedAction?.artwork : undefined;

  useEffect(() => {
    if (isRolling || inputValue === '') manualInputEditedRef.current = false;
  }, [inputValue, isRolling]);

  const applyManualRoll = (apply: () => void) => {
    const numericResult = Number(inputValue);
    if (
      !noRollAttack && manualInputEditedRef.current
      && manualRollIsNaturalD20
      && (numericResult === 1 || numericResult === 20)
    ) {
      triggerCriticalRollEffect(numericResult);
    }
    manualInputEditedRef.current = false;
    apply();
  };

  return (
    <section className={styles.panel} aria-labelledby="combat-roll-title" data-mode={mode}>
      <div className={styles.turnSummary}>
        <CombatantCard combatant={active} compact />
      </div>

      <div className={styles.step}>
        <div className={styles.stepHeading}>
          <div className={styles.titleGroup}>
            {rollArtwork ? <span className={styles.actionArtwork}><ArtworkFocus artwork={rollArtwork} /></span> : null}
            <h2 id="combat-roll-title">
              {optionalReroll
                ? optionalReroll.rerolling ? 'Переброс d20' : 'История моего имени'
                : mode === 'damage'
                ? 'Бросок урона'
                : mode === 'passive' || mode === 'preview'
                  ? selectedAction?.name
                  : mode === 'utility'
                    ? utilityAction?.name
                  : mode === 'effect-save'
                    ? savePresentation?.title
                    : mode === 'save'
                      ? `Спасбросок: ${savingThrow?.statLabel}`
                      : selectedAction?.name ?? 'Бросок атаки'}
            </h2>
            {describedAction ? (
              <CombatMechanicsHelp
                actionName={describedAction.name}
                help={describedAction.mechanicsHelp}
              />
            ) : null}
          </div>
          <strong className={styles.formula}>{formula}</strong>
        </div>

        {describedAction?.cost ? (
          <div className={styles.actionCost} role="note" aria-label="Цена применения">
            <strong>{describedAction.cost.turnLabel}</strong>
            <span>{describedAction.cost.limitLabel} · осталось {describedAction.cost.badgeLabel}</span>
            <small>{describedAction.cost.hint}</small>
          </div>
        ) : null}
        {pendingAttack ? (
          <p className={styles.attackResult} role="status" aria-live="polite">
            <b>{pendingAttack.automatic
              ? pendingAttack.critical ? 'Гарантированный крит · урон ×2' : 'Атака отражена'
              : pendingAttack.critical ? 'Крит · урон ×2' : 'Броня пробита'}</b>
            <strong className={styles.damageTarget}>Цель: {pendingAttack.targetName}</strong>
            <span>
              {pendingAttack.automatic ? 'Без броска на попадание'
                : `${pendingAttack.natural} ${modifierLabel(pendingAttack.bonus)} = ${pendingAttack.total} против AC ${pendingAttack.targetAc}`}
              {pendingAttack.bonusDamageDice?.length
                ? ` · Доп. кубики: ${pendingAttack.bonusDamageDice.map((bonus) => `${bonus.expression} «${bonus.label}»`).join(', ')}`
                : ''}
            </span>
          </p>
        ) : pendingSavingThrow ? (
          <div className={styles.utilityContext}>
            <p>{savePresentation?.description}</p>
            <b>{savePresentation?.outcome}</b>
            <span className={styles.selfTarget}>Источник: {savePresentation?.source}</span>
          </div>
        ) : passivePreview && selectedAction ? (
          <div className={styles.utilityContext}>
            <p title={selectedAction.description}>{selectedAction.description}</p>
            {actionEffectSummary(selectedAction)}
            <span className={styles.selfTarget}>Пассивное умение · отдельный ход не нужен</span>
          </div>
        ) : actionPreview && selectedAction ? (
          <div className={styles.utilityContext}>
            <p title={selectedAction.description}>{selectedAction.description}</p>
            {actionEffectSummary(selectedAction)}
            <span className={styles.selfTarget}>Сейчас нельзя применить: {selectedAction.disabledReason ?? 'условия не выполнены'}</span>
          </div>
        ) : utilityAction ? (
          <div className={styles.utilityContext}>
            <p title={utilityAction.description}>{utilityAction.description}</p>
            {actionEffectSummary(utilityAction)}
            <span className={styles.selfTarget}>
              Цель: {utilityAction.target === 'ally'
                ? supportTarget ? `${supportTarget.name} · ${supportTarget.hp}/${supportTarget.maxHp} HP` : 'выберите союзника справа'
                : utilityAction.target === 'all-allies' ? 'вся команда'
                  : utilityAction.target === 'enemy' ? selectedTarget?.name ?? 'выберите противника'
                    : utilityAction.target === 'all-enemies' ? active.faction === 'enemy' ? 'все герои в сознании' : 'все противники'
                      : active.name}
            </span>
          </div>
        ) : optionalReroll ? (
          <div className={styles.utilityContext}>
            <p>{optionalReroll.rerolling
              ? `Первый результат ${optionalReroll.firstRoll}. Выполните новый d20 — именно новый результат будет применён.`
              : `Первый результат ${optionalReroll.firstRoll}. Его можно оставить без расхода вдохновения или заменить новым d20.`}</p>
            <b>{optionalReroll.rerolling ? 'Переброс расходует вдохновение.' : 'Решение принимается после первого результата.'}</b>
            <span className={styles.selfTarget}>Источник: История моего имени</span>
          </div>
        ) : selectedAction ? (
          <div className={styles.utilityContext}>
            <p title={selectedAction.description}>{selectedAction.description}</p>
            {actionEffectSummary(selectedAction)}
            <span className={styles.selfTarget}>Цель: {selectedTarget?.name ?? 'выберите противника'}</span>
          </div>
        ) : (
          <div className={styles.enhancements} aria-label="Усиления атаки">
            <span>Усиления</span>
            {attackEnhancements.length > 0
              ? attackEnhancements.map((enhancement) => <b key={enhancement}>{enhancement}</b>)
              : <em>Без усилений</em>}
          </div>
        )}
        {rollOwner ? (
          <p className={styles.rollOwner}>
            <span>Кубик бросает</span>
            <strong>{rollOwner}</strong>
          </p>
        ) : null}
        {mode === 'attack' && attackRollMode !== 'normal' && !noRollAttack ? (
          <p className={styles.rollOwner}>Бросьте два d20 и {attackRollMode === 'advantage' ? 'выберите больший' : 'выберите меньший'}. Бонус атаки прибавится один раз.</p>
        ) : null}
        {!passivePreview && !actionPreview ? <div className={styles.rollControls} data-automatic={noRollAttack || undefined}>
          {noRollAttack ? (
            <button className={styles.applyRoll} type="button" disabled={applyDisabled} onClick={onApplyAttack}>{automaticAttackLabel}</button>
          ) : optionalReroll && !optionalReroll.rerolling ? (
            <>
              <button
                className={styles.digitalRoll}
                type="button"
                onClick={optionalReroll.onKeep}
              >
                Оставить {optionalReroll.firstRoll}
              </button>
              <label className={styles.manualInput}>
                <span>Первый результат</span>
                <input aria-label="Первый результат d20" type="number" value={optionalReroll.firstRoll} disabled readOnly />
              </label>
              <button
                className={styles.applyRoll}
                type="button"
                onClick={optionalReroll.onRequestReroll}
              >
                Перебросить d20
              </button>
            </>
          ) : (
          <>
          <button
            className={styles.digitalRoll}
            type="button"
            disabled={noRollUtility || isRolling || !diceReady || utilityDisabled
              || ((mode === 'attack' || mode === 'save' || mode === 'effect-save') && !selectedTarget)
              || (mode === 'utility' && !targetReady)}
            onClick={mode === 'damage' ? onRollDamage : mode === 'utility' ? onRollUtility : onRollAttack}
          >
            {noRollUtility ? 'Бросок не нужен' : isRolling ? 'Бросок…' : diceReady ? `Бросить ${digitalRollLabel}` : 'Готовим…'}
          </button>
          <label className={styles.manualInput}>
            <span>{manualRollLabel}</span>
            <input
              aria-label={mode === 'attack' || mode === 'save' || (mode === 'effect-save' && pendingSavingThrowIsD20)
                ? 'Результат физического d20'
                : `Сумма кубиков ${rollLabel} без модификатора`}
              type="number"
              min={inputMin}
              max={inputMax}
              placeholder={rollLabel}
              value={inputValue}
              disabled={isRolling || noRollUtility}
              onChange={(event) => {
                manualInputEditedRef.current = true;
                onInputChange(event.target.value);
              }}
            />
          </label>
          <button
            className={styles.applyRoll}
            type="button"
            disabled={applyDisabled}
            onClick={() => applyManualRoll(
              mode === 'damage' ? onApplyDamage : mode === 'utility' ? onApplyUtility : onApplyAttack,
            )}
          >
            {helpingReaction ? 'Без помощи Торина' : mode === 'damage'
              ? 'Нанести урон'
              : mode === 'utility' ? noRollUtility ? 'Применить' : 'Сделать ход'
                : mode === 'effect-save' && pendingSavingThrow?.kind === 'area-damage-status'
                  ? 'Применить урон'
                  : pendingSavingThrow?.kind === 'action-healing' ? 'Восстановить HP'
                    : pendingSavingThrow?.kind === 'enemy-attack-reroll' ? 'Завершить атаку'
                  : mode === 'save' || mode === 'effect-save' ? 'Проверить DC' : 'Пробить AC'}
          </button>
          <p className={styles.rollStatus} aria-live="polite">
            {diceError
              ? '3D-кубики недоступны — введите результат вручную.'
              : isRolling ? 'Бросок выполняется.'
                : isInputValid ? `Результат ${inputValue} готов.` : ''}
          </p>
          </>
          )}
        </div> : null}
        {helpingReaction && !passivePreview && !actionPreview ? (
          <div className={styles.helpingReaction} role="group" aria-label="Палочка-выручалочка Торина">
            <p>{helpingReaction.description} <strong>Одно использование за бой.</strong></p>
            <button className={styles.applyRoll} type="button" disabled={isRolling} onClick={() => applyManualRoll(helpingReaction.onUse)}>
              Помочь Торином: +2
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
