import {useEffect, useMemo, useState} from 'react';
import {penisuelaDialogueBank} from '../../../../entities/campaign-session/model/playableData';
import {
  describeDialogueEffect,
  getDialogueSceneContexts,
  evaluateDialoguePresetConditions,
} from '../../../../entities/campaign-session/model/dialoguePresets';
import type {DialoguePresetDefinition} from '../../../../entities/campaign-session/model/dialoguePresets';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import type {GallerySessionController} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import styles from './GameMasterConsole.module.css';

interface DialoguePresetConsoleProps {
  controller: GallerySessionController;
  scene: CampaignSessionScene;
}

const characterNames: Record<string, string> = {
  'bungalow-spouse-a': 'Станис',
  'bungalow-spouse-b': 'Полинетта',
  'celebrity-decoy-satyr': 'Satyr',
  'club-dance-troupe': 'Танцевальная труппа',
  'confidentiality-corp-de-ballet': 'Кордебалет конфиденциальности',
  'dressing-room-mirror-doubles': 'Гримёрные дублёры',
  'egor-kreed': 'Kreed',
  egorik: 'Егорик',
  'eternal-all-inclusive': 'Прохор',
  'igor-sinyak': 'Angel',
  kostryulka: 'Кострюлька',
  'last-take-module': 'Модуль «Последний дубль»',
  'lord-krayneplot': 'Лорд Крайнеплот',
  nastya: 'Настасья',
  'olga-vasilenko': 'Леди Оливия',
  'pussy-sultan': 'Pussy Sultan',
  'rail-prop-kraken': 'Рельсовый кракен',
  'style-sphinx': 'Алексис Великолепный',
  'andrey-apollonov-junior': 'Лорд Нетак',
  graywise: 'Grey Wiese',
  'universal-advice-algorithm': 'Алгоритм универсальных советов',
};

function getCharacterName(characterId: string) {
  return characterNames[characterId] ?? characterId;
}

function groupPresets(presets: DialoguePresetDefinition[]) {
  const groups = new Map<string, DialoguePresetDefinition[]>();
  presets.forEach((preset) => {
    const group = `${preset.intent} · ${preset.tone}`;
    groups.set(group, [...(groups.get(group) ?? []), preset]);
  });
  return [...groups.entries()];
}


