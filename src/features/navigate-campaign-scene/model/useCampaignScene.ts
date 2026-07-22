import {useCallback, useEffect, useMemo, useState} from 'react';
import type {CampaignSessionScene} from '../../../entities/campaign-session/model/types';
import {
  readCampaignInventoryState,
  readCampaignSceneState,
  writeCampaignInventoryState,
  writeCampaignSceneState,
} from './sessionStorage';

export function useCampaignScene(
  campaignId: string,
  scene: CampaignSessionScene,
  campaignScenes: CampaignSessionScene[],
  externalRevealedIds: string[] = [],
  externallyManagedIds: string[] = [],
) {
  const storedState = useMemo(() => readCampaignSceneState(scene.id), [scene.id]);
  const legacySceneIds = useMemo(() => campaignScenes.map((item) => item.id), [campaignScenes]);
  const storedInventoryState = useMemo(
    () => readCampaignInventoryState(campaignId, legacySceneIds),
    [campaignId, legacySceneIds],
  );
  const inspectableIds = useMemo(
    () => new Set(campaignScenes.flatMap((item) => item.inspectables.map((inspectable) => inspectable.id))),
    [campaignScenes],
  );
  const sceneInspectableIds = useMemo(
    () => new Set(scene.inspectables.map((item) => item.id)),
    [scene.inspectables],
  );
  const [introRead, setIntroRead] = useState(storedState?.introRead ?? false);
  const [revealedInspectableIds, setRevealedInspectableIds] = useState<string[]>(
    () => [...new Set([
      ...(storedInventoryState?.revealedInspectableIds ?? []),
      ...(storedState?.revealedInspectableIds ?? []),
    ])].filter((id) => inspectableIds.has(id)),
  );
  const [viewedInspectableIds, setViewedInspectableIds] = useState<string[]>(
    () => [...new Set([
      ...(storedInventoryState?.viewedInspectableIds ?? []),
      ...(storedState?.viewedInspectableIds ?? []),
    ])].filter((id) => inspectableIds.has(id)),
  );
  const [selectedInspectableId, setSelectedInspectableId] = useState<string | null>(null);

  useEffect(() => {
    setRevealedInspectableIds((current) => {
      const managedIds = new Set(externallyManagedIds);
      const retained = current.filter((id) => !managedIds.has(id));
      const next = [...new Set([
        ...retained,
        ...externalRevealedIds.filter((id) => inspectableIds.has(id)),
      ])];
      return next.length === current.length && next.every((id, index) => id === current[index]) ? current : next;
    });
    setViewedInspectableIds((current) => {
      const next = current.filter(
        (id) => !externallyManagedIds.includes(id) || externalRevealedIds.includes(id),
      );
      return next.length === current.length ? current : next;
    });
  }, [externalRevealedIds, externallyManagedIds, inspectableIds]);

  useEffect(() => {
    writeCampaignSceneState({
      sceneId: scene.id,
      introRead,
      revealedInspectableIds: revealedInspectableIds.filter((id) => sceneInspectableIds.has(id)),
      viewedInspectableIds: viewedInspectableIds.filter((id) => sceneInspectableIds.has(id)),
    });
    writeCampaignInventoryState({campaignId, revealedInspectableIds, viewedInspectableIds});
  }, [campaignId, introRead, revealedInspectableIds, scene.id, sceneInspectableIds, viewedInspectableIds]);

  const completeIntro = useCallback(() => setIntroRead(true), []);

  const findInspectable = useCallback((inspectableId: string) => {
    if (!inspectableIds.has(inspectableId)) return;
    setRevealedInspectableIds((current) => current.includes(inspectableId) ? current : [...current, inspectableId]);
    setViewedInspectableIds((current) => current.includes(inspectableId) ? current : [...current, inspectableId]);
    setSelectedInspectableId(inspectableId);
  }, [inspectableIds]);

  const openInspectable = useCallback((inspectableId: string) => {
    if (!revealedInspectableIds.includes(inspectableId)) return;
    setViewedInspectableIds((current) => current.includes(inspectableId) ? current : [...current, inspectableId]);
    setSelectedInspectableId(inspectableId);
  }, [revealedInspectableIds]);

  const closeInspectable = useCallback(() => setSelectedInspectableId(null), []);
  const exitAvailable = Boolean(
    introRead && scene.exit?.availableAfter.every((id) => revealedInspectableIds.includes(id)),
  );

  return {
    introRead,
    revealedInspectableIds,
    viewedInspectableIds,
    selectedInspectableId,
    exitAvailable,
    completeIntro,
    findInspectable,
    openInspectable,
    closeInspectable,
  };
}
