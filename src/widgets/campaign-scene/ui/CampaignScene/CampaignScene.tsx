import {SceneCheckpointContext} from '../../../../features/navigate-campaign-scene/model/sceneCheckpointContext';
import {CampaignStepHistoryContext} from '../../../../features/navigate-campaign-scene/model/campaignStepHistoryContext';
import partyRewards from '../../../../../content/party-rewards.json';
import type {CSSProperties, ReactNode} from 'react';
import {useContext, useEffect, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';
import {useNavigate} from 'react-router-dom';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import {InspectableArtifact} from '../../../../entities/campaign-session/ui/InspectableArtifact/InspectableArtifact';
import {InspectableArtifactDialog} from '../../../../entities/campaign-session/ui/InspectableArtifactDialog/InspectableArtifactDialog';
import {useCampaignScene} from '../../../../features/navigate-campaign-scene/model/useCampaignScene';
import {
  SceneMasterControl,
  type SceneMasterAction,
} from '../../../../features/navigate-campaign-scene/ui/SceneMasterControl/SceneMasterControl';
import {SceneHotspotLayer} from '../../../../features/navigate-campaign-scene/ui/SceneHotspotLayer/SceneHotspotLayer';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene/ui/SceneTextPanel/SceneTextPanel';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './CampaignScene.module.css';
import type {FocusedArtwork} from '../../../../shared/lib/image/focusedArtwork';
import {ArtworkFocus} from '../../../../shared/ui/ArtworkFocus/ArtworkFocus';
import type {GallerySessionController} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {PartyRestDialog} from '../../../../features/navigate-campaign-scene/ui/PartyRestDialog/PartyRestDialog';
import {olvaQuest} from '../../../../entities/campaign-session/model/olvaQuest';
import {CombatSkillVideoOverlay} from '../CombatSkillVideoOverlay/CombatSkillVideoOverlay';
import {penisuelaGalleryGameplay, penisuelaSessionPreview} from '../../../../entities/campaign-session/model/playableData';
import {useSceneSoundtrack} from '../../../../features/navigate-campaign-scene/model/campaignSoundtrack';

const restVideoCue = {id: olvaQuest.reward.restVideo.id, title: olvaQuest.reward.restVideo.title,
  videoSrc: resolveAsset(olvaQuest.reward.restVideo.source), posterSrc: resolveAsset(olvaQuest.reward.restVideo.poster)};

interface CampaignSceneProps {
  itemController?: Pick<GallerySessionController, 'state' | 'sessionHeroes' | 'useOlvaTimeout' | 'canUndoOlvaRest' | 'undoLastAction'>;
  inventoryArtwork?: FocusedArtwork;
  campaignId: string;
  campaignScenes: CampaignSessionScene[];
  backHref?: string;
  externalRevealedIds?: string[];
  externallyManagedIds?: string[];
  gameMasterConsole?: ReactNode;
  interactiveContent?: ReactNode;
  masterActions?: SceneMasterAction[];
  masterActionsLabel?: string;
  masterContent?: ReactNode;
  onMasterSceneRestart?: () => void;
  onMasterStepBack?: () => void;
  onInspectableFound?: (artifactId: string) => void;
  scene: CampaignSessionScene;
  soundtrackSceneId?: string;
  soundtrackEncounterId?: string;
}

export function CampaignScene({
  itemController,
  inventoryArtwork,
  campaignId,
  campaignScenes,
  backHref,
  externalRevealedIds = [],
  externallyManagedIds = [],
  gameMasterConsole,
  interactiveContent,
  masterActions,
  masterActionsLabel,
  masterContent,
  onMasterSceneRestart,
  onMasterStepBack,
  onInspectableFound,
  scene,
  soundtrackSceneId,
  soundtrackEncounterId,
}: CampaignSceneProps) {
  const restartBlock = useContext(SceneCheckpointContext);
  const stepHistory = useContext(CampaignStepHistoryContext);
  const navigate = useNavigate();
  useSceneSoundtrack(penisuelaGalleryGameplay, soundtrackSceneId ?? scene.id, soundtrackEncounterId ?? itemController?.state.combat?.encounterId, itemController?.state.flags, penisuelaSessionPreview.sceneBlocks);
  const {
    introRead,
    revealedInspectableIds,
    inventorySlots,
    viewedInspectableIds,
    selectedInspectableId,
    exitAvailable,
    completeIntro,
    restartScene,
    findInspectable,
    openInspectable,
    closeInspectable,
  } = useCampaignScene(campaignId, scene, campaignScenes, externalRevealedIds, externallyManagedIds);
  const [inventoryPage, setInventoryPage] = useState(0);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [restVideoOpen, setRestVideoOpen] = useState(false);
  const [lastFoundId, setLastFoundId] = useState<string | null>(null);
  const [searchHotspotsArmed, setSearchHotspotsArmed] = useState(true);
  const undoSceneStep = itemController?.canUndoOlvaRest
    ? () => {itemController.undoLastAction();} : onMasterStepBack;
  const inventoryArtifacts = useMemo(
    () => {
      const sceneArtifacts = campaignScenes.flatMap((item) => item.inspectables);
      return [...sceneArtifacts, ...partyRewards.filter((reward) => !sceneArtifacts.some((item) => item.id === reward.id)).map((reward) => ({
        id: reward.id, label: reward.name, visualKind: reward.visualKind as 'grey-wiese-perfume',
        locationHint: 'Награда партии', summary: reward.description, revealText: reward.description,
        useText: reward.effect, order: 1,
      }))];
    },
    [campaignScenes],
  );
  const slottedArtifacts = useMemo(
    () => inventorySlots.map((id) => inventoryArtifacts.find((artifact) => artifact.id === id)),
    [inventoryArtifacts, inventorySlots],
  );
  const foundArtifacts = slottedArtifacts.filter((artifact) => artifact !== undefined);
  const inventoryPageCount = Math.max(1, Math.ceil(slottedArtifacts.length / 8));
  const visibleInventoryPage = Math.min(inventoryPage, inventoryPageCount - 1);
  const hasInspectables = scene.inspectables.length > 0;
  const storyPending = !hasInspectables || !introRead;
  const unviewedCount = foundArtifacts.filter((artifact) => !viewedInspectableIds.includes(artifact.id)).length;
  const selectedArtifact = inventoryArtifacts.find((artifact) => artifact.id === selectedInspectableId);
  const sceneStyle = {
    '--inventory-panel': `url("${resolveAsset('assets/concepts/campaigns/penisuela/ui/inventory-panel-alpha-v2.png')}")`,
    '--artifact-panel-frame': `url("${resolveAsset('assets/concepts/campaigns/penisuela/ui/universal-panel-frame.png')}")`,
  } as CSSProperties;
  const preservesFullBackground = scene.backgroundLayout === 'contain'
    || scene.backgroundLayout === 'portrait';

  useEffect(() => {
    if (!selectedInspectableId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeInspectable();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeInspectable, selectedInspectableId]);

  useEffect(() => {
    if (!lastFoundId || selectedInspectableId) return;
    const timeoutId = window.setTimeout(() => setLastFoundId(null), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [lastFoundId, selectedInspectableId]);

  useEffect(() => {
    if (searchHotspotsArmed) return;
    const armHotspots = () => setSearchHotspotsArmed(true);
    window.addEventListener('pointermove', armHotspots, {once: true});
    return () => window.removeEventListener('pointermove', armHotspots);
  }, [searchHotspotsArmed]);

  const findArtifact = (artifactId: string) => {
    onInspectableFound?.(artifactId);
    findInspectable(artifactId);
    setLastFoundId(artifactId);
  };

  const lastFoundArtifact = scene.inspectables.find((artifact) => artifact.id === lastFoundId);
  const restartCurrentScene = () => {
    restartScene();
    onMasterSceneRestart?.();
  };
  const exitReady = Boolean(scene.exit && (hasInspectables ? exitAvailable : introRead));

  return (
    <section className={styles.scene} style={sceneStyle} aria-label={scene.title}>
      <p className={styles.mobileNotice} role="note">
        <strong>Поверните экран</strong>
        <span>Сцена рассчитана на общий экран в альбомной ориентации.</span>
      </p>
      <div className={styles.canvas}>
        <div className={styles.stage}>
          {preservesFullBackground ? (
            <img className={styles.backgroundBackdrop} src={resolveAsset(scene.background)} alt="" aria-hidden="true" />
          ) : null}
          <img
            className={`${styles.background} ${preservesFullBackground ? styles.containedBackground : ''}`}
            src={resolveAsset(scene.background)}
            alt={scene.alt}
          />
          <div className={styles.stageShade} aria-hidden="true" />
        </div>
        <SceneMasterControl
          actions={[
            ...(!interactiveContent && !introRead ? [{id: 'begin-scene', label: 'Начать осмотр', onSelect: completeIntro}] : []),
            ...(masterActions ?? []),
          ]}
          actionsLabel={masterActionsLabel}
          backHref={backHref}
          masterContent={masterContent}
          onRestartScene={restartBlock ?? restartCurrentScene}
          onStepBack={selectedArtifact ? () => {
            closeInspectable();
            if (lastFoundId === selectedArtifact.id) {
              stepHistory?.stepBack(undoSceneStep);
              setLastFoundId(null);
            }
          } : inventoryOpen ? () => setInventoryOpen(false)
            : stepHistory ? () => {if (!stepHistory.stepBack(undoSceneStep) && backHref) navigate(backHref);}
              : undoSceneStep}
          sceneTitle={scene.title}
        />
        {gameMasterConsole}

        {interactiveContent ? interactiveContent : storyPending ? (
          <SceneTextPanel
            appearance="narration"

            readAloud={scene.readAloud}
            resetKey={`${scene.id}:introduction`}
          />
        ) : (
          <>
            <div
              aria-label="Осмотр номера"
              className={styles.searchField}
              data-hover-armed={searchHotspotsArmed}
            >
              {scene.inspectables
                .filter((artifact) => !revealedInspectableIds.includes(artifact.id))
                .map((artifact) => (
                  <InspectableArtifact
                    key={artifact.id}
                    artifact={artifact}
                    presentation="search"
                    onFind={() => findArtifact(artifact.id)}
                    onOpen={() => undefined}
                  />
                ))}
            </div>

            <SceneTextPanel
              appearance="narration"

              onVisibilityChange={(visible) => {
                if (!visible) setSearchHotspotsArmed(false);
              }}
              readAloud={`${scene.readAloud}${scene.roomLegend ? ` ${scene.roomLegend}` : ''}`}
              resetKey={`${scene.id}:search`}
            />

            {lastFoundArtifact && !selectedArtifact && !inventoryOpen ? (
              <p className={styles.foundNotice} role="status">Теперь у вас: {lastFoundArtifact.label}</p>
            ) : null}

          </>
        )}

        {!interactiveContent && exitReady && scene.exit ? (
          <SceneHotspotLayer
            ariaLabel="Выход из сцены"
            hotspots={[{
              id: `exit-${scene.id}`,
              label: scene.exit.label,
              href: `/campaign/${campaignId}/play/${scene.exit.nextSceneId}`,
              position: {x: 42.3, y: 20, width: 16, height: 36},
            }]}
          />
        ) : null}

        {!inventoryOpen ? (
          <button
            className={`${styles.inventoryButton} ${unviewedCount ? styles.inventoryHasItems : ''}`}
            type="button"
            onClick={() => setInventoryOpen(true)}
            aria-expanded="false"
            aria-controls="scene-inventory"
            aria-label={unviewedCount
              ? `Открыть инвентарь: непросмотренных предметов ${unviewedCount}`
              : 'Открыть инвентарь'}
          >
            {inventoryArtwork ? <ArtworkFocus artwork={inventoryArtwork} /> : <img src={resolveAsset('assets/concepts/campaigns/penisuela/ui/inventory-bag-icon.png')} alt="" />}
          </button>
        ) : null}

        {inventoryOpen ? (
          <aside className={styles.inventory} id="scene-inventory" aria-label="Инвентарь героев">
            <div className={styles.inventoryHeading}>
              <p>Инвентарь</p>
              <button type="button" onClick={() => setInventoryOpen(false)} aria-label="Закрыть инвентарь">×</button>
            </div>
            {foundArtifacts.length ? (
              <div className={styles.inventoryItems}>
                {slottedArtifacts.slice(visibleInventoryPage * 8, (visibleInventoryPage + 1) * 8).map((artifact, index) => artifact ? (
                  <InspectableArtifact
                    key={artifact.id}
                    artifact={artifact}
                    presentation="inventory"
                    inventorySlot={index + 1}
                    onOpen={() => openInspectable(artifact.id)}
                  />
                ) : null)}
              </div>
            ) : null}
            {inventoryPageCount > 1 ? (
              <nav className={styles.inventoryPagination} aria-label="Страницы инвентаря">
                <button type="button" aria-label="Предыдущая страница инвентаря" disabled={visibleInventoryPage === 0} onClick={() => setInventoryPage(visibleInventoryPage - 1)}>←</button>
                <span>{visibleInventoryPage + 1} / {inventoryPageCount}</span>
                <button type="button" aria-label="Следующая страница инвентаря" disabled={visibleInventoryPage === inventoryPageCount - 1} onClick={() => setInventoryPage(visibleInventoryPage + 1)}>→</button>
              </nav>
            ) : null}
          </aside>
        ) : null}

        <p className={styles.liveRegion} aria-live="polite">
          {lastFoundArtifact ? `Найдено: ${lastFoundArtifact.label}. Предмет открыт и теперь хранится среди ваших находок.` : ''}
        </p>
      </div>

      {restVideoOpen ? createPortal(<CombatSkillVideoOverlay cue={restVideoCue} playbackRate={1} fit="contain"
        ariaLabel="Отдых героев в спа" onComplete={() => setRestVideoOpen(false)} />, document.body) : null}
      {selectedArtifact?.id === olvaQuest.reward.id && itemController ? (
        <PartyRestDialog
          heroes={itemController.sessionHeroes.map(hero => ({...hero,
            token: penisuelaSessionPreview.party.find(member => member.characterId === hero.id)?.token,
          }))}
          blockedReason={itemController.state.combat ? 'Во время боя отдохнуть нельзя. Карточка остаётся в сумке.'
            : !itemController.state.inventory.includes(olvaQuest.reward.id) || (itemController.state.inventoryState[olvaQuest.reward.id]?.charges ?? 0) < 1
              ? 'Эта карточка уже использована. Лечение недоступно.' : undefined}
          onClose={closeInspectable} onConfirm={() => {
            const applied = itemController.useOlvaTimeout();
            if (applied) {setInventoryOpen(false);setRestVideoOpen(true);}
            return applied;
          }}
        />
      ) : selectedArtifact ? (
        <InspectableArtifactDialog artifact={selectedArtifact} onClose={closeInspectable} />
      ) : null}
    </section>
  );
}
