import {useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {useNavigate} from 'react-router-dom';
import {CampaignPresentationContext, updateDoomPresentation, type DoomAnimation} from '../../model/campaignPresentation';
import {DoomIndicator} from '../DoomIndicator/DoomIndicator';
import {PortalTransition} from '../PortalTransition/PortalTransition';
import {CampaignSoundtrack} from '../CampaignSoundtrack/CampaignSoundtrack';
import {penisuelaGalleryGameplay} from '../../../../entities/campaign-session/model/playableData';
import {useManualCheckRewards} from '../../model/useManualCheckRewards';
import {ManualCheckRewardDialog} from '../ManualCheckRewardDialog/ManualCheckRewardDialog';

export function CampaignPresentation({children}: {children: ReactNode}) {
  const navigate = useNavigate();
  const {notice, dismiss} = useManualCheckRewards(penisuelaGalleryGameplay);
  const [doom, setDoom] = useState<DoomAnimation | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const pending = useRef(false);
  const updateDoom = useCallback((snapshot: Parameters<typeof updateDoomPresentation>[1]) => {
    setDoom(previous => updateDoomPresentation(previous, snapshot));
  }, []);
  const enterPortal = useCallback((target: string) => {
    if (pending.current) return;
    pending.current = true;
    setDestination(target);
  }, []);
  useEffect(() => {
    if (!doom || (doom.from === null && !doom.appearing)) return;
    const timer = window.setTimeout(() => setDoom(current => current ? {...current, from: null, appearing: false} : current), 2800);
    return () => window.clearTimeout(timer);
  }, [doom?.from, doom?.appearing, doom?.revision, doom?.sessionId]);
  const value = useMemo(() => ({updateDoom, enterPortal}), [updateDoom, enterPortal]);
  return <CampaignPresentationContext.Provider value={value}>
    <CampaignSoundtrack initialVolume={penisuelaGalleryGameplay.soundtrack?.volume}>{children}</CampaignSoundtrack>
    {doom?.visible ? <DoomIndicator key={`${doom.sessionId}:${doom.revision}`} stage={doom.stage} from={doom.from} appearing={doom.appearing} /> : null}
    {destination ? <PortalTransition onCovered={() => navigate(destination)} onComplete={() => {
      pending.current = false;
      setDestination(null);
    }} /> : null}
    {notice && penisuelaGalleryGameplay.manualCheckReward ? <ManualCheckRewardDialog key={notice.id}
      reward={penisuelaGalleryGameplay.manualCheckReward} notice={notice} onClose={dismiss}/> : null}
  </CampaignPresentationContext.Provider>;
}
