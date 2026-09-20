import {useEffect, useState} from 'react';
import type {GalleryGameplayDefinition} from '../../../../entities/campaign-session/model/galleryGameplay';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import {gmConsoleMetadata, getGmLabels} from '../../model/gmConsolePresentation';
import type {GallerySessionController} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import styles from './GameMasterConsole.module.css';

interface Props {controller: GallerySessionController; definition: GalleryGameplayDefinition; campaignScenes: CampaignSessionScene[]}
export function WorldStateEditor({controller, definition, campaignScenes}: Props) {
  const {state} = controller;
  const labels = getGmLabels(campaignScenes, state, definition);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const undoRevision = state.events.filter(event => event.type === 'action-corrected').length;
  useEffect(() => setStatus(''), [undoRevision]);
  const flags = Object.entries(state.flags).filter(([flag]) => `${labels[flag] ?? ''} ${flag}`.toLowerCase().includes(search.toLowerCase()));
  return <section className={styles.section} aria-labelledby="gm-world-heading">
    <div className={styles.sectionHeading}><div><p>Обновляется по ходу игры</p><h3 id="gm-world-heading">Прогресс истории</h3></div><span>{state.counters.doom ?? 0} / 5 огней</span></div>
    <p className={styles.note}>Огни загораются после сюжетных событий. Здесь видно, что группа уже прошла. Для повторного прохождения блока используйте «В начало сцены» в короне.</p>
    <ol className={styles.progressList}>
      {(definition.doomMilestones ?? []).map(milestone => <li key={milestone.id} data-complete={Boolean(state.flags[milestone.flag])}>
        <span aria-hidden="true">{state.flags[milestone.flag] ? '✓' : '○'}</span>
        <div><strong>{milestone.label}</strong><small>{labels[milestone.sceneId] ?? milestone.sceneId}</small></div>
        <span>{state.flags[milestone.flag] ? 'Готово' : 'Впереди'}</span>
      </li>)}
    </ol>
    <details className={styles.disclosure}><summary>Пропуска, награды и ключевые решения</summary>
      <ul className={styles.progressList}>{Object.entries(gmConsoleMetadata.flags).map(([flag, entry]) => <li key={flag}>
        <div><strong>{entry.label}</strong><small>{entry.description}</small></div><span>{state.flags[flag] ? 'Да' : 'Нет'}</span>
      </li>)}</ul>
    </details>
    <details className={styles.disclosure}><summary>Служебные отметки — исправить вручную</summary>
      <p className={styles.note}>Отметки хранят выполненные условия сюжета. Их изменение не выдаёт предметы и не воспроизводит пропущенные действия. Используйте этот раздел, только если нужно исправить конкретную отметку; исправление можно отменить внизу панели.</p>
      <label>Найти отметку<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Название или служебный ключ"/></label>
      <ul className={styles.flagList}>{flags.slice(0, 80).map(([flag,value]) => <li key={flag}>
        <span>{labels[flag] ?? flag}{labels[flag] ? <small className={styles.fieldHint}>{gmConsoleMetadata.flags[flag]?.description ?? flag}</small> : null}</span>
        <button type="button" aria-pressed={value} aria-label={`${labels[flag] ?? flag}: ${value ? 'включено' : 'выключено'}`} className={value ? styles.flagOn : undefined}
          onClick={() => setStatus(controller.manualSetFlag(flag, !value) ? 'Отметка изменена.' : 'Отметка не изменена.')}>{value ? 'Да' : 'Нет'}</button>
      </li>)}</ul>
      {!flags.length ? <p className={styles.note}>{search ? 'Совпадений нет.' : 'Отметки появятся после первых сюжетных решений.'}</p> : flags.length > 80 ? <p className={styles.note}>Показаны первые 80 отметок. Уточните поиск.</p> : null}
    </details>
    <p className={styles.liveStatus} role="status">{status}</p>
  </section>;
}
