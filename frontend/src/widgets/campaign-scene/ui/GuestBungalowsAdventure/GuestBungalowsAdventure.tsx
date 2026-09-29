import {useEffect, useMemo, useState} from 'react';
import {Navigate, useNavigate} from 'react-router-dom';
import {
  penisuelaGalleryGameplay,
  penisuelaGalleryHeroes,
} from '../../../../entities/campaign-session/model/playableData';
import {
  isGalleryStoryConditionMet,
  type GalleryStoryActionDefinition,
} from '../../../../entities/campaign-session/model/galleryGameplay';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import {canEnterOlvaConsultation} from '../../../../entities/campaign-session/model/olvaQuest';
import {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {
  SceneHotspotLayer,
  type SceneHotspot,
} from '../../../../features/navigate-campaign-scene/ui/SceneHotspotLayer/SceneHotspotLayer';
import type {SceneMasterAction} from '../../../../features/navigate-campaign-scene/ui/SceneMasterControl/SceneMasterControl';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene/ui/SceneTextPanel/SceneTextPanel';
import {SceneReturnButton} from '../../../../features/navigate-campaign-scene/ui/SceneReturnButton/SceneReturnButton';
import {CampaignScene} from '../CampaignScene/CampaignScene';
import {GameMasterConsole} from '../GameMasterConsole/GameMasterConsole';
import {EgorikBungalowAdventure} from './EgorikBungalowAdventure';
import styles from './GuestBungalowsAdventure.module.css';

interface GuestBungalowsAdventureProps {
  campaignId: string;
  campaignScenes: CampaignSessionScene[];
  scene: CampaignSessionScene;
}

type AutomaticStoryAction = Extract<GalleryStoryActionDefinition, {kind: 'automatic'}>;

interface PendingTransition {
  actionId: string;
  nextSceneId: string;
  sceneId: string;
}

const hubSceneId = 'guest-bungalows';
const courtyardSceneId = 'bungalow-courtyard';
const handoffSceneId = 'olva-passes-handoff';
const egorikSceneId = 'egorik-bungalow-reveal';
const accessFlagId = 'olva-bungalow-access-issued';
const accessItemId = 'guest-bungalow-pass';

export const guestBungalowsAdventureSceneIds = new Set([
  hubSceneId,
  courtyardSceneId,
  handoffSceneId,
  egorikSceneId,
]);

function findAutomaticAction(
  actions: GalleryStoryActionDefinition[],
  actionId: string | null,
  fallbackNextSceneId: string,
) {
  const action = (actionId ? actions.find((candidate) => candidate.id === actionId) : undefined)
    ?? actions.find((candidate) => candidate.nextSceneId === fallbackNextSceneId);
  return action?.kind === 'automatic' ? action : undefined;
}

export function GuestBungalowsAdventure({
  campaignId,
  campaignScenes,
  scene,
}: GuestBungalowsAdventureProps) {
  const navigate = useNavigate();
  const storyScene = penisuelaGalleryGameplay.storyScenes.find((candidate) => candidate.id === scene.id);
  const controller = useGallerySession(
    penisuelaGalleryGameplay,
    penisuelaGalleryHeroes,
    campaignScenes.map((item) => item.id),
    {sceneScopeId: scene.id},
  );
  const {state} = controller;
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<PendingTransition | null>(null);
  const acquiredInspectableIds = state.inventory;
  const correctedCommandIds = useMemo(() => new Set(
    state.events
      .filter((event) => event.type === 'action-corrected')
      .map((event) => event.correctedCommandId),
  ), [state.events]);
  const resolvedActionIds = useMemo(() => new Set(
    state.events.flatMap((event) => (
      event.type === 'story-action-resolved'
      && event.sceneId === scene.id
      && !correctedCommandIds.has(event.commandId)
        ? [event.actionId]
        : []
    )),
  ), [correctedCommandIds, scene.id, state.events]);
  const accessGranted = Boolean(state.flags[accessFlagId]) || state.inventory.includes(accessItemId);
  const hubHref = `/campaign/${campaignId}/play/${hubSceneId}`;
  const courtyardHref = `/campaign/${campaignId}/play/${courtyardSceneId}`;
  const handoffHref = `/campaign/${campaignId}/play/${handoffSceneId}`;
  const egorikHref = `/campaign/${campaignId}/play/${egorikSceneId}`;

  useEffect(() => {
    if (!accessBlocked) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccessBlocked(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [accessBlocked]);

  useEffect(() => {
    if (
      !pendingTransition
      || state.lastStoryAction?.sceneId !== pendingTransition.sceneId
      || state.lastStoryAction.actionId !== pendingTransition.actionId
    ) return;

    const nextSceneId = pendingTransition.nextSceneId;
    setPendingTransition(null);
    navigate(`/campaign/${campaignId}/play/${nextSceneId}`);
  }, [campaignId, navigate, pendingTransition, state.lastStoryAction]);

  const commitTransition = (action: AutomaticStoryAction | undefined, fallbackHref: string) => {
    if (!action) {
      navigate(fallbackHref);
      return;
    }
    if (!isGalleryStoryConditionMet(action.conditions, state)) return;
    if (resolvedActionIds.has(action.id)) {
      navigate(`/campaign/${campaignId}/play/${action.nextSceneId}`);
      return;
    }
    if (controller.commitStoryAction(scene.id, action.id)) {
      setPendingTransition({
        actionId: action.id,
        nextSceneId: action.nextSceneId,
        sceneId: scene.id,
      });
    }
  };

  const gameMasterConsole = (
    <GameMasterConsole
      campaignScenes={campaignScenes}
      controller={controller}
      definition={penisuelaGalleryGameplay}
      scene={scene}
    />
  );

  if (scene.id === egorikSceneId) {
    if (!accessGranted) return <Navigate replace to={hubHref} />;

    return (
      <EgorikBungalowAdventure
        campaignId={campaignId}
        campaignScenes={campaignScenes}
        scene={scene}
        controller={controller}
      />
    );
  }

  if (scene.id === handoffSceneId && !accessGranted) {
    return <Navigate replace to={accessGranted ? hubHref : courtyardHref} />;
  }

  if (scene.id === hubSceneId) {
    const actions = storyScene?.actions ?? [];
    const olvaAction = findAutomaticAction(actions, null, courtyardSceneId);
    const egorikAction = findAutomaticAction(actions, null, egorikSceneId);
    const hotspots: SceneHotspot[] = [
      {
        id: 'guest-bungalows-olva-path',
        label: 'Подойти к Оливии',
        onSelect: () => commitTransition(olvaAction, courtyardHref),
        position: {x: 3, y: 9, width: 43, height: 66},
      },
      {
        id: 'guest-bungalows-egorik-path',
        label: accessGranted ? 'Идти к Егорику' : 'Проверить закрытый путь к Егорику',
        onSelect: () => {
          if (!accessGranted) {
            setAccessBlocked(true);
            return;
          }
          if (egorikAction && !isGalleryStoryConditionMet(egorikAction.conditions, state)) {
            navigate(egorikHref);
            return;
          }
          commitTransition(egorikAction, egorikHref);
        },
        position: {x: 55, y: 9, width: 42, height: 66},
      },
    ];

    return (
      <CampaignScene
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
        campaignId={campaignId}
        campaignScenes={campaignScenes}
        backHref={`/campaign/${campaignId}/play/closed-bar`}
        masterActions={[{id: 'return-to-bar', label: 'Вернуться в бар', href: `/campaign/${campaignId}/play/closed-bar`}]}
        onMasterStepBack={accessBlocked ? () => setAccessBlocked(false) : undefined}
        gameMasterConsole={gameMasterConsole}
        externalRevealedIds={acquiredInspectableIds}
        externallyManagedIds={controller.managedInspectableIds}
        scene={scene}
        interactiveContent={(
          <>
            <SceneReturnButton onClick={() => navigate(`/campaign/${campaignId}/play/closed-bar`)}>Вернуться в бар</SceneReturnButton>
            <SceneHotspotLayer ariaLabel="Два пути между гостевыми бунгало" hotspots={hotspots} />
            <SceneTextPanel
              appearance="narration"

              readAloud={scene.readAloud}
              resetKey={`${scene.id}:${accessGranted ? 'open' : 'locked'}`}
            />
            {accessBlocked ? (
              <div
                className={styles.modalBackdrop}
                role="presentation"
                onMouseDown={() => setAccessBlocked(false)}
              >
                <section
                  aria-labelledby="egorik-access-title"
                  aria-modal="true"
                  className={styles.accessModal}
                  role="dialog"
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <p className={styles.eyebrow}>Система доступа</p>
                  <h2 id="egorik-access-title">Путь к Егорику закрыт</h2>
                  <p>
                    Красный считыватель не находит гостевых пропусков и удерживает магический барьер.
                    Доступы к этому бунгало может выдать Оливия на соседней дорожке.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAccessBlocked(false);
                      commitTransition(olvaAction, courtyardHref);
                    }}
                    autoFocus
                  >
                    Пойти к Оливии
                  </button>
                </section>
              </div>
            ) : null}
          </>
        )}
      />
    );
  }

  if (scene.id === courtyardSceneId) {
    const actions = storyScene?.actions ?? [];
    const acceptAction = findAutomaticAction(
      actions,
      'continue-1-couples-session-entry',
      handoffSceneId,
    );
    const declineAction = findAutomaticAction(
      actions,
      'continue-2-groom-tunnel',
      handoffSceneId,
    );
    const ready = canEnterOlvaConsultation(state);
    const accepted = Boolean(state.flags['olva-quest-accepted']);
    const enterAction = findAutomaticAction(actions, 'begin-olva-consultation', 'olva-date-rehearsal');
    const decisionActions = [ready ? enterAction : acceptAction, declineAction].filter(
      (action, index, candidates): action is AutomaticStoryAction => Boolean(action)
        && isGalleryStoryConditionMet(action!.conditions, state)
        && candidates.findIndex((candidate) => candidate?.id === action?.id) === index,
    );
    const masterActions: SceneMasterAction[] = decisionActions.map((action) => ({
      id: `story-${action.id}`,
      label: action.label,
      detail: action.description,
      disabled: !isGalleryStoryConditionMet(action.conditions, state),
      onSelect: () => commitTransition(
        action,
        handoffHref,
      ),
    }));
    const olvaView = scene.interactionViews?.find((view) => view.id === (ready ? 'stas-ready' : accepted ? 'waiting-for-stas' : ''));
    const enter = () => ready
      ? commitTransition(enterAction, `/campaign/${campaignId}/play/olva-date-rehearsal`)
      : accepted ? navigate(hubHref) : commitTransition(acceptAction, hubHref);

    return (
      <CampaignScene
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
        campaignId={campaignId}
        campaignScenes={campaignScenes}
        backHref={hubHref}
        gameMasterConsole={gameMasterConsole}
        externalRevealedIds={acquiredInspectableIds}
        externallyManagedIds={controller.managedInspectableIds}
        masterActions={[...masterActions, {id: 'return-to-bungalows', label: 'Вернуться к развилке', href: hubHref}]}
        masterActionsLabel="Ответ на предложение Оливии"
        scene={scene}
        interactiveContent={(
          <>
          <SceneHotspotLayer background={{src:scene.background,fit:"cover"}} ariaLabel="Вход на консультацию Оливии" hotspots={[{id:"olva-enter-room",label:ready ? "Войти на консультацию со Станисом" : accepted ? "Вернуться за Станисом" : "Предложить найти её мужа",position:{x:9,y:7,width:30,height:71},onSelect:enter}]}/>
          <SceneTextPanel
            appearance="narration"

            readAloud={olvaView?.readAloud ?? scene.readAloud}
            resetKey={`${scene.id}:${olvaView?.id ?? 'offer'}`}
          />
          </>
        )}
      />
    );
  }

  const handoffAction = findAutomaticAction(
    storyScene?.actions ?? [],
    'continue-1-guest-bungalows',
    hubSceneId,
  );
  const returnToCrossroads = () => commitTransition(handoffAction, hubHref);

  return (
    <CampaignScene
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
      campaignId={campaignId}
      campaignScenes={campaignScenes}
      backHref={courtyardHref}
      gameMasterConsole={gameMasterConsole}
      externalRevealedIds={acquiredInspectableIds}
      externallyManagedIds={controller.managedInspectableIds}
      masterActions={[{
        id: 'olva-handoff-return-to-crossroads',
        label: 'Вернуться к развилке',
        onSelect: returnToCrossroads,
      }]}
      scene={scene}
      interactiveContent={(
        <>
          <SceneHotspotLayer
            background={{src: scene.background, fit: 'cover'}}
            ariaLabel="Выход к развилке гостевых бунгало"
            hotspots={[{
              id: 'olva-passes-return-to-crossroads',
              label: 'Вернуться к развилке',
              onSelect: returnToCrossroads,
              position: {x: 68, y: 15, width: 28, height: 52},
            }]}
          />
          <SceneReturnButton onClick={returnToCrossroads}>Вернуться к развилке</SceneReturnButton>
          <SceneTextPanel
            appearance="narration"

            readAloud={scene.readAloud}
            resetKey={`${scene.id}:${state.events.length}`}
          />
        </>
      )}
    />
  );
}
