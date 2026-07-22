import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type DiceBox from '@3d-dice/dice-box';
import {getRawDiceRange, parseDiceExpression} from '../../lib/dice/diceExpression';
import styles from './D20Roller.module.css';

interface D20RollerProps {
  diceExpression?: string;
  rollLabel?: string;
  requestId: number;
  rolling: boolean;
  onReadyChange: (ready: boolean) => void;
  onResult: (result: number) => void;
  onError: () => void;
}

function extractDiceResult(result: Awaited<ReturnType<DiceBox['roll']>>, diceExpression: string) {
  const expression = parseDiceExpression(diceExpression);
  if (!expression || expression.modifier !== 0) return null;
  const values = result.flatMap((die) => die.rolls?.map((roll) => roll.value) ?? []);
  const value = values.length ? values.reduce((sum, roll) => sum + roll, 0) : result[0]?.value;
  const range = getRawDiceRange(expression);
  return Number.isInteger(value) && value >= range.min && value <= range.max ? value : null;
}

export function D20Roller({
  diceExpression = '1d20',
  rollLabel = 'Бросок атаки',
  requestId,
  rolling,
  onReadyChange,
  onResult,
  onError,
}: D20RollerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const diceBoxRef = useRef<DiceBox | null>(null);
  const lastRequestRef = useRef(0);
  const callbacksRef = useRef({onReadyChange, onResult, onError});
  const [ready, setReady] = useState(false);
  const [settledResult, setSettledResult] = useState<number | null>(null);

  callbacksRef.current = {onReadyChange, onResult, onError};

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      if (!containerRef.current) return;
      try {
        const {default: DiceBoxConstructor} = await import('@3d-dice/dice-box');
        const themeColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-wine')
          .trim();
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const diceBox = new DiceBoxConstructor({
          assetPath: `${import.meta.env.BASE_URL}assets/`,
          container: '#gallery-d20-stage',
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
      } catch {
        if (cancelled) return;
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
  }, []);

  useEffect(() => {
    if (!ready || requestId <= 0 || requestId === lastRequestRef.current || !diceBoxRef.current) return;
    lastRequestRef.current = requestId;
    setSettledResult(null);
    let cancelled = false;

    const roll = async () => {
      try {
        const result = await diceBoxRef.current!.roll(diceExpression);
        if (cancelled) return;
        const value = extractDiceResult(result, diceExpression);
        if (value === null) {
          callbacksRef.current.onError();
          return;
        }
        setSettledResult(value);
      } catch {
        if (!cancelled) callbacksRef.current.onError();
      }
    };

    void roll();
    return () => {
      cancelled = true;
    };
  }, [diceExpression, ready, requestId]);

  const acceptResult = () => {
    if (settledResult === null) return;
    const result = settledResult;
    setSettledResult(null);
    callbacksRef.current.onResult(result);
  };

  return createPortal(
    <div className={`${styles.overlay} ${rolling ? styles.visible : ''}`} aria-hidden={!rolling}>
      <div className={styles.glow} />
      <div className={styles.tray}>
        <div id="gallery-d20-stage" ref={containerRef} className={styles.stage} />
      </div>
      <div className={styles.outcome}>
        <p className={styles.status} role="status" aria-live="polite">
          {rolling ? settledResult === null ? `${rollLabel}: ${diceExpression}…` : `${rollLabel}: выпало ${settledResult}` : ''}
        </p>
        {settledResult !== null ? (
          <button type="button" onClick={acceptResult}>Принять результат</button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
