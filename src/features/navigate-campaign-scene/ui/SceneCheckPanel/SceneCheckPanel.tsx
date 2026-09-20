import {useEffect, useRef, useState} from 'react';
import type {HeroStat} from '../../../../entities/campaign-session/model/galleryGameplay';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {useManualCriticalRollEffect} from '../../../../shared/lib/dice/useManualCriticalRollEffect';
import {D20Roller} from '../../../../shared/ui/D20Roller/D20Roller';
import {SceneDecisionModal} from '../SceneDecisionModal/SceneDecisionModal';
import styles from './SceneCheckPanel.module.css';

export interface SceneCheckHero {
  id: string;
  name: string;
  stats: Record<string, number>;
  token: string;
}

interface SceneCheckPanelProps {
  checkId: string;
  dc: number | ((heroId: string) => number);
  heroes: SceneCheckHero[];
  hint?: string;
  label: string;
  onClose: () => void;
  onResolve: (roll: number, rolls: number[]) => void;
  advantage?: boolean;
  bonusResource?: {label: string; active: boolean; onToggle: () => void};
  automaticSuccess?: {name: string; charges: number; onUse: () => boolean};
  onSelectHero: (heroId: string) => void;
  onSelectStat?: (stat: HeroStat) => void;
  rollLabel?: string;
  selectedHeroId: string;
  selectedStat: HeroStat;
  stats: HeroStat[];
}

const STAT_LABELS: Record<HeroStat, string> = {
  strength: 'Сила',
  dexterity: 'Ловкость',
  wisdom: 'Мудрость',
  intelligence: 'Интеллект',
  charisma: 'Харизма',
};

function isValidD20(value: string): boolean {
  const roll = Number(value);
  return Number.isInteger(roll) && roll >= 1 && roll <= 20;
}

function getDc(dc: SceneCheckPanelProps['dc'], heroId: string): number {
  return typeof dc === 'function' ? dc(heroId) : dc;
}

