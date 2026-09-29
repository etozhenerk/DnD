import {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {penisuelaGalleryGameplay, penisuelaGalleryHeroes, penisuelaSessionPreview} from '../../../../entities/campaign-session/model/playableData';
import {isGalleryStoryConditionMet} from '../../../../entities/campaign-session/model/galleryGameplay';
import type {HeroStat} from '../../../../entities/campaign-session/model/galleryGameplay';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {getStoryActionAvailability, getStoryCheckSettings} from '../../../../features/navigate-campaign-scene/model/storyActionRules';
import {SceneCheckPanel} from '../../../../features/navigate-campaign-scene/ui/SceneCheckPanel/SceneCheckPanel';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene/ui/SceneTextPanel/SceneTextPanel';
import {SceneHotspotLayer, type SceneHotspotPosition} from '../../../../features/navigate-campaign-scene/ui/SceneHotspotLayer/SceneHotspotLayer';
import {CampaignScene} from '../CampaignScene/CampaignScene';
import {GameMasterConsole} from '../GameMasterConsole/GameMasterConsole';
import {getGroomTunnelViewId} from '../../../../entities/campaign-session/model/groomTunnel';

interface GroomTunnelAdventureProps {
  campaignId: string;
  campaignScenes: CampaignSessionScene[];
  scene: CampaignSessionScene;
}

const doorTargets: Record<string, {actionId: string; position: SceneHotspotPosition}> = {
  exterior: {actionId: 'groom-tunnel-enter', position: {x: 63.8, y: 25.7, width: 16.1, height: 46.5}},
  'main-open': {actionId: 'groom-tunnel-approach-door', position: {x: 60, y: 9, width: 9, height: 23}},
  door: {actionId: 'groom-door-linda-inside-release', position: {x: 36, y: 7, width: 29, height: 80}},
  'linda-flight': {actionId: 'groom-door-follow-linda', position: {x: 28, y: 7, width: 62, height: 81}},
  cleared: {actionId: 'continue-1-groom-preparation-room', position: {x: 39, y: 14, width: 9, height: 36}},
};

export function GroomTunnelAdventure({campaignId, campaignScenes, scene}: GroomTunnelAdventureProps) {
  const navigate = useNavigate();
  const sceneIds = useMemo(() => campaignScenes.map((item) => item.id), [campaignScenes]);
  const controller = useGallerySession(penisuelaGalleryGameplay, penisuelaGalleryHeroes, sceneIds, {sceneScopeId: scene.id});
  const {state} = controller;
  const [checkId, setCheckId] = useState<string | null>(null);
  const [selectedHeroId, setSelectedHeroId] = useState('');
  const [selectedStat, setSelectedStat] = useState<HeroStat>('strength');
  const [pendingExit, setPendingExit] = useState<string | null>(null);
  const story = penisuelaGalleryGameplay.storyScenes.find((item) => item.id === scene.id)!;
  const viewId = getGroomTunnelViewId(state.flags);
  const view = scene.interactionViews?.find((candidate) => candidate.id === viewId);
  const displayedScene = view ? {...scene, background: view.background, alt: view.alt} : scene;
  const latest = state.lastStoryAction?.sceneId === scene.id ? state.lastStoryAction : null;
  const narration = view?.readAloud ?? scene.readAloud;
  const active = story.actions.find((action) => action.id === checkId);
  const check = active?.kind === 'check' ? active : undefined;
  const livingHeroes = state.heroSources.filter((hero) => (state.heroHp[hero.id] ?? hero.hp) > 0);
  const heroes = livingHeroes.filter((hero) => (!check?.requirements?.heroId || check.requirements.heroId === hero.id)
    && (!check?.check.eligibleHeroIds || check.check.eligibleHeroIds.includes(hero.id)));
  const heroId = heroes.some((hero) => hero.id === selectedHeroId) ? selectedHeroId : heroes[0]?.id ?? '';
  const stat = check?.check.stats.includes(selectedStat) ? selectedStat : check?.check.stats[0] ?? 'strength';
  const settings = check ? getStoryCheckSettings(check.check, state, heroId, stat) : null;

  useEffect(() => {
    if (!pendingExit || state.lastStoryAction?.actionId !== pendingExit) return;
    const action = story.actions.find((candidate) => candidate.id === pendingExit);
    if (action) navigate(`/campaign/${campaignId}/play/${action.nextSceneId}`);
  }, [campaignId, navigate, pendingExit, state.lastStoryAction, story.actions]);

  const masterActions = story.actions
    .filter((action) => isGalleryStoryConditionMet(action.conditions, state))
    .filter((action) => action.kind === 'automatic' || action.kind === 'check')
    .map((action) => ({
      id: action.id,
      label: action.label,
      disabled: !getStoryActionAvailability(action, state, penisuelaGalleryGameplay)
        || (action.kind === 'check' && !livingHeroes.length),
      onSelect: () => {
        if (action.kind === 'check') {
          setSelectedHeroId(action.requirements?.heroId ?? action.check.eligibleHeroIds?.[0] ?? '');
          setSelectedStat(action.check.stats[0]);
          setCheckId(action.id);
        }
        else if (controller.commitStoryAction(scene.id, action.id) && action.nextSceneId !== scene.id) setPendingExit(action.id);
        else if (action.nextSceneId !== scene.id && state.flags['groom-access-completed']) navigate(`/campaign/${campaignId}/play/${action.nextSceneId}`);
      },
    }));

  const doorTarget = doorTargets[viewId];
  const doorAction = masterActions.find((action) => action.id === doorTarget?.actionId && !action.disabled);

  return (
    <CampaignScene
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
      campaignId={campaignId} campaignScenes={campaignScenes} scene={displayedScene}
      backHref={`/campaign/${campaignId}/play/egorik-bungalow-reveal`}
      masterActions={masterActions}
      externalRevealedIds={state.inventory} externallyManagedIds={controller.managedInspectableIds}
      onMasterStepBack={checkId ? () => setCheckId(null) : controller.canUndoLastAction ? () => {setPendingExit(null); controller.undoLastAction();} : undefined}
      gameMasterConsole={<GameMasterConsole campaignScenes={campaignScenes} controller={controller} definition={penisuelaGalleryGameplay} scene={scene} />}
      interactiveContent={(
        <>
          <SceneHotspotLayer
            background={{src: displayedScene.background, fit: displayedScene.backgroundLayout && displayedScene.backgroundLayout !== 'cover' ? 'contain' : 'cover'}}
            hotspots={!check && doorAction ? [{...doorAction, position: doorTarget.position}] : []}
          />
          <SceneTextPanel appearance="narration" readAloud={narration} resetKey={`${viewId}:${latest?.commandId ?? 'entry'}`} />
          {check && heroId && settings ? (
            <SceneCheckPanel
              key={check.id} checkId={check.id} label={check.label} hint={check.description}
              dc={(id) => getStoryCheckSettings(check.check, state, id, stat).dc} advantage={settings.advantage}
              heroes={heroes.map((hero) => ({
                id: hero.id, name: hero.name,
                stats: {...hero.stats, [stat]: getStoryCheckSettings(check.check, state, hero.id, stat).modifier},
                token: penisuelaSessionPreview.party.find((member) => member.characterId === hero.id)!.token,
              }))}
              selectedHeroId={heroId} selectedStat={stat} stats={check.check.stats}
              onSelectHero={setSelectedHeroId} onSelectStat={setSelectedStat}
              onClose={() => setCheckId(null)}
              onResolve={(_roll, rolls) => {
                if (controller.resolveStoryActionCheck(scene.id, check.id, heroId, stat, rolls)) setCheckId(null);
              }}
            />
          ) : null}
        </>
      )}
    />
  );
}
