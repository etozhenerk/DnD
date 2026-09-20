import {useEffect, useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type DiceBox from '@3d-dice/dice-box';
import {triggerCriticalRollEffect} from '../../lib/dice/criticalRollEffect';
import {
  formatDiceExpression,
  parseDicePoolExpression,
} from '../../lib/dice/diceExpression';
import {
  resolveDiceSelection,
  type DiceSelectionMode,
} from '../../lib/dice/diceSelection';
import styles from './D20Roller.module.css';

interface D20RollerProps {
  diceExpression?: string;
  rollLabel?: string;
  requestId: number;
  rolling: boolean;
  selectionMode?: DiceSelectionMode;
  onReadyChange: (ready: boolean) => void;
  onResult: (result: number, rolls: number[]) => void;
  onError: () => void;
}

function extractDiceResult(
  result: Awaited<ReturnType<DiceBox['roll']>>,
  diceExpression: string,
  selectionMode: DiceSelectionMode,
) {
  const values = result.flatMap((die) => die.rolls?.map((roll) => roll.value) ?? []);
  const resolvedValues = values.length
    ? values
    : result.map((die) => die.value ?? 0);
  return resolveDiceSelection(resolvedValues, diceExpression, selectionMode);
}

export function D20Roller({
  diceExpression = '1d20',
  rollLabel = 'Бросок атаки',
  requestId,
  rolling,
  selectionMode = 'sum',
  onReadyChange,
  onResult,
  onError,
}: D20RollerProps) {
  const stageId = `d20-stage-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const diceBoxRef = useRef<DiceBox | null>(null);
  const lastRequestRef = useRef(0);
  const callbacksRef = useRef({onReadyChange, onResult, onError});
  const [ready, setReady] = useState(false);
  const [settledResult, setSettledResult] = useState<number | null>(null);
  const [settledRolls, setSettledRolls] = useState<number[]>([]);

  callbacksRef.current = {onReadyChange, onResult, onError};

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      if (!containerRef.current) return;
      try {
        const {default: DiceBoxConstructor} = await import('@3d-dice/dice-box');
        if (cancelled || !containerRef.current) return;
        const themeColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-wine')
          .trim();
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const diceBox = new DiceBoxConstructor({
          assetPath: `${import.meta.env.BASE_URL}assets/`,
          container: `#${stageId}`,
          id: `${stageId}-canvas`,
          gravity: 1.15,
          mass: 1.1,
          friction: 0.72,
          restitution: 0.32,
          angularDamping: 0.34,
          linearDamping: 0.42,
          spinForce: 6,
          throwForce: 4.4,
          startingHeight: 7,
          settleTimeout: 3600,
          lightIntensity: 1.25,
          enableShadows: true,
          shadowTransparency: 0.72,
          theme: 'default',
          themeColor,
          scale: 7.2,
          suspendSimulation: reduceMotion,
        });
        await diceBox.init();
        if (cancelled) {
          diceBox.clear();
          return;
        }
        diceBoxRef.current = diceBox;
        setReady(true);
        callbacksRef.current.onReadyChange(true);
      } catch (error) {
        if (cancelled) return;
        console.error('Не удалось загрузить 3D-кубик:', error);
        setReady(false);
        callbacksRef.current.onReadyChange(false);
        callbacksRef.current.onError();
      }
    };

    void initialize();
    return () => {
      cancelled = true;
      callbacksRef.current.onReadyChange(false);
      diceBoxRef.current?.clear();
      diceBoxRef.current = null;
    };
  }, [stageId]);

  useEffect(() => {
    if (!ready || requestId <= 0 || requestId === lastRequestRef.current || !diceBoxRef.current) return;
    lastRequestRef.current = requestId;
    setSettledResult(null);
    setSettledRolls([]);
    let cancelled = false;

    const roll = async () => {
      try {
        const dice = parseDicePoolExpression(diceExpression);
        if (!dice) throw new Error(`Unsupported dice expression: ${diceExpression}`);
        const notation = selectionMode === 'sum'
          ? dice.length === 1
            ? formatDiceExpression(dice[0], false)
            : dice.map((die) => formatDiceExpression(die, false))
          : '2d20';
        const rollDicePool = diceBoxRef.current!.roll as unknown as (
          value: string | string[],
        ) => ReturnType<DiceBox['roll']>;
        const result = await rollDicePool.call(diceBoxRef.current, notation);
        if (cancelled) return;
        const resolved = extractDiceResult(result, diceExpression, selectionMode);
        if (!resolved) {
          callbacksRef.current.onError();
          return;
        }
        setSettledResult(resolved.value);
        setSettledRolls(resolved.rolls);
        triggerCriticalRollEffect(resolved.value, diceExpression);
      } catch {
        if (!cancelled) callbacksRef.current.onError();
      }
    };

    void roll();
    return () => {
      cancelled = true;
    };
  }, [diceExpression, ready, requestId, selectionMode]);

  const acceptResult = () => {
    if (settledResult === null) return;
    const result = settledResult;
    setSettledResult(null);
    setSettledRolls([]);
    callbacksRef.current.onResult(result, settledRolls);
  };

  return createPortal(
    <div className={`${styles.overlay} ${rolling ? styles.visible : ''}`} aria-hidden={!rolling}>
      <div className={styles.glow} />
      <div className={styles.tray}>
        <div id={stageId} ref={containerRef} className={styles.stage} />
      </div>
      <div className={styles.outcome}>
        <p className={styles.status} role="status" aria-live="polite">
          {rolling
            ? settledResult === null
              ? `${rollLabel}: ${selectionMode === 'sum' ? diceExpression : '2d20'}…`
              : selectionMode === 'sum'
                ? `${rollLabel}: выпало ${settledResult}`
                : `${rollLabel}: ${settledRolls.join(' и ')}; выбран ${settledResult}`
            : ''}
        </p>
        {settledResult !== null ? (
          <button type="button" onClick={acceptResult}>Принять результат</button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
