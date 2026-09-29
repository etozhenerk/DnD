import {type CSSProperties, useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import type {CombatArmorFeedback, CombatTargetView} from './combatTypes';
import {combatPortraitStyle} from './combatPortraitStyle';
import {CombatEffectMotion} from './CombatEffectMotion';
import {CombatEffectBadge} from './CombatEffectBadge';
import {useCombatEffectFeedback} from '../../model/useCombatEffectFeedback';
import styles from './CombatTargetList.module.css';

interface CombatTargetListProps {
  allowDowned?: boolean;
  armorFeedback?: CombatArmorFeedback;
  heading: string;
  locked: boolean;
  onSelect: (targetId: string) => void;
  selectedId: string;
  selectableIds?: string[];
  side: 'left' | 'right';
  targets: CombatTargetView[];
}

interface HpFeedback {
  amount: number;
  id: number;
  kind: 'damage' | 'healing';
}

const frameAtlasPath = 'assets/concepts/campaigns/penisuela/ui/token-frame-atlas.png';
const statIcons = {
  hp: 'assets/concepts/ui/hero-book-icon-hp.png',
  ac: 'assets/concepts/ui/hero-book-icon-ac.png',
};

export function CombatTargetList({
  allowDowned = false,
  armorFeedback,
  heading,
  locked,
  onSelect,
  selectedId,
  selectableIds,
  side,
  targets,
}: CombatTargetListProps) {
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previousHp = useRef(new Map<string, number>());
  const effectFeedback = useCombatEffectFeedback(targets);
  const previousTargetIds = useRef<Set<string> | null>(null);
  const feedbackSequence = useRef(0);
  const feedbackTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const entranceTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const armorFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenArmorFeedbackId = useRef(armorFeedback?.id);
  const [hpFeedback, setHpFeedback] = useState<Record<string, HpFeedback>>({});
  const [enteringTargets, setEnteringTargets] = useState<Record<string, number>>({});
  const [visibleArmorFeedback, setVisibleArmorFeedback] = useState<CombatArmorFeedback | null>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const list = listRef.current;
    if (!section || !list || !targets.length) return;

    const updateTargetSize = () => {
      const styles = getComputedStyle(list);
      const rowGap = Number.parseFloat(styles.rowGap) || 0;
      const verticalPadding = (Number.parseFloat(styles.paddingTop) || 0)
        + (Number.parseFloat(styles.paddingBottom) || 0);
      const usableHeight = list.clientHeight - verticalPadding - rowGap * Math.max(0, targets.length - 1);
      if (usableHeight <= 0) return;

      const rowSize = Math.max(48, Math.min(70, usableHeight / targets.length));
      const tokenSize = Math.max(42, Math.min(68, rowSize - 2));
      const portraitSize = tokenSize * 0.77;
      const plateSize = Math.max(40, Math.min(62, rowSize * 0.88));

      section.style.setProperty('--combat-target-row-size', `${rowSize}px`);
      section.style.setProperty('--combat-target-token-size', `${tokenSize}px`);
      section.style.setProperty('--combat-target-portrait-size', `${portraitSize}px`);
      section.style.setProperty('--combat-target-plate-size', `${plateSize}px`);
      section.style.setProperty('--combat-target-token-inset', `${tokenSize / 2}px`);
    };

    updateTargetSize();
    const resizeObserver = new ResizeObserver(updateTargetSize);
    resizeObserver.observe(list);
    return () => resizeObserver.disconnect();
  }, [targets.length]);

  useEffect(() => {
    const nextHp = new Map(targets.map((target) => [target.id, target.hp]));
    const changes = targets.flatMap((target) => {
      const previous = previousHp.current.get(target.id);
      if (previous === undefined || previous === target.hp) return [];
      return [{
        targetId: target.id,
        feedback: {
          amount: Math.abs(target.hp - previous),
          id: ++feedbackSequence.current,
          kind: target.hp > previous ? 'healing' as const : 'damage' as const,
        },
      }];
    });
    previousHp.current = nextHp;
    if (!changes.length) return;

    setHpFeedback((current) => {
      const next = {...current};
      changes.forEach(({feedback, targetId}) => {
        next[targetId] = feedback;
      });
      return next;
    });
    changes.forEach(({feedback, targetId}) => {
      const activeTimer = feedbackTimers.current.get(targetId);
      if (activeTimer) clearTimeout(activeTimer);
      const timer = setTimeout(() => {
        setHpFeedback((current) => {
          if (current[targetId]?.id !== feedback.id) return current;
          const next = {...current};
          delete next[targetId];
          return next;
        });
        feedbackTimers.current.delete(targetId);
      }, 1050);
      feedbackTimers.current.set(targetId, timer);
    });
  }, [targets]);

  useLayoutEffect(() => {
    const nextIds = new Set(targets.map((target) => target.id));
    if (previousTargetIds.current === null) {
      previousTargetIds.current = nextIds;
      return;
    }

    const addedIds = targets
      .map((target) => target.id)
      .filter((targetId) => !previousTargetIds.current?.has(targetId));
    previousTargetIds.current = nextIds;
    if (!addedIds.length) return;

    setEnteringTargets((current) => {
      const next = {...current};
      addedIds.forEach((targetId, index) => {
        next[targetId] = index;
      });
      return next;
    });
    addedIds.forEach((targetId, index) => {
      const activeTimer = entranceTimers.current.get(targetId);
      if (activeTimer) clearTimeout(activeTimer);
      const timer = setTimeout(() => {
        setEnteringTargets((current) => {
          if (!(targetId in current)) return current;
          const next = {...current};
          delete next[targetId];
          return next;
        });
        entranceTimers.current.delete(targetId);
      }, 900 + index * 90);
      entranceTimers.current.set(targetId, timer);
    });
  }, [targets]);

  useEffect(() => {
    if (!armorFeedback || seenArmorFeedbackId.current === armorFeedback.id) return;
    seenArmorFeedbackId.current = armorFeedback.id;
    if (!targets.some((target) => target.id === armorFeedback.targetId)) return;

    setVisibleArmorFeedback(armorFeedback);
    if (armorFeedbackTimer.current) clearTimeout(armorFeedbackTimer.current);
    armorFeedbackTimer.current = setTimeout(() => {
      setVisibleArmorFeedback((current) => current?.id === armorFeedback.id ? null : current);
      armorFeedbackTimer.current = null;
    }, 1100);
  }, [armorFeedback, targets]);

  useEffect(() => () => {
    feedbackTimers.current.forEach((timer) => clearTimeout(timer));
    feedbackTimers.current.clear();
    entranceTimers.current.forEach((timer) => clearTimeout(timer));
    entranceTimers.current.clear();
    if (armorFeedbackTimer.current) clearTimeout(armorFeedbackTimer.current);
  }, []);

  return (
    <section
      className={styles.section}
      data-layout={targets.length <= 2 ? 'rows' : 'tokens'}
      data-side={side}
      aria-labelledby={headingId}
      ref={sectionRef}
    >
      <h2 className={styles.accessibleHeading} id={headingId}>{heading}</h2>
      <div className={styles.list} ref={listRef}>
        {targets.map((target) => {
          const selected = target.id === selectedId;
          const downed = target.hp <= 0;
          const selectable = !selectableIds || selectableIds.includes(target.id);
          const revivable = downed && allowDowned && selectable;
          const feedback = hpFeedback[target.id];
          const entranceOrder = enteringTargets[target.id];
          const targetArmorFeedback = visibleArmorFeedback?.targetId === target.id
            ? visibleArmorFeedback
            : null;
          const settledEffects = effectFeedback.visibleEffects(target.id, target.effects);
          const visibleEffects = side === 'right'
            ? settledEffects.filter((effect) => !effect.passive)
            : settledEffects;
          const effectDescription = visibleEffects?.map((effect) => effect.label).join(' · ');
          const targetFeedbackActive = Boolean(feedback || targetArmorFeedback || entranceOrder !== undefined);
          return (
            <div
              className={`${styles.target} ${selected ? styles.selected : ''} ${downed ? styles.downed : ''} ${revivable ? styles.revivable : ''}`}
              data-faction={target.faction}
              data-entering={entranceOrder !== undefined ? 'true' : 'false'}
              data-feedback-active={targetFeedbackActive ? 'true' : 'false'}
              key={target.id}
              style={{
                ...combatPortraitStyle(target),
                '--combat-target-enter-delay': `${(entranceOrder ?? 0) * 90}ms`,
              } as CSSProperties}
            >
              <button
                className={styles.selectTarget}
                type="button"
                disabled={!selectable || (downed && !revivable)}
                aria-pressed={selected}
                aria-disabled={locked || !selectable || (downed && !revivable)}
                aria-label={`${target.name}, HP ${target.hp} из ${target.maxHp}, AC ${target.ac}${effectDescription ? `, эффекты: ${effectDescription}` : ''}${!selectable ? ', недоступная цель этого действия' : downed ? revivable ? ', можно поднять лечением' : ', выведен из боя' : ''}`}
                onClick={() => {
                  if (!locked && selectable && (!downed || revivable)) onSelect(target.id);
                }}
                title={`${target.name}: ${target.hp}/${target.maxHp} HP, AC ${target.ac}${effectDescription ? ` · ${effectDescription}` : ''}${!selectable ? ' · Недоступная цель' : revivable ? ' · Можно поднять' : ''}`}
              />
              <span className={styles.token}>
                <CombatEffectMotion cue={effectFeedback.cueFor(target.id)}>
                <span className={styles.portraitViewport} aria-hidden="true">
                  <img className={styles.portrait} src={resolveAsset(target.token)} alt="" />
                </span>
                <span className={styles.frame} aria-hidden="true"><img src={resolveAsset(frameAtlasPath)} alt="" /></span>
                <span className={styles.state}>{revivable ? 'Поднять' : selected && !downed ? '✓' : ''}</span>
                </CombatEffectMotion>
              </span>
              <div className={styles.copy}>
                <span className={styles.targetHeading}>
                  <strong>{target.name}</strong>
                </span>
                <span className={styles.stats}>
                  <span
                    className={styles.stat}
                    data-feedback={feedback?.kind}
                    data-stat="hp"
                    key={`hp-${feedback?.id ?? 'stable'}`}
                  >
                    <img src={resolveAsset(statIcons.hp)} alt="" />
                    <small>HP</small>
                    <strong>{target.hp}/{target.maxHp}</strong>
                    {feedback ? (
                      <span className={styles.hpFeedback} data-kind={feedback.kind} aria-hidden="true">
                        <span>{feedback.kind === 'healing' ? '✚' : '✦'}</span>
                        <b>{feedback.kind === 'healing' ? '+' : '−'}{feedback.amount}</b>
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={styles.stat}
                    data-armor={targetArmorFeedback ? targetArmorFeedback.hit ? 'pierced' : 'held' : undefined}
                    data-stat="ac"
                    key={`ac-${targetArmorFeedback?.id ?? 'stable'}`}
                  >
                    <img src={resolveAsset(statIcons.ac)} alt="" />
                    <small>AC</small>
                    <strong>{target.ac}</strong>
                    {targetArmorFeedback ? (
                      <span
                        className={styles.armorFeedback}
                        data-kind={targetArmorFeedback.hit ? 'pierced' : 'held'}
                        role="status"
                      >
                        <b>{targetArmorFeedback.hit ? 'ПРОБИТО' : 'БЛОК'}</b>
                        <span>
                          {targetArmorFeedback.total}{targetArmorFeedback.hit ? ' ≥ ' : ' < '}{targetArmorFeedback.targetAc}
                        </span>
                      </span>
                    ) : null}
                  </span>
                </span>
                {visibleEffects?.length ? (
                  <div className={styles.effects} aria-label="Активные боевые эффекты">
                    {visibleEffects.map((effect) => (
                      <CombatEffectBadge key={effect.id} effect={effect} ownerName={target.name} />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
