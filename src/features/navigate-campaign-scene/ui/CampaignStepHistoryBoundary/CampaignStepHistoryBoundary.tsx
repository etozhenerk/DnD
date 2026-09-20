import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import {useLocation, useNavigate, useNavigationType} from 'react-router-dom';
import type {GalleryGameplayDefinition} from '../../../../entities/campaign-session/model/galleryGameplay';
import {CampaignStepHistoryContext} from '../../model/campaignStepHistoryContext';
import {createSceneNavigationEvent, createStepCorrection, getLastCampaignStep} from '../../model/campaignStepHistory';
import {readGallerySessionEvents, writeGallerySessionEvents} from '../../model/gallerySessionStorage';

interface Props {children: ReactNode; definition: GalleryGameplayDefinition}

export function CampaignStepHistoryBoundary({children, definition}: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const path = `${location.pathname}${location.search}`;
  const previousPath = useRef(path);
  const restoringPath = useRef<string | null>(null);
  const [readyPath, setReadyPath] = useState(path);
  const [revision, setRevision] = useState(0);
  const expectation = {campaignId: definition.campaignId, definitionId: definition.id, definitionVersion: definition.version};

  useEffect(() => {
    if (previousPath.current !== path) {
      const events = readGallerySessionEvents(expectation);
      const latest = events.at(-1);
      const transition = createSceneNavigationEvent(previousPath.current, path, events, definition);
      // Redirects and checkpoint restores are not player steps. Automatic story exits
      // are retained when they belong to the command that caused the transition.
      const redirect = navigationType === 'REPLACE' && transition?.commandId !== latest?.commandId;
      if (events.length && transition && restoringPath.current !== path && !redirect) {
        writeGallerySessionEvents(expectation, [...events, transition]);
      }
      previousPath.current = path;
    }
    restoringPath.current = null;
    setReadyPath(path);
  }, [path, definition, navigationType]);

  const stepBack = useCallback((fallback?: () => void) => {
    const events = readGallerySessionEvents(expectation);
    const latest = getLastCampaignStep(events);
    if (latest?.type === 'scene-navigated') {
      writeGallerySessionEvents(expectation, [...events, createStepCorrection(latest)]);
      restoringPath.current = latest.fromPath;
      setRevision((value) => value + 1);
      navigate(latest.fromPath, {replace: true});
    } else if (fallback) {
      fallback();
    } else if (latest) {
      writeGallerySessionEvents(expectation, [...events, createStepCorrection(latest)]);
      setRevision((value) => value + 1);
    } else return false;
    return true;
  }, [definition, navigate]);

  // The destination controller must load the journal after its transition is recorded.
  if (readyPath !== path) return null;
  return <CampaignStepHistoryContext.Provider key={revision} value={{stepBack}}>{children}</CampaignStepHistoryContext.Provider>;
}
