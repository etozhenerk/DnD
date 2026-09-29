import {useEffect, useReducer} from 'react';
import {getOlvaMasterStepBack} from '../../../../features/navigate-campaign-scene/model/olvaMasterStepBack';
import {useLocation, useNavigate} from 'react-router-dom';
import {penisuelaGalleryGameplay,penisuelaGalleryHeroes} from '../../../../entities/campaign-session/model/playableData';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import {canEnterOlvaConsultation,getOlvaQuestView,olvaQuest} from '../../../../entities/campaign-session/model/olvaQuest';
import {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {initialOlvaTableNavigation, olvaTableNavigationReducer} from '../../../../features/navigate-campaign-scene/model/olvaTableNavigation';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene/ui/SceneTextPanel/SceneTextPanel';
import {SceneHotspotLayer} from '../../../../features/navigate-campaign-scene/ui/SceneHotspotLayer/SceneHotspotLayer';
import {CampaignScene} from '../CampaignScene/CampaignScene';
import {GameMasterConsole} from '../GameMasterConsole/GameMasterConsole';
import {OlvaEvidenceTable} from './OlvaEvidenceTable';
import styles from './OlvaDateAdventure.module.css';
interface Props {campaignId:string;campaignScenes:CampaignSessionScene[];scene:CampaignSessionScene;}
export function OlvaDateAdventure({campaignId,campaignScenes,scene}:Props) {
  const navigate=useNavigate();
  const location=useLocation();
  const controller=useGallerySession(penisuelaGalleryGameplay,penisuelaGalleryHeroes,campaignScenes.map(s=>s.id),{sceneScopeId:scene.id});
  const {state}=controller;
  const entryAllowed=canEnterOlvaConsultation(state);
  useEffect(() => {
    // A checkpoint reset updates the journal before routing to the block entrance.
    // Do not let an effect from the old room replace that newer navigation.
    if (!entryAllowed && window.location.pathname.endsWith(location.pathname)) {
      navigate(`/campaign/${campaignId}/play/bungalow-courtyard`, {replace:true});
    }
  }, [campaignId, entryAllowed, location.pathname, navigate]);
  const view=getOlvaQuestView(state);
  const [navigation,dispatchNavigation]=useReducer(olvaTableNavigationReducer,initialOlvaTableNavigation);
  const tableOpen=navigation.screen !== 'room';
  const act=(id:string)=>controller.commitStoryAction(scene.id,id);
  const open=()=>{dispatchNavigation({type:'open',complete:view.complete});if(!view.complete && !view.has('opened'))act('table-open');};
  const exit=()=>navigate(`/campaign/${campaignId}/play/${olvaQuest.exitSceneId}`);
  const reward = olvaQuest.reward.presentation;
  const continueReward = () => act(view.rewardShown ? 'table-claim-reward' : 'table-show-reward');
  const continueLabel = view.rewardShown ? reward.claimLabel : reward.continueLabel;
  const stepBack = () => {
    const step = getOlvaMasterStepBack({navigation, complete: view.complete,
      lastActionId: state.lastStoryAction?.sceneId === scene.id ? state.lastStoryAction.actionId : undefined,
      canUndo: controller.canUndoLastActionInScope(scene.id),
    });
    if (step.kind === 'exit') exit();
    else if (step.kind === 'back') dispatchNavigation({type:'back'});
    else if (controller.undoLastAction(scene.id) && navigation.screen !== step.screen) {
      dispatchNavigation(step.screen === 'voting' ? {type:'vote'} : step.screen === 'room' ? {type:'close'} : {type:'open',complete:false});
    }
  };
  const roomBackground = view.rewardShown ? reward.background : view.complete && view.ending ? view.ending.background : olvaQuest.background;
  const stageScene={...scene,inspectables:[],alt:tableOpen?'Овальный деревянный стол сверху с разложенными доказательствами.':view.rewardShown ? reward.alt : view.complete ? view.ending?.alt ?? scene.alt : scene.alt,background:tableOpen?olvaQuest.tableBackground:roomBackground,readAloud:view.narration};
  const heroes=controller.sessionHeroes.map(h=>({...h,token:`assets/concepts/campaigns/penisuela/ui/hero-tokens/${h.id}.png`}));
  if (!entryAllowed) return null;
  return <CampaignScene campaignId={campaignId} campaignScenes={campaignScenes} scene={stageScene}
    itemController={controller} inventoryArtwork={controller.inventoryArtwork} externallyManagedIds={controller.managedInspectableIds} externalRevealedIds={state.inventory}
    gameMasterConsole={<GameMasterConsole campaignScenes={campaignScenes} controller={controller} definition={penisuelaGalleryGameplay} scene={scene}/>}
    onMasterStepBack={stepBack}
    masterActions={tableOpen ? [] : view.rewardClaimed ? [{id:'leave-olva-room',label:reward.exitLabel,onSelect:exit}] : view.complete
      ? [{id:'olva-reward',label:continueLabel,onSelect:continueReward}]
      : [{id:'olva-table',label:'Рассмотреть стол',onSelect:open}]}
    interactiveContent={tableOpen?<OlvaEvidenceTable state={state} heroes={heroes} act={act} navigation={navigation} dispatchNavigation={dispatchNavigation} onBack={()=>dispatchNavigation({type:'close'})} onExit={exit}/>:<>
      <nav className={styles.sceneNavigation} aria-label="Продолжение консультации">
        {view.complete && !view.rewardClaimed
          ? <button type="button" onClick={continueReward}>{continueLabel} →</button>
          : <button type="button" onClick={exit}>← {view.rewardClaimed ? reward.exitLabel : 'Выйти из бунгало'}</button>}
      </nav>
      <SceneHotspotLayer background={{src:roomBackground,fit:'contain'}} ariaLabel="Стол и выход из бунгало" hotspots={[
        ...(!view.complete ? [{id:'olva-evidence-table',label:'Рассмотреть стол с доказательствами',position:{x:19,y:73,width:56,height:16},onSelect:open}] : []),
        ...(view.rewardShown && !view.rewardClaimed ? [{id:'olva-reward-handoff',label:reward.claimLabel,position:reward.handoffPosition,onSelect:continueReward}] : []),
        {id:'olva-door',label:view.complete && !view.rewardClaimed ? continueLabel : 'Выйти на развилку бунгало',position:view.rewardShown ? reward.exitPosition : view.complete && view.ending ? view.ending.exitPosition : {x:59,y:3,width:11,height:43},onSelect:view.complete && !view.rewardClaimed ? continueReward : exit},
      ]}/>
      <SceneTextPanel appearance="narration" readAloud={view.narration} resetKey={`${scene.id}:${view.complete}:${view.rewardShown}:${view.rewardClaimed}`}/>
    </>}/>
}