export function DialoguePresetConsole({controller, scene}: DialoguePresetConsoleProps) {
  const [showAllPresets, setShowAllPresets] = useState(false);
  const sceneContexts = useMemo(() => getDialogueSceneContexts(scene.id), [scene.id]);
  const scenePresets = useMemo(
    () => penisuelaDialogueBank.presets.filter((preset) => (
      showAllPresets || preset.sceneIds.some((sceneId) => sceneContexts.has(sceneId))
    )),
    [sceneContexts, showAllPresets],
  );
  const characterIds = useMemo(
    () => [...new Set(scenePresets.map((preset) => preset.characterId))],
    [scenePresets],
  );
  const [characterId, setCharacterId] = useState(characterIds[0] ?? '');
  const characterPresets = useMemo(
    () => scenePresets.filter((preset) => preset.characterId === characterId),
    [characterId, scenePresets],
  );
  const [presetId, setPresetId] = useState(characterPresets[0]?.id ?? '');
  const [selectedHeroId, setSelectedHeroId] = useState<string>('');
  const [spokenText, setSpokenText] = useState('');
  const [overrideConditions, setOverrideConditions] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState('');
  const preset = characterPresets.find((candidate) => candidate.id === presetId) ?? characterPresets[0];
  const evaluation = preset
    ? evaluateDialoguePresetConditions(preset, controller.state, selectedHeroId || null)
    : null;
  const sceneMatches = Boolean(preset?.sceneIds.some((sceneId) => sceneContexts.has(sceneId)));
  const conditionUnmet = [
    ...(evaluation?.unmet ?? []),
    ...(!sceneMatches ? [`контекст реплики не совпадает с экраном ${scene.id}`] : []),
  ];
  const conditionsAvailable = Boolean(evaluation?.available && sceneMatches);
  const effectAlreadyApplied = Boolean(
    preset?.effects.length && controller.appliedDialoguePresetIds.has(preset.id),
  );
  const activeVoice = penisuelaDialogueBank.voices.find((voice) => voice.characterId === characterId);
  const groupedPresets = useMemo(() => groupPresets(characterPresets), [characterPresets]);

  useEffect(() => {
    setCharacterId(characterIds[0] ?? '');
  }, [characterIds]);

  useEffect(() => {
    setPresetId(characterPresets[0]?.id ?? '');
  }, [characterPresets]);

  useEffect(() => {
    setSpokenText(preset?.text ?? '');
    setOverrideConditions(false);
    setConfirmed(false);
    setStatus('');
  }, [preset]);

  const choosePreset = () => {
    if (!preset || !evaluation || (!conditionsAvailable && !overrideConditions) || !confirmed) return;
    const saved = controller.confirmDialoguePreset({
      preset,
      sceneId: scene.id,
      sourceSceneId: preset.sceneIds.find((sceneId) => sceneContexts.has(sceneId)) ?? preset.sceneIds[0],
      text: spokenText,
      conditionsOverridden: !conditionsAvailable && overrideConditions,
    });
    setStatus(saved
      ? 'Реплика и её последствия записаны одной отменяемой командой.'
      : 'Реплика не применена: состояние успело измениться или последствие недоступно.');
    if (saved) setConfirmed(false);
  };

  const copyPreset = async () => {
    try {
      await navigator.clipboard.writeText(spokenText);
      setStatus('Текст реплики скопирован. Состояние сессии не изменено.');
    } catch {
      setStatus('Браузер не дал доступ к буферу обмена. Текст можно выделить вручную.');
    }
  };

  const ignorePreset = () => {
    setConfirmed(false);
    setStatus('Пресет не используется. Никакие последствия не применены.');
  };

  return (
    <section className={styles.section} aria-labelledby="gm-dialogue-heading">
      <div className={styles.sectionHeading}>
        <div><p>Решение всегда принимает мастер</p><h3 id="gm-dialogue-heading">Канонический банк реплик</h3></div>
        <span>{scenePresets.length} / {penisuelaDialogueBank.presets.length}</span>
      </div>

      <label className={styles.confirmationControl}>
        <input
          checked={showAllPresets}
          type="checkbox"
          onChange={(event) => setShowAllPresets(event.target.checked)}
        />
        Весь банк: показать все {penisuelaDialogueBank.presets.length} пресетов, включая пролог «tavern-invitation»
      </label>

      {scenePresets.length && preset ? (
        <>
          <div className={styles.dialogueFilters}>
            <label>
              Активный персонаж
              <select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
                {characterIds.map((id) => (
                  <option key={id} value={id}>{getCharacterName(id)}</option>
                ))}
              </select>
            </label>
            <label>
              Контекстный герой
              <select value={selectedHeroId} onChange={(event) => setSelectedHeroId(event.target.value)}>
                <option value="">Не выбран</option>
                {controller.sessionHeroes.map((hero) => (
                  <option key={hero.id} value={hero.id}>{hero.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label className={styles.fullField}>
            Намерение · тон · реплика
            <select value={preset.id} onChange={(event) => setPresetId(event.target.value)}>
              {groupedPresets.map(([group, presets]) => (
                <optgroup key={group} label={group}>
                  {presets.map((candidate) => {
                    const candidateEvaluation = evaluateDialoguePresetConditions(
                      candidate,
                      controller.state,
                      selectedHeroId || null,
                    );
                    const candidateSceneMatches = candidate.sceneIds.some((sceneId) => sceneContexts.has(sceneId));
                    return (
                      <option key={candidate.id} value={candidate.id}>
                        {candidateEvaluation.available && candidateSceneMatches ? '✓' : '🔒'} {candidate.label}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
          </label>

          <article className={styles.dialogueCard}>
            <p>{getCharacterName(preset.characterId)} · {preset.tone}</p>
            <h4>{preset.label}</h4>
            <div className={styles.dialogueIntent}>
              <strong>Скрытая цель</strong>
              <span>{preset.intent}</span>
            </div>
            <label>
              Произносимый текст — можно пересказать перед подтверждением
              <textarea
                maxLength={2000}
                rows={5}
                value={spokenText}
                onChange={(event) => {
                  setSpokenText(event.target.value);
                  setConfirmed(false);
                }}
              />
            </label>
            <details className={styles.gmNote}>
              <summary>Скрытая заметка мастера</summary>
              <p>{preset.gmNote}</p>
              {activeVoice ? (
                <p><strong>Голос:</strong> {activeVoice.voice} {activeVoice.tempo} Жест: {activeVoice.gesture}</p>
              ) : null}
            </details>
          </article>

          <div className={conditionsAvailable ? styles.conditionReady : styles.conditionLocked}>
            <strong>{conditionsAvailable ? 'Условия выполнены' : 'Реплика заблокирована условиями'}</strong>
            {conditionUnmet.length ? (
              <ul>
                {conditionUnmet.map((requirement) => <li key={requirement}>{requirement}</li>)}
              </ul>
            ) : <span>Состояние сцены соответствует декларативному фильтру.</span>}
          </div>

          {!conditionsAvailable ? (
            <label className={styles.confirmationControl}>
              <input
                checked={overrideConditions}
                type="checkbox"
                onChange={(event) => {
                  setOverrideConditions(event.target.checked);
                  setConfirmed(false);
                }}
              />
              Я как мастер подтверждаю контекст и сознательно разрешаю эту реплику
            </label>
          ) : null}

          <div className={styles.consequenceGrid}>
            <div>
              <strong>Раскрытия после подтверждения</strong>
              {preset.reveals.length ? (
                <ul>{preset.reveals.map((reveal) => <li key={reveal}>{reveal}</li>)}</ul>
              ) : <span>Нет</span>}
            </div>
            <div>
              <strong>Формальные последствия</strong>
              {preset.effects.length ? (
                <ul>{preset.effects.map((effect, index) => <li key={`${effect.type}-${index}`}>{describeDialogueEffect(effect)}</li>)}</ul>
              ) : <span>Нет</span>}
            </div>
          </div>

          {effectAlreadyApplied ? (
            <p className={styles.warning}>Последствия этого пресета уже записаны. Повторное применение заблокировано; сначала отмените исходную команду.</p>
          ) : null}

          <div className={styles.dialogueCommit}>
            <label className={styles.confirmationControl}>
              <input
                checked={confirmed}
                disabled={effectAlreadyApplied || (!conditionsAvailable && !overrideConditions) || !spokenText.trim()}
                type="checkbox"
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              Подтверждаю произносимый текст, раскрытия и перечисленные последствия
            </label>

            <div className={styles.actionRow}>
              <button
                disabled={!confirmed || effectAlreadyApplied || (!conditionsAvailable && !overrideConditions) || !spokenText.trim()}
                type="button"
                onClick={choosePreset}
              >
                Выбрать и применить
              </button>
              <button type="button" onClick={copyPreset}>Скопировать</button>
              <button
                disabled={spokenText === preset.text}
                type="button"
                onClick={() => {
                  setSpokenText(preset.text);
                  setConfirmed(false);
                }}
              >
                Вернуть канон
              </button>
              <button type="button" onClick={ignorePreset}>Не использовать</button>
            </div>
          </div>

          {controller.state.selectedDialoguePreset ? (
            <div className={styles.savedState}>
              <strong>Записано сейчас: {getCharacterName(controller.state.selectedDialoguePreset.speaker)}</strong>
              <span>{controller.state.selectedDialoguePreset.presetId} · сцена {controller.state.selectedDialoguePreset.sceneId}</span>
            </div>
          ) : null}
          <p className={styles.note}>Выбор в списке и редактирование текста сами по себе не меняют сессию. gmNote существует только внутри открытого мастерского drawer.</p>
        </>
      ) : <p className={styles.emptyState}>Для этой сцены нет опубликованных пресетов.</p>}
      <p className={styles.liveStatus} aria-live="polite">{status}</p>
    </section>
  );
}
