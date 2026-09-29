import partyRewards from '../../../../content/party-rewards.json';
import {homebrewConditions} from '../../../entities/campaign-session/model/playableData';
import metadata from '../../../../content/campaigns/penisuela-gm-console.json';
import type {CampaignSessionScene} from '../../../entities/campaign-session/model/types';
import type {GalleryGameplayDefinition} from '../../../entities/campaign-session/model/galleryGameplay';
import {getLastUndoableCommandId, type GalleryEvent, type GallerySessionSnapshot} from '../../../entities/campaign-session/model/gallerySession';
import {toCampaignInspectableId} from '../../../entities/campaign-session/model/inventoryPresentation';

export const gmConsoleMetadata = metadata as {
  campaignId: string;
  counters: Record<string, {label: string; description: string}>;
  flags: Record<string, {label: string; description: string}>;
  relationships: Record<string, string>;
};

export function parseGmInteger(input: string, min: number, max: number): number | null {
  if (!/^-?\d+$/.test(input.trim())) return null;
  const value = Number(input);
  return Number.isSafeInteger(value) && value >= min && value <= max ? value : null;
}

export function getGmItemCatalogue(scenes: CampaignSessionScene[], state: GallerySessionSnapshot, definition: GalleryGameplayDefinition) {
  const items = new Map<string, {id: string; label: string}>();
  for (const scene of scenes) for (const item of scene.inspectables) {
    const id = item.id === 'egorik-recording' ? 'recording-for-egorik' : item.id;
    items.set(id, {id, label: item.label});
  }
  for (const hero of state.heroSources) for (const item of hero.items) items.set(item.id, {id: item.id, label: item.name});
  for (const id of state.inventory) if (!items.has(id)) items.set(id, {id, label: id});
  for (const skin of definition.itemSkins ?? []) if (state.flags[skin.flag]) items.set(skin.itemId, {id: skin.itemId, label: skin.name});
  return [...items.values()].sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}

/** Only loot found during the campaign; starting personal equipment is excluded. */
export function getGmCampaignItemCatalogue(scenes: CampaignSessionScene[], state: GallerySessionSnapshot) {
  const personalIds = new Set(state.heroSources.flatMap(hero => hero.items.map(item => item.id)));
  const items = new Map<string, {id: string; label: string}>();
  for (const item of [...scenes.flatMap(scene => scene.inspectables), ...partyRewards.map(reward => ({id: reward.id, label: reward.name}))]) {
    const id = item.id === 'egorik-recording' ? 'recording-for-egorik' : item.id;
    if (!personalIds.has(id)) items.set(id, {id, label: item.label});
  }
  return [...items.values()].sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}

export function getGmLabels(scenes: CampaignSessionScene[], state: GallerySessionSnapshot, definition: GalleryGameplayDefinition) {
  const labels: Record<string, string> = {...definition.storyTruth?.names, ...gmConsoleMetadata.relationships};
  for (const condition of homebrewConditions) labels[condition.id] = condition.name;
  for (const scene of scenes) labels[scene.id] = scene.title;
  for (const hero of state.heroSources) {
    labels[hero.id] = hero.name;
    for (const ability of hero.abilities) labels[ability.id] = ability.name;
  }
  for (const item of getGmItemCatalogue(scenes, state, definition)) {
    labels[item.id] = item.label;
    labels[toCampaignInspectableId(item.id)] = item.label;
  }
  for (const encounter of definition.encounters) {
    labels[encounter.id] = encounter.name;
    for (const unit of encounter.units ?? []) {
      labels[unit.id] = unit.name;
      if (unit.releaseAlly) labels[unit.releaseAlly.id] = unit.releaseAlly.name;
    }
  }
  for (const enemy of Object.values(state.combat?.enemies ?? {})) labels[enemy.id] = enemy.name;
  for (const ally of Object.values(state.combat?.allies ?? {})) labels[ally.id] = ally.name;
  for (const action of definition.combatActions) labels[action.id] = action.name;
  for (const scene of definition.storyScenes) for (const action of scene.actions) labels[action.id] = action.label;
  for (const [id, entry] of Object.entries({...gmConsoleMetadata.counters, ...gmConsoleMetadata.flags})) labels[id] = entry.label;
  for (const milestone of definition.doomMilestones ?? []) labels[milestone.flag] = milestone.label;
  return labels;
}