export function SceneCheckPanel({
  checkId,
  advantage = false,
  automaticSuccess,
  bonusResource,
  dc,
  heroes,
  hint = 'Один герой, одна попытка.',
  label,
  onClose,
  onResolve,
  onSelectHero,
  onSelectStat,
  rollLabel = label,
  selectedHeroId,
  selectedStat,
  stats,
}: SceneCheckPanelProps) {
  const automaticSubmitted = useRef(false);
  const [physicalRoll, setPhysicalRoll] = useState('');
  const [secondRoll, setSecondRoll] = useState('');
  const [diceRequestId, setDiceRequestId] = useState(0);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceReady, setDiceReady] = useState(false);
  const [diceError, setDiceError] = useState(false);
  const [diceRetryKey, setDiceRetryKey] = useState(0);
  const {commitManualRoll, markManualRoll, resetManualRoll} = useManualCriticalRollEffect();
  const selectedHero = heroes.find((hero) => hero.id === selectedHeroId) ?? heroes[0];
  const effectiveHeroId = selectedHero?.id ?? selectedHeroId;
  const effectiveDc = getDc(dc, effectiveHeroId);

  useEffect(() => {
    automaticSubmitted.current = false;
    setPhysicalRoll('');
    setSecondRoll('');
    setDiceRolling(false);
    setDiceError(false);
    resetManualRoll(checkId);
  }, [checkId, resetManualRoll]);

  const startDiceRoll = () => {
    if (diceError && !diceReady) {
      setDiceError(false);
      setDiceRequestId(0);
      setDiceRetryKey((current) => current + 1);
      return;
    }
    if (diceRolling || !diceReady) return;
    setPhysicalRoll('');
    setSecondRoll('');
    resetManualRoll(checkId);
    setDiceError(false);
    setDiceRolling(true);
    setDiceRequestId((current) => current + 1);
  };

  const rollsValid = isValidD20(physicalRoll) && (!advantage || isValidD20(secondRoll));
  const resolveCheck = () => {
    if (!rollsValid) return;
    const rolls = advantage ? [Number(physicalRoll), Number(secondRoll)] : [Number(physicalRoll)];
    const roll = Math.max(...rolls);
    commitManualRoll(checkId, roll);
    onResolve(roll, rolls);
  };

  const closePanel = () => {
    resetManualRoll(checkId);
    onClose();
  };

  return (
    <>
      <SceneDecisionModal
        description={`${hint}${advantage ? ' Преимущество: бросьте два d20, используется лучший.' : ''}`}
        eyebrow={`Проверка · DC ${effectiveDc}`}
        onClose={closePanel}
        open
        options={[]}
        title={label}
      >
        <div className={styles.heroChoices} aria-label="Кто выполняет проверку">
          {heroes.map((hero) => {
            const modifier = hero.stats[selectedStat] ?? 0;
            return (
              <button
                aria-pressed={hero.id === effectiveHeroId}
                className={hero.id === effectiveHeroId ? styles.selected : undefined}
                key={hero.id}
                type="button"
                onClick={() => onSelectHero(hero.id)}
              >
                <span className={styles.heroAvatarFrame} aria-hidden="true">
                  <img data-hero-id={hero.id} src={resolveAsset(hero.token)} alt="" />
                </span>
                <span className={styles.heroChoiceName}>{hero.name}</span>
                <small>
                  {STAT_LABELS[selectedStat]} {modifier >= 0 ? '+' : ''}{modifier} · DC {getDc(dc, hero.id)}
                </small>
              </button>
            );
          })}
        </div>

        <div className={styles.statChoices} aria-label="Характеристика проверки">
          {stats.map((stat) => {
            const modifier = selectedHero?.stats[stat] ?? 0;
            return (
              <button
                aria-pressed={stat === selectedStat}
                className={stat === selectedStat ? styles.selected : undefined}
                key={stat}
                type="button"
                onClick={() => onSelectStat?.(stat)}
              >
                {STAT_LABELS[stat]} {modifier >= 0 ? '+' : ''}{modifier}
              </button>
            );
          })}
        </div>

        {bonusResource ? <div className={`${styles.rollControls} ${styles.resourceControls}`}>
          <button type="button" aria-pressed={bonusResource.active} disabled={diceRolling} onClick={bonusResource.onToggle}>
            {bonusResource.label}
          </button>
        </div> : null}
        {automaticSuccess ? <div className={`${styles.rollControls} ${styles.resourceControls}`}>
          <button type="button" disabled={diceRolling || Boolean(physicalRoll) || automaticSuccess.charges < 1}
            onClick={() => {
              if (automaticSubmitted.current) return;
              automaticSubmitted.current = true;
              resetManualRoll(checkId);
              if (!automaticSuccess.onUse()) automaticSubmitted.current = false;
            }}>
            {automaticSuccess.name} · {automaticSuccess.charges} зар. · Автоматический успех
          </button>
        </div> : null}
        <div className={styles.rollControls}>
          <button type="button" disabled={diceRolling || (!diceReady && !diceError)} onClick={startDiceRoll}>
            {diceRolling ? 'Кубик в полёте…' : diceReady ? (advantage ? 'Бросить 2d20' : 'Бросить d20') : diceError ? 'Загрузить кубик снова' : 'Кубик готовится…'}
          </button>
          <label>
            <span>Результат d20</span>
            <input
              aria-label="Результат физического d20"
              disabled={diceRolling}
              inputMode="numeric"
              max="20"
              min="1"
              type="number"
              value={physicalRoll}
              onChange={(event) => {
                markManualRoll(checkId);
                setPhysicalRoll(event.target.value);
              }}
            />
          </label>
          {advantage ? (
            <label>
              <span>Второй d20</span>
              <input aria-label="Второй физический d20" disabled={diceRolling} inputMode="numeric" max="20" min="1" type="number" value={secondRoll}
                onChange={(event) => { markManualRoll(checkId); setSecondRoll(event.target.value); }} />
            </label>
          ) : null}
          <button type="button" disabled={diceRolling || !rollsValid} onClick={resolveCheck}>
            Узнать исход
          </button>
        </div>

        <span className={styles.rollStatus} aria-live="polite">
          {diceError
            ? 'Не удалось выполнить 3D-бросок. Попробуйте снова или введите результат физического d20.'
            : diceRolling
              ? 'D20 катится по столу.'
              : rollsValid
                ? `Принят результат ${advantage ? `${physicalRoll} / ${secondRoll}; выбран ${Math.max(Number(physicalRoll), Number(secondRoll))}` : physicalRoll}. Исход проверки ещё скрыт.`
                : ''}
        </span>
      </SceneDecisionModal>
      <D20Roller
        key={diceRetryKey}
        diceExpression="1d20"
        requestId={diceRequestId}
        rollLabel={rollLabel}
        rolling={diceRolling}
        selectionMode={advantage ? "highest" : "sum"}
        onError={() => {
          setDiceRolling(false);
          setDiceError(true);
        }}
        onReadyChange={(ready) => {
          setDiceReady(ready);
          if (ready) setDiceError(false);
        }}
        onResult={(result, rolls) => {
          resetManualRoll(checkId);
          setPhysicalRoll(String(advantage ? rolls[0] : result));
          setSecondRoll(advantage ? String(rolls[1]) : "");
          setDiceRolling(false);
        }}
      />
    </>
  );
}
