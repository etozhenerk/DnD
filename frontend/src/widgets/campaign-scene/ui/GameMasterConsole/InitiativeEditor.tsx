import {penisuelaSessionPreview} from '../../../../entities/campaign-session/model/playableData';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {useEffect, useState} from 'react';
import type {GallerySessionController} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {parseGmInteger} from '../../model/gmConsolePresentation';
import styles from './GameMasterConsole.module.css';

interface InitiativeEditorProps {
  controller: GallerySessionController;
}

export function InitiativeEditor({controller}: InitiativeEditorProps) {
  const {sessionHeroes, state} = controller;
  const combat = state.combat;
  const [roundDraft, setRoundDraft] = useState(String(combat?.round ?? 1));
  const [status, setStatus] = useState('');
  const undoRevision = state.events.filter(event => event.type === 'action-corrected').length;
  useEffect(() => setStatus(''), [undoRevision]);

  useEffect(() => setRoundDraft(String(combat?.round ?? 1)), [combat?.round]);

  if (!combat) {
    return (
      <section className={styles.section} aria-labelledby="gm-initiative-heading">
        <div className={styles.sectionHeading}>
          <div><p>Ходы и раунды</p><h3 id="gm-initiative-heading">Инициатива</h3></div>
        </div>
        <p className={styles.emptyState}>Сейчас активного боя нет. Порядок появится после старта столкновения.</p>
      </section>
    );
  }

  const activeId = combat.initiativeOrder[combat.turnIndex];
  const participantName = (id: string) => sessionHeroes.find((hero) => hero.id === id)?.name
    ?? combat.enemies[id]?.name
    ?? combat.allies[id]?.name
    ?? id;

  const participantToken = (id: string) => penisuelaSessionPreview.party.find(hero => hero.characterId === id)?.token
    ?? combat.enemies[id]?.token ?? combat.allies[id]?.token;

  const commitOrder = (order: string[], nextActiveId = activeId, round = combat.round) => {
    const saved = controller.manualSetInitiative(order, nextActiveId, round);
    setStatus(saved ? 'Порядок инициативы сохранён.' : 'Порядок не изменён.');
  };

  const moveParticipant = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= combat.initiativeOrder.length) return;
    const order = [...combat.initiativeOrder];
    [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
    commitOrder(order);
  };

  const saveRound = () => {
    const value = parseGmInteger(roundDraft, 1, 999);
    const saved = value !== null && controller.manualSetInitiative(combat.initiativeOrder, activeId, value);
    setStatus(saved ? `Раунд ${roundDraft} сохранён.` : 'Номер раунда не изменён.');
  };

  return (
    <section className={styles.section} aria-labelledby="gm-initiative-heading">
      <div className={styles.sectionHeading}>
        <div><p>Ходы и раунды</p><h3 id="gm-initiative-heading">Инициатива</h3></div>
        <span>Раунд {combat.round}</span>
      </div>
      {combat.pendingAttack ? (
        <p className={styles.warning}>Изменение порядка отменит ожидающий бросок урона.</p>
      ) : null}
      <p className={styles.note}>Стрелки меняют порядок участников. «Передать ход» выбирает, кто действует сейчас. Раунд — номер полного круга ходов.</p>
      <ol className={styles.initiativeList}>
        {combat.initiativeOrder.map((id, index) => (
          <li className={id === activeId ? styles.activeInitiative : undefined} key={id}>
            <span>{index + 1}</span>
            <strong className={styles.initiativeIdentity}>{participantToken(id) ? <img src={resolveAsset(participantToken(id)!)} alt=""/> : null}{participantName(id)}</strong>
            <div>
              <button disabled={index === 0} type="button" onClick={() => moveParticipant(index, -1)} aria-label={`Поднять ${participantName(id)} в инициативе`}>↑</button>
              <button disabled={index === combat.initiativeOrder.length - 1} type="button" onClick={() => moveParticipant(index, 1)} aria-label={`Опустить ${participantName(id)} в инициативе`}>↓</button>
              <button aria-label={`Передать ход: ${participantName(id)}`} disabled={id === activeId} type="button" onClick={() => commitOrder(combat.initiativeOrder, id)}>Передать ход</button>
            </div>
          </li>
        ))}
      </ol>
      <div className={styles.inlineForm}>
        <label>
          Раунд
          <input min="1" max="999" inputMode="numeric" type="number" value={roundDraft} onChange={(event) => setRoundDraft(event.target.value)} />
        </label>
        <button disabled={parseGmInteger(roundDraft, 1, 999) === null || Number(roundDraft) === combat.round} type="button" onClick={saveRound}>Сохранить раунд</button>
      </div>
      <p className={styles.liveStatus} aria-live="polite">{status}</p>
    </section>
  );
}
