import partyRewards from '../../../../content/party-rewards.json';
import {toCampaignInspectableId as inspectableId} from '../../../entities/campaign-session/model/inventoryPresentation';
import {reconcileInventorySlots} from '../../../entities/campaign-session/model/inventorySlots';
import {useCallback, useEffect, useMemo, useState} from 'react';
import type {CampaignSessionScene} from '../../../entities/campaign-session/model/types';
import {
  CAMPAIGN_STORAGE_RESET_EVENT,
  type CampaignStorageResetDetail,
  readCampaignInventoryState,
  readCampaignSceneState,
  writeCampaignInventoryState,
  writeCampaignSceneState,
} from './sessionStorage';

export function useCampaignScene(
  campaignId: string,
  scene: CampaignSessionScene,
  campaignScenes: CampaignSessionScene[],
  inventoryRevealedIds: string[] = [],
  inventoryManagedIds: string[] = [],
) {
  const externalRevealedIds = useMemo(() => inventoryRevealedIds.map(inspectableId), [inventoryRevealedIds]);
  const externallyManagedIds = useMemo(() => inventoryManagedIds.map(inspectableId), [inventoryManagedIds]);
  const storedState = useMemo(() => readCampaignSceneState(scene.id), [scene.id]);
  const legacySceneIds = useMemo(() => campaignScenes.map((item) => item.id), [campaignScenes]);
  const storedInventoryState = useMemo(
    () => readCampaignInventoryState(campaignId, legacySceneIds),
    [campaignId, legacySceneIds],
  );
  const inspectableIds = useMemo(
    () => new Set([...campaignScenes.flatMap((item) => item.inspectables.map((inspectable) => inspectable.id)), ...partyRewards.map(item => item.id)]),
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
    ])].map(inspectableId).filter((id) => inspectableIds.has(id)),
  );
  const [viewedInspectableIds, setViewedInspectableIds] = useState<string[]>(
    () => [...new Set([
      ...(storedInventoryState?.viewedInspectableIds ?? []),
      ...(storedState?.viewedInspectableIds ?? []),
    ])].map(inspectableId).filter((id) => inspectableIds.has(id)),
  );
  const [inventorySlots, setInventorySlots] = useState<(string | null)[]>(
    () => reconcileInventorySlots((storedInventoryState?.slots ?? []).map((id) => id ? inspectableId(id) : null), revealedInspectableIds),
  );
  const resolvedInventorySlots = useMemo(
    () => reconcileInventorySlots(inventorySlots, revealedInspectableIds),
    [inventorySlots, revealedInspectableIds],
  );
  useEffect(() => {
    setInventorySlots((current) => current.length === resolvedInventorySlots.length
      && current.every((id, index) => id === resolvedInventorySlots[index]) ? current : resolvedInventorySlots);
  }, [resolvedInventorySlots]);
  const [selectedInspectableId, setSelectedInspectableId] = useState<string | null>(null);

  useEffect(() => {
    const handleCampaignReset = (event: Event) => {
      const resetEvent = event as CustomEvent<CampaignStorageResetDetail>;
      if (resetEvent.detail?.campaignId !== campaignId) return;

      setIntroRead(false);
      setRevealedInspectableIds([]);
      setInventorySlots([]);
      setViewedInspectableIds([]);
      setSelectedInspectableId(null);
    };

    window.addEventListener(CAMPAIGN_STORAGE_RESET_EVENT, handleCampaignReset);
    return () => window.removeEventListener(CAMPAIGN_STORAGE_RESET_EVENT, handleCampaignReset);
  }, [campaignId]);

  useEffect(() => {
    setRevealedInspectableIds((current) => {
      const managedIds = new Set(externallyManagedIds);
      const retained = current.filter((id) => inspectableIds.has(id) && (!managedIds.has(id) || externalRevealedIds.includes(id)));
      const next = [...new Set([
        ...retained,
        ...externalRevealedIds.filter((id) => inspectableIds.has(id)),
      ])];
      return next.length === current.length && next.every((id, index) => id === current[index]) ? current : next;
    });
    setViewedInspectableIds((current) => {
      const next = current.filter(
        (id) => inspectableIds.has(id) && (!externallyManagedIds.includes(id) || externalRevealedIds.includes(id)),
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
    writeCampaignInventoryState({campaignId, revealedInspectableIds, viewedInspectableIds, slots: resolvedInventorySlots});
  }, [campaignId, introRead, revealedInspectableIds, resolvedInventorySlots, scene.id, sceneInspectableIds, viewedInspectableIds]);

  const completeIntro = useCallback(() => setIntroRead(true), []);
  const restartScene = useCallback(() => {
    setIntroRead(false);
    setSelectedInspectableId(null);
    setRevealedInspectableIds((current) => current.filter((id) => !sceneInspectableIds.has(id)));
    setViewedInspectableIds((current) => current.filter((id) => !sceneInspectableIds.has(id)));
  }, [sceneInspectableIds]);

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
    inventorySlots: resolvedInventorySlots,
    introRead,
    revealedInspectableIds,
    viewedInspectableIds,
    selectedInspectableId,
    exitAvailable,
    completeIntro,
    restartScene,
    findInspectable,
    openInspectable,
    closeInspectable,
  };
}