export function formatGmText(text: string, labels: Record<string, string>) {
  const ids = Object.keys(labels).filter(id => labels[id] !== id).sort((a, b) => b.length - a.length);
  if (!ids.length) return text;
  const escaped = ids.map(id => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return text.replace(new RegExp(`(?<![a-z0-9-])(?:${escaped.join('|')})(?![a-z0-9-])`, 'g'), id => labels[id]);
}

export function getGmUndoEntry(events: GalleryEvent[]) {
  const id = getLastUndoableCommandId(events);
  const command = events.filter(event => event.commandId === id);
  return command.find(event => event.type === 'scene-navigated')
    ?? command.find(event => event.type === 'manual-adjustment')
    ?? command.find(event => event.type === 'party-fully-rested')
    ?? command.find(event => event.type === 'story-action-resolved')
    ?? command.at(-1);
}

export function describeGmEvent(event: GalleryEvent | undefined, labels: Record<string, string>): string {
  if (!event) return 'Нет действий для отмены';
  const name = (id: string) => labels[id] ?? id;
  if (event.type === 'manual-adjustment') {
    const a = event.adjustment;
    if (a.kind === 'scene') return `Переход: ${name(a.sceneId)}`;
    if (a.kind === 'inventory-item') return `${a.acquired ? 'Предмет' : 'Убран'}: ${name(a.itemId)}${a.acquired ? ` · ${a.quantity} шт. · ${a.charges} зар.` : ''}`;
    if (a.kind === 'participant-stat') return `${name(a.participantId)}: ${{hp: 'здоровье', maxHp: 'максимум здоровья', ac: 'защита', attackBonus: 'бонус атаки', temporaryModifier: 'временный бонус'}[a.field]} → ${a.value}`;
    if (a.kind === 'flag') return labels[a.flag] ? `${name(a.flag)}: ${a.value ? 'да' : 'нет'}` : 'Ручное изменение сюжетного состояния';
    if (a.kind === 'counter') return `${name(a.counter)} → ${a.value}`;
    if (a.kind === 'dialogue-preset') return `Реплика ${name(a.speaker)}`;
    if (a.kind === 'condition') return `${name(a.participantId)}: ${a.active ? 'добавлено' : 'снято'} состояние «${name(a.conditionId)}»`;
    if (a.kind === 'initiative') return `Порядок ходов · раунд ${a.round}`;
    return formatGmText(event.label, labels);
  }
  if (event.type === 'story-action-resolved') return `${name(event.actionId)} · ${event.result === 'failure' ? 'неудача' : 'выполнено'}`;
  if (event.type === 'combat-started') return `Начат бой: ${name(event.encounterId)}`;
  if (event.type === 'item-changed') return `${event.acquired ? 'Получен' : 'Убран'}: ${name(event.itemId)}`;
  if (event.type === 'item-charge-changed') return `Изменены заряды: ${name(event.itemId)}`;
  if (event.type === 'flag-changed') return labels[event.flag] ? name(event.flag) : 'Обновлён прогресс сюжета';
  if (event.type === 'counter-changed') return `${name(event.counter)}: ${event.delta > 0 ? '+' : ''}${event.delta}`;
  if (event.type === 'action-corrected') return 'Предыдущее действие отменено';
  if (event.type === 'session-started') return 'Начато прохождение';
  if (event.type === 'scene-checkpoint-restored') return 'Возврат в начало сцены';
  if (event.type === 'scene-navigated') return `Переход: ${name(event.toPath.split('/').at(-1)?.split('?')[0] ?? '')}`;
  if (event.type === 'party-fully-rested') return 'Тайм-аут: полное HP всей группы, все навыки и заряды предметов восстановлены, включая лимиты на кампанию. Карточка израсходована.';
  if (event.type === 'safe-location-rested') return `Передышка: ${event.healing.map(h => `${name(h.heroId)} +${h.amount} HP (d8: ${h.roll})`).join(', ')}`;
  if (event.type === 'roll-entered') return event.result.text;
  if ('text' in event && event.text) return formatGmText(event.text, labels);
  if ('actionId' in event && event.actionId) return name(event.actionId);
  if (event.type === 'turn-advanced') return 'Ход передан дальше';
  if (event.type === 'clue-revealed') return 'В журнал добавлена сюжетная подсказка';
  return 'Обновлено игровое состояние';
}
