import {useEffect, useMemo, useState} from 'react';
import {ParticipantPicker} from './ParticipantPicker';
import {penisuelaSessionPreview, homebrewConditions} from '../../../../entities/campaign-session/model/playableData';
import type {GalleryGameplayDefinition} from '../../../../entities/campaign-session/model/galleryGameplay';
import type {GalleryManualAdjustment} from '../../../../entities/campaign-session/model/gallerySession';
import type {GallerySessionController} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {parseGmInteger} from '../../model/gmConsolePresentation';
import styles from './GameMasterConsole.module.css';

interface ParticipantEditorProps {
  controller: GallerySessionController;
  definition: GalleryGameplayDefinition;
}

type ParticipantField = Extract<GalleryManualAdjustment, {kind: 'participant-stat'}>['field'];

const fieldLabels: Record<ParticipantField, string> = {
  hp: 'Здоровье (HP)',
  maxHp: 'Максимум здоровья',
  ac: 'Защита (AC)',
  attackBonus: 'Бонус атаки',
  temporaryModifier: 'Временный бонус',
};

const fieldHelp: Record<ParticipantField, string> = {
  hp: 'Текущее здоровье. При 0 герой теряет сознание; лечение возвращает его в бой.',
  maxHp: 'Верхний предел здоровья. Уменьшение предела также обрежет лишние текущие HP.',
  ac: 'Число, которое противник должен достичь броском атаки. Больше — труднее попасть.',
  attackBonus: 'Прибавляется к d20 при обычной атаке. Не меняет кубики урона.',
  temporaryModifier: 'Дополнительный бонус или штраф к броскам участника. Чтобы убрать его, верните 0.',
};

