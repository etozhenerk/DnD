import rewards from '../../../../content/party-rewards.json';

const STORAGE_KEY = 'dnd-party-rewards-v1';
const knownIds = new Set(rewards.filter((item) => item.carryToNextCampaign).map((item) => item.id));

function readRegistry(): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).flatMap(([campaignId, ids]) => (
      Array.isArray(ids) ? [[campaignId, ids.filter((id): id is string => typeof id === 'string' && knownIds.has(id))]] : []
    )));
  } catch { return {}; }
}

export function readCarriedPartyRewards(campaignId: string): string[] {
  return [...new Set(Object.entries(readRegistry()).flatMap(([source, ids]) => source === campaignId ? [] : ids))];
}

export function writePartyRewards(campaignId: string, inventory: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const registry = readRegistry();
    const ids = inventory.filter((id) => knownIds.has(id));
    if (ids.length) registry[campaignId] = ids;
    else delete registry[campaignId];
    if (Object.keys(registry).length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch { /* Session play continues without persistent storage. */ }
}
