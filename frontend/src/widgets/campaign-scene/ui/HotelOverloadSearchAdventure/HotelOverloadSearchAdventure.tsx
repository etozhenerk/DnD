import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  penisuelaGalleryGameplay,
  penisuelaGalleryHeroes,
} from '../../../../entities/campaign-session/model/playableData';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import {isGalleryStoryConditionMet} from '../../../../entities/campaign-session/model/galleryGameplay';
import {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {
  SceneHotspotLayer,
  type SceneHotspot,
} from '../../../../features/navigate-campaign-scene/ui/SceneHotspotLayer/SceneHotspotLayer';
import {CampaignScene} from '../CampaignScene/CampaignScene';
import {GameMasterConsole} from '../GameMasterConsole/GameMasterConsole';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './HotelOverloadSearchAdventure.module.css';

interface HotelOverloadSearchAdventureProps {
  campaignId: string;
  campaignScenes: CampaignSessionScene[];
  scene: CampaignSessionScene;
}

const inspectableIds = new Set([
  'overload-console',
  'journey-letter',
  'anonymous-bracelets',
  'egorik-recording',
]);

const egorikRecordingInspectableId = 'egorik-recording';
const egorikRecordingItemId = 'recording-for-egorik';
function getInventoryItemId(artifactId: string) {
  return artifactId === egorikRecordingInspectableId ? egorikRecordingItemId : artifactId;
}

export function HotelOverloadSearchAdventure({
  campaignId,
  campaignScenes,
  scene,
}: HotelOverloadSearchAdventureProps) {
  const navigate = useNavigate();
  const controller = useGallerySession(
    penisuelaGalleryGameplay,
    penisuelaGalleryHeroes,
    campaignScenes.map((item) => item.id),
    {sceneScopeId: 'hotel-overload-search'},
  );
  const {state} = controller;
  const pendingDiscoveryIds = useRef(new Set<string>());
  const [doorBlockedNotice, setDoorBlockedNotice] = useState(false);
  const galleryExitAction = penisuelaGalleryGameplay.storyScenes
    .find((item) => item.id === scene.id)?.actions
    .find((action) => action.id === 'continue-1-hotel-gallery');
  const correctedCommandIds = useMemo(() => new Set(
    state.events
      .filter((event) => event.type === 'action-corrected')
      .map((event) => event.correctedCommandId),
  ), [state.events]);
  const transitionResolved = useMemo(() => state.events.some((event) => (
    event.type === 'story-action-resolved'
    && event.sceneId === scene.id
    && event.actionId === 'continue-1-hotel-gallery'
    && !correctedCommandIds.has(event.commandId)
  )), [correctedCommandIds, scene.id, state.events]);
  const galleryRequirementsReady = Boolean(galleryExitAction)
    && isGalleryStoryConditionMet(galleryExitAction?.conditions, state);
  const missingExitItems = (galleryExitAction?.conditions?.allItems ?? [])
    .filter((id) => !state.inventory.includes(id))
    .map((id) => scene.inspectables.find((artifact) => artifact.id === id)?.label ?? id);
  const doorBlockedText = `Дверь заперта. Сначала заберите: ${missingExitItems.join(', ')}.`;

  useEffect(() => {
    for (const artifactId of pendingDiscoveryIds.current) {
      if (!state.inventory.includes(getInventoryItemId(artifactId))) {
        pendingDiscoveryIds.current.delete(artifactId);
      }
    }
  }, [state.inventory]);

  useEffect(() => {
    if (!doorBlockedNotice) return;
    const timeoutId = window.setTimeout(() => setDoorBlockedNotice(false), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [doorBlockedNotice]);

  const searchScene = useMemo<CampaignSessionScene>(() => ({
    ...scene,
    title: 'Разгромленный номер',
    background: 'assets/concepts/campaigns/penisuela/scenes/hotel-overload-search-pov.png',
    alt: 'Обратный вид разгромленного гостиничного номера: в комнате видны письмо, режиссёрский пульт, пять золотых браслетов, повреждённая запись и закрытая центральная дверь.',
    readAloud: scene.roomLegend ?? scene.readAloud,
    roomLegend: undefined,
    inspectables: scene.inspectables.map((artifact) => ({
      ...artifact,
      hotspotPosition: artifact.id === 'overload-console'
        ? {x: 34, y: 66}
        : artifact.id === 'journey-letter'
          ? {x: 0, y: 48}
          : artifact.id === 'anonymous-bracelets'
            ? {x: 75, y: 60}
            : {x: 59, y: 20},
    })),
    exit: null,
  }), [scene]);

  const acquiredInspectableIds = searchScene.inspectables
    .filter((item) => state.inventory.includes(getInventoryItemId(item.id)))
    .map((item) => item.id);
  const externallyManagedIds = useMemo(() => {
    const managedIds = new Set([
      ...controller.managedInspectableIds,
      ...inspectableIds,
    ]);
    if (managedIds.has(egorikRecordingItemId)) managedIds.add(egorikRecordingInspectableId);
    return [...managedIds];
  }, [controller.managedInspectableIds]);

  const recordInspectableDiscovery = useCallback((artifactId: string) => {
    const inventoryItemId = getInventoryItemId(artifactId);
    if (
      !inspectableIds.has(artifactId)
      || state.inventory.includes(inventoryItemId)
      || pendingDiscoveryIds.current.has(artifactId)
    ) return;

    pendingDiscoveryIds.current.add(artifactId);
    const committed = controller.commitStoryOutcome({inventory: {acquire: [inventoryItemId]}});
    if (!committed) pendingDiscoveryIds.current.delete(artifactId);
  }, [controller, state.inventory]);

  const resolveAction = (actionId: string) => controller.commitStoryAction(scene.id, actionId);

  const goToGallery = () => {
    if (!galleryRequirementsReady) {
      setDoorBlockedNotice(true);
      return;
    }
    setDoorBlockedNotice(false);
    if (!transitionResolved && !resolveAction('continue-1-hotel-gallery')) return;
    navigate(`/campaign/${campaignId}/play/hotel-gallery`);
  };
  const doorHotspots: SceneHotspot[] = [{
    id: 'hotel-gallery-door',
    label: galleryRequirementsReady ? 'Выйти в гостиничную галерею' : 'Дверь заперта',
    onSelect: goToGallery,
    position: {x: 43.2, y: 9, width: 12.6, height: 41},
  }];

  return (
    <CampaignScene
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
      campaignId={campaignId}
      campaignScenes={campaignScenes}
      backHref={`/campaign/${campaignId}/play/hotel-overload`}
      externalRevealedIds={acquiredInspectableIds}
      externallyManagedIds={externallyManagedIds}
      gameMasterConsole={(
        <>
          <span className={styles.styleScope} aria-hidden="true" />
          <GameMasterConsole
            campaignScenes={campaignScenes}
            controller={controller}
            definition={penisuelaGalleryGameplay}
            scene={searchScene}
          />
          <SceneHotspotLayer
            ariaLabel="Дверь из разгромленного номера"
            background={{src: resolveAsset(searchScene.background), fit: 'cover'}}
            hotspots={doorHotspots}
          />
          {doorBlockedNotice && !galleryRequirementsReady ? (
            <p className={styles.lockedNotice} role="status">
              {doorBlockedText}
            </p>
          ) : null}
        </>
      )}
      onInspectableFound={recordInspectableDiscovery}
      onMasterSceneRestart={() => setDoorBlockedNotice(false)}
      scene={searchScene}
    />
  );
}