export function ParticipantEditor({controller, definition}: ParticipantEditorProps) {
  const {sessionHeroes, state} = controller;
  const enemies = useMemo(() => Object.values(state.combat?.enemies ?? {}), [state.combat?.enemies]);
  const participantIds = [...sessionHeroes.map((hero) => hero.id), ...enemies.map((enemy) => enemy.id)];
  const [participantId, setParticipantId] = useState(participantIds[0] ?? '');
  const [drafts, setDrafts] = useState<Record<ParticipantField, string>>({
    hp: '0',
    maxHp: '1',
    ac: '10',
    attackBonus: '0',
    temporaryModifier: '0',
  });
  const [conditionId, setConditionId] = useState(homebrewConditions[0]?.id ?? 'inspired');
  const [status, setStatus] = useState('');
  const undoRevision = state.events.filter(event => event.type === 'action-corrected').length;
  useEffect(() => setStatus(''), [undoRevision]);
  const hero = sessionHeroes.find((candidate) => candidate.id === participantId);
  const enemy = state.combat?.enemies[participantId];
  const encounter = definition.encounters.find((candidate) => candidate.id === state.combat?.encounterId);
  const heroAttack = encounter?.heroAttacks.find((candidate) => candidate.characterId === participantId)
    ?? definition.encounters
      .flatMap((candidate) => candidate.heroAttacks)
      .find((candidate) => candidate.characterId === participantId);
  const currentValues: Record<ParticipantField, number> = {
    hp: hero ? state.heroHp[hero.id] ?? hero.hp : enemy?.hp ?? 0,
    maxHp: hero ? state.heroMaxHp[hero.id] ?? hero.maxHp : enemy?.maxHp ?? 1,
    ac: hero?.ac ?? enemy?.ac ?? 10,
    attackBonus: enemy?.attack.bonus
      ?? state.heroAttackBonuses[participantId]
      ?? heroAttack?.bonus
      ?? 0,
    temporaryModifier: state.participantTemporaryModifiers[participantId] ?? 0,
  };
  const conditions = state.participantConditions[participantId] ?? [];
  const conditionOptions = [...homebrewConditions, ...conditions
    .filter((id) => !homebrewConditions.some((condition) => condition.id === id))
    .map((id) => ({id, name: id, effect: 'Ручное состояние мастера.'}))];

  useEffect(() => {
    if (participantIds.includes(participantId)) return;
    setParticipantId(participantIds[0] ?? '');
  }, [participantId, participantIds]);

  useEffect(() => {
    setDrafts(Object.fromEntries(
      Object.entries(currentValues).map(([field, value]) => [field, String(value)]),
    ) as Record<ParticipantField, string>);
  }, [
    participantId,
    currentValues.ac,
    currentValues.attackBonus,
    currentValues.hp,
    currentValues.maxHp,
    currentValues.temporaryModifier,
  ]);

  const limits = (field: ParticipantField): [number, number] => field === 'hp' ? [0, currentValues.maxHp]
    : field === 'maxHp' ? [1, 9999] : field === 'ac' ? [0, 99] : field === 'temporaryModifier' ? [-20, 20] : [-50, 99];
  const saveField = (field: ParticipantField) => {
    const value = parseGmInteger(drafts[field], ...limits(field));
    const saved = value !== null && controller.manualAdjustParticipant(participantId, field, value);
    setStatus(saved ? `${fieldLabels[field]} сохранено.` : 'Значение не прошло проверку.');
  };

  const toggleCondition = (id: string, active: boolean) => {
    const saved = controller.manualSetCondition(participantId, id, active);
    setStatus(saved ? `Состояние «${conditionOptions.find(condition => condition.id === id)?.name ?? id}» ${active ? 'добавлено' : 'снято'}.` : 'Состояние не изменено.');
  };

  return (
    <section className={styles.section} aria-labelledby="gm-participants-heading">
      <div className={styles.sectionHeading}>
        <div>
          <p>Здоровье, защита и состояния</p>
          <h3 id="gm-participants-heading">Герои и участники боя</h3>
        </div>
        <span>Только это прохождение</span>
      </div>

      <ParticipantPicker label="Герои группы" selectedId={participantId} onSelect={id => {setParticipantId(id); setStatus('');}}
        participants={sessionHeroes.map(candidate => ({id: candidate.id, name: candidate.name,
          token: penisuelaSessionPreview.party.find(item => item.characterId === candidate.id)?.token,
          hp: state.heroHp[candidate.id] ?? candidate.hp, maxHp: state.heroMaxHp[candidate.id] ?? candidate.maxHp,
        }))}/>
      {enemies.length ? <details className={styles.disclosure} open={Boolean(enemy)}><summary>Противники текущего боя · {enemies.length}</summary>
        <ParticipantPicker label="Противники текущего боя" selectedId={participantId} onSelect={setParticipantId} participants={enemies}/>
      </details> : null}
      <h4 className={styles.selectedName}>{hero?.name ?? enemy?.name}</h4>
      <div className={styles.statGrid}>
        {(Object.keys(fieldLabels) as ParticipantField[]).map((field) => (
          <label key={field}>
            {fieldLabels[field]}
            <span className={styles.inlineControl}>
              <input
                aria-label={fieldLabels[field]}
                inputMode="numeric"
                min={limits(field)[0]} max={limits(field)[1]}
                type="number"
                value={drafts[field]}
                onChange={(event) => setDrafts((current) => ({...current, [field]: event.target.value}))}
              />
              <button
                aria-label={`Сохранить: ${fieldLabels[field]}`}
                disabled={parseGmInteger(drafts[field], ...limits(field)) === null || Number(drafts[field]) === currentValues[field]}
                type="button"
                onClick={() => saveField(field)}
              >
                Сохранить
              </button>
            </span>
          </label>
        ))}
      </div>

      <div className={styles.subsection}>
        <div className={styles.subsectionHeading}>
          <h4>Состояния</h4>
          <span>{conditions.length}</span>
        </div>
        {conditions.length ? (
          <ul className={styles.chipList}>
            {conditions.map((id) => (
              <li key={id}>
                <span>{conditionOptions.find((condition) => condition.id === id)?.name ?? id}</span>
                <button type="button" onClick={() => toggleCondition(id, false)} aria-label={`Снять состояние ${conditionOptions.find(condition => condition.id === id)?.name ?? id}`}>×</button>
              </li>
            ))}
          </ul>
        ) : <p className={styles.note}>Активных состояний нет.</p>}
        <div className={styles.inlineForm}>
          <label>
            Добавить состояние
            <select value={conditionId} onChange={(event) => setConditionId(event.target.value)}>
              {conditionOptions.map((condition) => (
                <option key={condition.id} value={condition.id}>{condition.name}</option>
              ))}
            </select>
          </label>
          <button disabled={conditions.includes(conditionId)} type="button" onClick={() => toggleCondition(conditionId, true)}>
            Применить
          </button>
        </div>
        <p className={styles.note}>{conditionOptions.find(condition => condition.id === conditionId)?.effect}</p>
      </div>
      <details className={styles.disclosure}><summary>Что означают характеристики?</summary>
        <dl className={styles.statHelp}>{(Object.keys(fieldLabels) as ParticipantField[]).map(field => <div key={field}><dt>{fieldLabels[field]}</dt><dd>{fieldHelp[field]}</dd></div>)}</dl>
      </details>
      <details className={styles.disclosure}><summary>Передышка всей группы</summary>
        <p className={styles.note}>В безопасном месте вне боя каждый герой восстановит 1d8 здоровья. Ресурсы на локацию восстановятся; расходы на всю кампанию сохранятся.</p>
        <button type="button" disabled={Boolean(state.combat)} onClick={() => setStatus(controller.safeLocationRest()
          ? 'Группа отдохнула. Лечение записано в журнал.' : 'Передышка сейчас недоступна.')}>Дать группе передышку</button>
      </details>
      <p className={styles.liveStatus} aria-live="polite">{status}</p>
    </section>
  );
}
