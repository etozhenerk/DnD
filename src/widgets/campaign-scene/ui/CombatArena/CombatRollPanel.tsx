import type {CombatPendingAttack} from '../../../../entities/combat/model/types';
import {CombatantCard} from './CombatantCard';
import type {CombatActionView, CombatantView, CombatTargetView} from './combatTypes';
import styles from './CombatRollPanel.module.css';

interface CombatRollPanelProps {
  active: CombatantView;
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
  pendingAttack: CombatPendingAttack | null;
  selectedTarget: CombatTargetView | undefined;
  supportTargetId: string;
  supportTargets: CombatTargetView[];
  utilityAction?: CombatActionView;
}

function modifierLabel(value: number) {
  if (value === 0) return '';
  return `${value > 0 ? '+' : '−'} ${Math.abs(value)}`;
}

export function CombatRollPanel({
  active,
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
  pendingAttack,
  selectedTarget,
  supportTargetId,
  supportTargets,
  utilityAction,
}: CombatRollPanelProps) {
  const damageModifier = pendingAttack?.damageExpression.match(/([+-]\d+)$/u)?.[1] ?? '';
  const damageDice = pendingAttack?.critical
    ? pendingAttack.damageExpression.replace(/^(\d+)/u, (count) => String(Number(count) * 2))
    : pendingAttack?.damageExpression;
  const rawDamageDice = damageDice?.replace(/[+-]\d+$/u, '');
  const mode = pendingAttack ? 'damage' : utilityAction ? 'utility' : 'attack';
  const formula = pendingAttack
    ? `${rawDamageDice}${damageModifier ? ` ${damageModifier.replace('+', '+ ').replace('-', '− ')}` : ''}`
    : utilityAction?.rollExpression
      ? utilityAction.rollExpression
      : `1d20 ${modifierLabel(active.attackBonus)} против AC ${selectedTarget?.ac ?? '—'}`;
  const rollLabel = pendingAttack ? rawDamageDice : utilityAction?.rollExpression ?? 'd20';
  const supportTarget = supportTargets.find((target) => target.id === supportTargetId);
  const targetReady = utilityAction?.target !== 'ally' || Boolean(supportTargetId);
  const utilityDisabled = mode === 'utility' && Boolean(utilityAction?.disabled);
  const applyDisabled = !isInputValid || isRolling || utilityDisabled
    || (mode === 'attack' && !selectedTarget) || (mode === 'utility' && !targetReady);

  return (
    <section className={styles.panel} aria-labelledby="combat-roll-title" data-mode={mode}>
      <div className={styles.turnSummary}>
        <CombatantCard combatant={active} compact />
      </div>

      <div className={styles.step}>
        <div className={styles.stepHeading}>
          <span>{mode === 'damage' ? 'Шаг 2' : mode === 'attack' ? 'Шаг 1' : 'Предмет'}</span>
          <h2 id="combat-roll-title">
            {mode === 'damage' ? 'Бросок урона' : mode === 'utility' ? utilityAction?.name : 'Бросок атаки'}
          </h2>
          <strong className={styles.formula}>{formula}</strong>
        </div>

        {pendingAttack ? (
          <p className={styles.attackResult} role="status" aria-live="polite">
            <b>{pendingAttack.critical ? 'Крит: броня пробита' : 'Броня пробита'}</b>
            <strong className={styles.damageTarget}>Цель: {pendingAttack.targetName}</strong>
            <span>
              {pendingAttack.natural} {modifierLabel(pendingAttack.bonus)} = {pendingAttack.total}
              {' '}против AC {pendingAttack.targetAc}
            </span>
          </p>
        ) : utilityAction ? (
          <div className={styles.utilityContext}>
            <p title={utilityAction.description}>{utilityAction.description}</p>
            <b>{utilityAction.effectLabel}</b>
            <span className={styles.selfTarget}>
              Цель: {utilityAction.target === 'ally'
                ? supportTarget ? `${supportTarget.name} · ${supportTarget.hp}/${supportTarget.maxHp} HP` : 'выберите союзника слева'
                : active.name}
            </span>
          </div>
        ) : (
          <div className={styles.enhancements} aria-label="Усиления атаки">
            <span>Усиления</span>
            {attackEnhancements.length > 0
              ? attackEnhancements.map((enhancement) => <b key={enhancement}>{enhancement}</b>)
              : <em>Без усилений</em>}
          </div>
        )}
      </div>

      <div className={styles.rollControls}>
        <button
          className={styles.digitalRoll}
          type="button"
          disabled={isRolling || !diceReady || utilityDisabled || (mode === 'attack' && !selectedTarget) || (mode === 'utility' && !targetReady)}
          onClick={mode === 'damage' ? onRollDamage : mode === 'utility' ? onRollUtility : onRollAttack}
        >
          {isRolling ? 'Бросок…' : diceReady ? `Бросить ${rollLabel}` : 'Готовим…'}
        </button>
        <label className={styles.manualInput}>
          <span>{mode === 'attack' ? 'Вручную' : 'Без мод.'}</span>
          <input
            aria-label={mode === 'attack' ? 'Результат физического d20' : `Сумма кубиков ${rollLabel} без модификатора`}
            type="number"
            min={inputMin}
            max={inputMax}
            placeholder={rollLabel}
            value={inputValue}
            disabled={isRolling}
            onChange={(event) => onInputChange(event.target.value)}
          />
        </label>
        <button
          className={styles.applyRoll}
          type="button"
          disabled={applyDisabled}
          onClick={mode === 'damage' ? onApplyDamage : mode === 'utility' ? onApplyUtility : onApplyAttack}
        >
          {mode === 'damage' ? 'Нанести урон' : mode === 'utility' ? 'Сделать ход' : 'Пробить AC'}
        </button>
        <p className={styles.rollStatus} aria-live="polite">
          {diceError
            ? '3D-кубики недоступны — введите результат вручную.'
            : isRolling ? 'Бросок выполняется.'
              : isInputValid ? `Результат ${inputValue} готов.` : ''}
        </p>
      </div>
    </section>
  );
}
