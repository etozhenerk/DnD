import type {CampaignSceneBlock} from '../../../entities/campaign-session/model/types';
import type {GalleryGameplayDefinition} from '../../../entities/campaign-session/model/galleryGameplay';
import {getEffectiveGalleryEvents} from '../../../entities/campaign-session/model/galleryCheckpoint';
import {replayGalleryEvents} from '../../../entities/campaign-session/model/gallerySession';
import {readGallerySessionEvents, writeGallerySessionEvents} from './gallerySessionStorage';
import {writePartyRewards} from './partyRewardStorage';

interface Checkpoint {
  sessionId: string;
  eventCount: number;
  values: Record<string, string | null>;
}
interface Registry {version: 1; checkpoints: Record<string, Checkpoint>}
const memory = new Map<string, Registry>();
const keyFor = (id: string) => `dnd:scene-checkpoints:${id}`;
const expectationFor = (definition: GalleryGameplayDefinition) => ({
  campaignId: definition.campaignId, definitionId: definition.id, definitionVersion: definition.version,
});
function read(id: string): Registry {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(keyFor(id)) ?? 'null');
    if (parsed?.version === 1 && parsed.checkpoints && typeof parsed.checkpoints === 'object') return parsed;
  } catch { /* Memory fallback keeps this tab playable. */ }
  return memory.get(id) ?? {version: 1, checkpoints: {}};
}
function write(id: string, registry: Registry) {
  memory.set(id, registry);
  try { window.localStorage.setItem(keyFor(id), JSON.stringify(registry)); } catch { /* Memory fallback. */ }
}
function storageKeys(campaignId: string, blocks: CampaignSceneBlock[]) {
  return [
    `dnd:campaign-inventory:${campaignId}`,
    `dnd:hotel-gallery-adventure:${campaignId}`,
    ...blocks.flatMap((block) => block.sceneIds.map((id) => `dnd:campaign-scene:${id}`)),
  ];
}

/** Called before mounting scene controllers, so their first effects cannot contaminate the entry. */
export function ensureSceneCheckpoint(definition: GalleryGameplayDefinition, blocks: CampaignSceneBlock[], block: CampaignSceneBlock) {
  const events = readGallerySessionEvents(expectationFor(definition));
  const sessionId = events[0]?.id ?? 'pending';
  const registry = read(definition.campaignId);
  const existing = registry.checkpoints[block.id];
  if (existing && (existing.sessionId === sessionId || existing.sessionId === 'pending')) {
    if (existing.sessionId === 'pending' && sessionId !== 'pending') {
      existing.sessionId = sessionId;
      write(definition.campaignId, registry);
    }
    return;
  }
  if (Object.values(registry.checkpoints).some((entry) => entry.sessionId !== sessionId && entry.sessionId !== 'pending')) registry.checkpoints = {};
  const effective = getEffectiveGalleryEvents(events);
  const firstInBlock = effective.find((event) => event.type !== 'session-started' && block.sceneIds.some((id) =>
    event.sceneScopeId === id || event.sceneScopeId?.startsWith(`${id}-`),
  ));
  const eventCount = firstInBlock ? events.findIndex((event) => event.commandId === firstInBlock.commandId) : Math.max(1, events.length);
  const values = Object.fromEntries(storageKeys(definition.campaignId, blocks).map((key) => {
    try { return [key, window.localStorage.getItem(key)]; } catch { return [key, null]; }
  }));
  // Legacy saves have no historical UI snapshot; reconstruct mechanics from their journal.
  if (firstInBlock) {
    const state = replayGalleryEvents(events.slice(0, eventCount), definition);
    values[`dnd:campaign-inventory:${definition.campaignId}`] = JSON.stringify({version: 1, campaignId: definition.campaignId,
      revealedInspectableIds: state.inventory, viewedInspectableIds: [], slots: state.inventory});
    for (const later of blocks.slice(blocks.indexOf(block))) for (const id of later.sceneIds) values[`dnd:campaign-scene:${id}`] = null;
    if (blocks.indexOf(block) <= blocks.findIndex((entry) => entry.id === 'hall')) values[`dnd:hotel-gallery-adventure:${definition.campaignId}`] = null;
  }
  registry.checkpoints[block.id] = {sessionId, eventCount, values};
  write(definition.campaignId, registry);
}

export function restoreSceneCheckpoint(definition: GalleryGameplayDefinition, blocks: CampaignSceneBlock[], block: CampaignSceneBlock): boolean {
  const registry = read(definition.campaignId);
  const checkpoint = registry.checkpoints[block.id];
  const events = readGallerySessionEvents(expectationFor(definition));
  if (!checkpoint || !events.length || (checkpoint.sessionId !== 'pending' && checkpoint.sessionId !== events[0].id)
    || !Number.isInteger(checkpoint.eventCount) || checkpoint.eventCount < 1 || checkpoint.eventCount > events.length) return false;
  const id = `scene-restart-${crypto.randomUUID()}`;
  const restored = [...events, {id, commandId: id, type: 'scene-checkpoint-restored' as const, eventCount: checkpoint.eventCount}];
  const snapshot = replayGalleryEvents(restored, definition);
  writeGallerySessionEvents(expectationFor(definition), restored);
  for (const key of storageKeys(definition.campaignId, blocks)) {
    const value = checkpoint.values[key];
    try {
      if (typeof value === 'string') window.localStorage.setItem(key, value);
      else window.localStorage.removeItem(key);
    } catch { /* Browser may deny persistence. */ }
  }
  writePartyRewards(definition.campaignId, snapshot.inventory);
  for (const later of blocks.slice(blocks.indexOf(block) + 1)) delete registry.checkpoints[later.id];
  write(definition.campaignId, registry);
  return true;
}

export function clearSceneCheckpoints(campaignId: string) {
  memory.delete(campaignId);
  try { window.localStorage.removeItem(keyFor(campaignId)); } catch { /* Memory already cleared. */ }
}
