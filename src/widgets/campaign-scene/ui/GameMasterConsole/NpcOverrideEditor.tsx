import {useEffect, useState} from 'react';
import type {GallerySessionController} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import styles from './GameMasterConsole.module.css';

interface NpcOverrideEditorProps {
  controller: GallerySessionController;
}

export function NpcOverrideEditor({controller}: NpcOverrideEditorProps) {
  const {npcDecisionActors, sessionHeroes, state} = controller;
  const defaultActor = npcDecisionActors.find((actor) => actor.active) ?? npcDecisionActors[0];
  const activeActorId = npcDecisionActors.find((actor) => actor.active)?.id;
  const [actorId, setActorId] = useState(defaultActor?.id ?? '');
  const decisionView = controller.getNpcDecision(actorId);
  const suggestion = decisionView?.suggestion;
  const [actionId, setActionId] = useState(suggestion?.actionId ?? '');
  const [targetIds, setTargetIds] = useState<string[]>(suggestion?.targetIds ?? []);
  const [roll, setRoll] = useState('');
  const [status, setStatus] = useState('');
  const undoRevision = state.events.filter(event => event.type === 'action-corrected').length;
  useEffect(() => setStatus(''), [undoRevision]);
  const selectedOption = decisionView?.options.find((option) => option.actionId === actionId);
  const isSkill = Boolean(decisionView?.skillActionIds.includes(actionId));
  const requiredTargets = selectedOption?.targetIds.length ?? 0;
  const storedOverride = state.npcOverrides[actorId];
  const canExecute = Boolean(
    decisionView
    && selectedOption
    && !state.combat?.pendingAttack && !state.combat?.pendingSavingThrow
    && (decisionView.actor.active || decisionView.actor.support)
    && new Set(targetIds).size === requiredTargets
    && targetIds.length === requiredTargets
    && targetIds.every((targetId) => selectedOption.legalTargetIds.includes(targetId)),
  );

  useEffect(() => {
    if (npcDecisionActors.some((actor) => actor.id === actorId)) return;
    const nextActor = npcDecisionActors.find((actor) => actor.active) ?? npcDecisionActors[0];
    setActorId(nextActor?.id ?? '');
  }, [actorId, npcDecisionActors]);

  useEffect(() => {
    if (activeActorId) setActorId(activeActorId);
  }, [activeActorId]);

  useEffect(() => {
    setActionId(suggestion?.actionId ?? '');
    setTargetIds(suggestion?.targetIds ?? []);
    setRoll('');
  }, [actorId, suggestion?.actionId, suggestion?.targetIds.join('|')]);

  if (!state.combat || !npcDecisionActors.length) {
    return (
      <section className={styles.section} aria-labelledby="gm-npc-heading">
        <div className={styles.sectionHeading}>
          <div><p>Управление противниками</p><h3 id="gm-npc-heading">Действие противника</h3></div>
        </div>
        <p className={styles.emptyState}>NPC для подтверждения появятся в активном бою.</p>
      </section>
    );
  }

  const selectActor = (nextActorId: string) => {
    const nextDecision = controller.getNpcDecision(nextActorId);
    setActorId(nextActorId);
    setActionId(nextDecision?.suggestion.actionId ?? '');
    setTargetIds(nextDecision?.suggestion.targetIds ?? []);
    setStatus('');
  };

  const selectAction = (nextActionId: string) => {
    const nextOption = decisionView?.options.find((option) => option.actionId === nextActionId);
    setActionId(nextActionId);
    setTargetIds(nextOption?.targetIds ?? []);
    setStatus('');
  };

  const chooseOtherAction = () => {
    const options = decisionView?.options ?? [];
    if (options.length < 2) return;
    const currentIndex = Math.max(0, options.findIndex((option) => option.actionId === actionId));
    selectAction(options[(currentIndex + 1) % options.length].actionId);
  };

  const chooseOtherTarget = () => {
    if (!selectedOption || requiredTargets === 0 || selectedOption.legalTargetIds.length <= requiredTargets) return;
    const firstIndex = Math.max(0, selectedOption.legalTargetIds.indexOf(targetIds[0]));
    const rotated = Array.from({length: requiredTargets}, (_, offset) => (
      selectedOption.legalTargetIds[(firstIndex + offset + 1) % selectedOption.legalTargetIds.length]
    ));
    setTargetIds(rotated);
    setStatus('Выбрана другая допустимая цель.');
  };

  const executeDecision = () => {
    if (!decisionView || !selectedOption) return;
    const numericRoll = !isSkill && roll ? Number(roll) : undefined;
    if (numericRoll !== undefined && (!Number.isInteger(numericRoll) || numericRoll < 1 || numericRoll > 20)) {
      setStatus('Физический d20 должен быть от 1 до 20.');
      return;
    }
    const executed = controller.executeNpcDecision(actorId, selectedOption.actionId, targetIds, numericRoll);
    setStatus(executed ? isSkill ? 'Навык выбран. Закройте консоль и выполните броски в панели боя.' : 'Решение записано и исполнено одной командой.' : 'Снимок изменился: решение больше нельзя выполнить.');
  };

  const skipTurn = () => {
    const skipped = controller.skipNpcAction(actorId);
    setStatus(skipped ? 'Пропуск записан и ход передан.' : 'Сейчас этот ход нельзя пропустить.');
  };

  const targetName = (targetId: string) => sessionHeroes.find((hero) => hero.id === targetId)?.name ?? targetId;

  return (
    <section className={styles.section} aria-labelledby="gm-npc-heading">
      <div className={styles.sectionHeading}>
        <div><p>Предложение для противника</p><h3 id="gm-npc-heading">Действие противника</h3></div>
        <span>{decisionView?.actor.active ? 'Активный ход' : decisionView?.actor.support ? 'Поддержка' : 'Подготовка'}</span>
      </div>
      <div className={styles.formGrid}>
        <label>
          Противник
          <select value={actorId} onChange={(event) => selectActor(event.target.value)}>
            {npcDecisionActors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.name}{actor.active ? ' · ход' : actor.support ? ' · поддержка' : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Действие
          <select
            disabled={!decisionView?.options.length}
            value={actionId}
            onChange={(event) => selectAction(event.target.value)}
          >
            {(decisionView?.options ?? []).map((option) => (
              <option key={option.actionId} value={option.actionId}>
                {option.actionName}
              </option>
            ))}
          </select>
        </label>
        {Array.from({length: requiredTargets}, (_, index) => (
          <label key={`${actionId}-target-${index}`}>
            Цель {requiredTargets > 1 ? index + 1 : ''}
            <select
              value={targetIds[index] ?? ''}
              onChange={(event) => setTargetIds((current) => {
                const next = [...current];
                next[index] = event.target.value;
                return next;
              })}
            >
              {(selectedOption?.legalTargetIds ?? []).map((targetId) => (
                <option
                  disabled={targetIds.some((selectedId, selectedIndex) => selectedIndex !== index && selectedId === targetId)}
                  key={targetId}
                  value={targetId}
                >
                  {targetName(targetId)} · {state.heroHp[targetId] ?? 0} HP
                </option>
              ))}
            </select>
          </label>
        ))}
        {!isSkill ? <label>
          Физический d20
          <input
            inputMode="numeric"
            max="20"
            min="1"
            placeholder="1–20, или оставьте пустым"
            type="number"
            value={roll}
            onChange={(event) => setRoll(event.target.value)}
          />
        </label> : null}
      </div>
      <p className={styles.note}>{isSkill ? 'Выберите навык, затем закройте консоль. Броски, расход использования и применение проходят в общей панели боя.' : 'Можно принять предложение или выбрать другую цель. Пустое поле d20 — случайный бросок движка; число 1–20 — результат вашего кубика. Урон подтверждается отдельно на боевом экране.'}</p>
      {selectedOption ? (
        <p className={styles.note}>
          Почему предлагается это действие: {selectedOption.explanation}
        </p>
      ) : (
        <p className={styles.warning}>Легальных действий нет. Доступен только явный пропуск активного хода.</p>
      )}
      {actionId === 'rail-charge' && requiredTargets > 1 ? (
        <p className={styles.note}>Один введённый физический d20 применяется ко всем целям линии; при пустом поле каждая цель бросает цифровой d20 отдельно.</p>
      ) : null}
      {storedOverride ? (
        <p className={styles.savedState}>
          Последнее решение: {decisionView?.options.find(option => option.actionId === storedOverride.actionId)?.actionName ?? 'решение мастера'}
          {(storedOverride.targetIds ?? (storedOverride.targetId ? [storedOverride.targetId] : [])).length
            ? ` → ${(storedOverride.targetIds ?? [storedOverride.targetId]).map(targetName).join(', ')}`
            : ''}
          {storedOverride.skipped ? ' · пропуск' : storedOverride.confirmed ? ' · подтверждено' : ''}
        </p>
      ) : null}
      <div className={styles.actionRow}>
        <button disabled={!canExecute} type="button" onClick={executeDecision}>{isSkill ? 'Выбрать навык в бою' : 'Выполнить'}</button>
        <button disabled={(decisionView?.options.length ?? 0) < 2} type="button" onClick={chooseOtherAction}>Другое действие</button>
        <button
          disabled={!selectedOption || selectedOption.legalTargetIds.length <= requiredTargets}
          type="button"
          onClick={chooseOtherTarget}
        >
          Другая цель
        </button>
        <button disabled={!decisionView?.actor.active || Boolean(state.combat.pendingAttack || state.combat.pendingSavingThrow)} type="button" onClick={skipTurn}>
          Пропустить
        </button>
      </div>
      {!decisionView?.actor.active && !decisionView?.actor.support ? (
        <p className={styles.warning}>Решение можно подготовить, но выполнить или пропустить — только на активном ходу этого NPC.</p>
      ) : null}
      <p className={styles.liveStatus} aria-live="polite">{status}</p>
    </section>
  );
}
