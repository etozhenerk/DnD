import type {GalleryEvent} from '../../../../entities/campaign-session/model/gallerySession';
import {useMemo} from 'react';
import type {GallerySessionController} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {describeGmEvent} from '../../model/gmConsolePresentation';
import styles from './GameMasterConsole.module.css';

interface Props {controller: GallerySessionController; labels: Record<string,string>}
export function SessionJournal({controller, labels}: Props) {
  const {events} = controller.state;
  const commands = useMemo(() => {
    const corrected = new Set(events.flatMap(event => event.type === 'action-corrected' ? [event.correctedCommandId] : []));
    const groups = new Map<string, GalleryEvent[]>();
    for (const event of events) {
      const entries = groups.get(event.commandId) ?? [];
      entries.push(event); groups.set(event.commandId, entries);
    }
    return [...groups.entries()].reverse().slice(0,40).map(([id, entries]) => ({
      id, corrected: corrected.has(id), entries,
      representative: entries.find(event => event.type === 'manual-adjustment')
        ?? entries.find(event => event.type === 'story-action-resolved') ?? entries.at(-1),
    }));
  }, [events]);
  return <section className={styles.section} aria-labelledby="gm-journal-heading">
    <div className={styles.sectionHeading}><div><p>Последние 40 действий</p><h3 id="gm-journal-heading">История прохождения</h3></div></div>
    <p className={styles.note}>Свежие действия сверху. Кнопка внизу отменяет последнее действие вместе с его последствиями. Отменённые записи остаются в истории.</p>
    <ol className={styles.journalList}>{commands.map(command => <li key={command.id} className={command.corrected ? styles.correctedEvent : undefined}>
      <span>{command.corrected ? 'Отменено' : command.representative?.type === 'manual-adjustment' ? 'Правка мастера' : 'Игра'}</span>
      <strong>{describeGmEvent(command.representative, labels)}</strong>
      <details className={styles.technicalEntry}><summary>Подробности записи</summary><pre>{JSON.stringify(command.entries, null, 2)}</pre></details>
    </li>)}</ol>
    {!commands.length ? <p className={styles.emptyState}>Действий пока нет.</p> : null}
  </section>;
}
