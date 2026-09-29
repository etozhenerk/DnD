import {getAutomaticCheckReward, GREY_WIESE_PERFUME_ID} from '../../../../entities/campaign-session/model/partyRewards';
import {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {penisuelaGalleryGameplay, penisuelaGalleryHeroes, penisuelaSessionPreview} from '../../../../entities/campaign-session/model/playableData';
import {isGalleryStoryConditionMet} from '../../../../entities/campaign-session/model/galleryGameplay';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {getStoryActionAvailability, getStoryCheckSettings} from '../../../../features/navigate-campaign-scene/model/storyActionRules';
import {SceneCheckPanel} from '../../../../features/navigate-campaign-scene/ui/SceneCheckPanel/SceneCheckPanel';
import {SceneHotspotLayer} from '../../../../features/navigate-campaign-scene/ui/SceneHotspotLayer/SceneHotspotLayer';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene/ui/SceneTextPanel/SceneTextPanel';
import {CampaignScene} from '../CampaignScene/CampaignScene';
import {GameMasterConsole} from '../GameMasterConsole/GameMasterConsole';

interface GraywiseDoorAdventureProps {
  campaignId: string;
  campaignScenes: CampaignSessionScene[];
  scene: CampaignSessionScene;
}

export function GraywiseDoorAdventure({campaignId, campaignScenes, scene}: GraywiseDoorAdventureProps) {
  const navigate = useNavigate();
  const sceneIds = useMemo(() => campaignScenes.map((item) => item.id), [campaignScenes]);
  const controller = useGallerySession(penisuelaGalleryGameplay, penisuelaGalleryHeroes, sceneIds, {sceneScopeId: scene.id});
  const {state} = controller;
  const [checkId, setCheckId] = useState<string | null>(null);
  const [selectedHeroId, setSelectedHeroId] = useState(penisuelaGalleryHeroes[0].id);
  const [pendingExit, setPendingExit] = useState<string | null>(null);
  const story = penisuelaGalleryGameplay.storyScenes.find((item) => item.id === scene.id)!;
  const activeAction = story.actions.find((action) => action.id === checkId);
  const check = activeAction?.kind === 'check' ? activeAction : undefined;
  const opened = Boolean(state.flags['bridge-graywise-door-trust-graywise-door-trust-decision-1-resolved']);
  const viewId = opened
    ? state.flags['graywise-trust-failed'] ? 'escorted-open' : state.flags['graywise-egor-spoke'] ? 'egor-trusted-open' : 'trusted-open'
    : state.flags['graywise-party-attempted'] ? 'party-failed' : undefined;
  const view = scene.interactionViews?.find((candidate) => candidate.id === viewId);
  const displayedScene = view ? {...scene, background: view.background, alt: view.alt, readAloud: view.readAloud ?? scene.readAloud} : scene;
  const stat = check?.check.stats[0] ?? 'charisma';
  const actorId = check?.check.npcActor?.id ?? selectedHeroId;
  const settings = check ? getStoryCheckSettings(check.check, state, actorId, stat) : undefined;
  const heroes = controller.sessionHeroes.filter((hero) => !check?.check.eligibleHeroIds || check.check.eligibleHeroIds.includes(hero.id));

  useEffect(() => {
    if (!pendingExit || state.lastStoryAction?.sceneId !== scene.id || state.lastStoryAction.actionId !== pendingExit) return;
    const action = story.actions.find((candidate) => candidate.id === pendingExit);
    if (action) navigate(`/campaign/${campaignId}/play/${action.nextSceneId}`);
  }, [campaignId, navigate, pendingExit, scene.id, state.lastStoryAction, story.actions]);

  const actions = story.actions.filter((action) => isGalleryStoryConditionMet(action.conditions, state)).map((action) => ({
    id: action.id, label: action.label,
    disabled: !getStoryActionAvailability(action, state, penisuelaGalleryGameplay),
    onSelect: () => {
      if (action.kind === 'check') setCheckId(action.id);
      else if (action.kind === 'automatic') {
        if (controller.commitStoryAction(scene.id, action.id)) setPendingExit(action.id);
        else if (opened) navigate(`/campaign/${campaignId}/play/${action.nextSceneId}`);
      }
    },
  }));
  const doorActionId = opened ? 'continue-1-bedroom-reveal'
    : state.flags['graywise-party-attempted'] ? 'ask-egor-for-graywise-trust'
      : 'choose-graywise-door-trust-decision-1-trust-earned';
  const doorAction = actions.find((action) => action.id === doorActionId && !action.disabled);

  return (
    <CampaignScene
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
      campaignId={campaignId} campaignScenes={campaignScenes} scene={displayedScene}
      backHref={`/campaign/${campaignId}/play/post-kreed-route`}
      externalRevealedIds={state.inventory} externallyManagedIds={controller.managedInspectableIds}
      masterActions={actions}
      onMasterStepBack={checkId ? () => setCheckId(null) : controller.canUndoLastActionInScope(scene.id) ? () => {setPendingExit(null); controller.undoLastAction(scene.id);} : undefined}
      gameMasterConsole={<GameMasterConsole campaignScenes={campaignScenes} controller={controller} definition={penisuelaGalleryGameplay} scene={displayedScene} />}
      interactiveContent={(
        <>
          <SceneHotspotLayer
            background={{src: displayedScene.background, fit: displayedScene.backgroundLayout && displayedScene.backgroundLayout !== 'cover' ? 'contain' : 'cover'}}
            hotspots={!check && doorAction ? [{...doorAction, position: opened
              ? {x: 37, y: 4, width: 37, height: 89}
              : {x: 30, y: 6, width: 40, height: 87}}] : []}
          />
          <SceneTextPanel appearance="narration" readAloud={displayedScene.readAloud} resetKey={view?.id ?? scene.id} />
          {!opened && check && settings ? (
            <SceneCheckPanel
              key={check.id} checkId={check.id} label={check.label} hint={check.description}
              dc={(heroId) => getStoryCheckSettings(check.check, state, heroId, stat).dc}
              advantage={settings.advantage} selectedHeroId={actorId} selectedStat={stat} stats={check.check.stats}
              heroes={check.check.npcActor ? [check.check.npcActor] : heroes.map((hero) => ({
                id: hero.id, name: hero.name,
                stats: {...hero.stats, [stat]: getStoryCheckSettings(check.check, state, hero.id, stat).modifier},
                token: penisuelaSessionPreview.party.find((member) => member.characterId === hero.id)!.token,
              }))}
              onSelectHero={setSelectedHeroId} onClose={() => setCheckId(null)}
              automaticSuccess={!check.check.npcActor && getAutomaticCheckReward(state, actorId, stat) ? {
                ...getAutomaticCheckReward(state, actorId, stat)!,
                onUse: () => {
                  const result = controller.resolveStoryActionCheck(scene.id, check.id, actorId, stat, undefined, false, GREY_WIESE_PERFUME_ID);
                  if (result) setCheckId(null);
                  return Boolean(result);
                },
              } : undefined}
              onResolve={(_roll, rolls) => {
                if (controller.resolveStoryActionCheck(scene.id, check.id, actorId, stat, rolls)) setCheckId(null);
              }}
            />
          ) : null}
        </>
      )}
    />
  );
}
