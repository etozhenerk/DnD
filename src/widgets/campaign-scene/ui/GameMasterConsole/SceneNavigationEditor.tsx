import {useEffect, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {penisuelaSessionPreview, penisuelaGalleryGameplay} from '../../../../entities/campaign-session/model/playableData';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import type {GallerySessionController} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './GameMasterConsole.module.css';

interface Props {scene: CampaignSessionScene; scenes: CampaignSessionScene[]; controller: GallerySessionController; onClose: () => void}
export function SceneNavigationEditor({scene, scenes, controller, onClose}: Props) {
  const availableScenes = scenes.filter(item => !Object.hasOwn(penisuelaGalleryGameplay.storyTruth?.compatibilityAliases ?? {}, item.id));
  const blocks = penisuelaSessionPreview.sceneBlocks ?? [];
  const [draft, setDraft] = useState(scene.id);
  const [status, setStatus] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const selected = scenes.find(item => item.id === draft) ?? scene;
  const block = blocks.find(item => item.sceneIds.includes(scene.id));
  useEffect(() => setDraft(scene.id), [scene.id]);
  return <section className={styles.section} aria-label="Навигация по кампании">
    <div className={styles.sectionHeading}><div><p>Сейчас на экране · {block?.title}</p><h3>{scene.title}</h3></div></div>
    <p className={styles.note}>Сюжетные решения и проверки открываются короной на сцене. Здесь можно вручную показать другой кадр. Возврат к началу сцены находится в короне.</p>
    <div className={styles.sceneSummary}>
      <label>Показать экран
        <select value={draft} onChange={event => {setDraft(event.target.value); setStatus('');}}>
          {blocks.map(group => <optgroup key={group.id} label={group.title}>
            {group.sceneIds.flatMap(id => availableScenes.filter(item => item.id === id)).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
          </optgroup>)}
          {availableScenes.filter(item => !blocks.some(group => group.sceneIds.includes(item.id))).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>
      <img className={styles.sceneThumbnail} src={resolveAsset(selected.background)} alt={`Предпросмотр: ${selected.title}`} />
      <p className={styles.note}>Ручной переход сохраняет текущий прогресс: награды и выполненные условия не добавляются. Отмена внизу панели вернёт предыдущий экран.</p>
      {controller.state.combat ? <p className={styles.warning}>Сначала завершите или отмените бой. Перенос активного боя на другой экран недоступен.</p> : null}
      <button disabled={draft === scene.id || Boolean(controller.state.combat)} type="button" onClick={() => {
        if (!controller.manualSetActiveScene(draft, scene.id, /^\?view=(stas|dancers|device)$/.test(location.search) ? location.search : '')) {setStatus('Переход сейчас недоступен.'); return;}
        onClose(); navigate(`/campaign/${controller.state.campaignId}/play/${draft}`);
      }}>Показать выбранный экран</button>
    </div>
    <p className={styles.liveStatus} role="status">{status}</p>
  </section>;
}
