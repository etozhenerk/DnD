import {createPartyRewardInventory} from './partyRewards';
import type {CombatUsageScope} from '../../combat/model/types';
import type {GalleryGameplayDefinition, GalleryHeroSource} from './galleryGameplay';
import type {GalleryEvent, GalleryInventoryItemState} from './gallerySession';

export const GALLERY_SESSION_VERSION = 25;

const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const USAGE_SCOPES = new Set<CombatUsageScope>(['turn', 'round', 'battle', 'location', 'campaign']);
const COMBAT_CONDITIONS = new Set(['blinded', 'attack-disadvantage', 'prone', 'stunned']);
const COMBAT_DAMAGE_TYPES = new Set(['physical', 'cold', 'fire', 'poison', 'arcane']);
const COMBAT_ATTACK_RANGES = new Set(['melee', 'ranged']);
const COMBAT_STATUS_KINDS = new Set([
  'cold-resistance',
  'dragonborn-armour',
  'poison-resistance',
  'northern-ward',
  'bubis-balance',
  'attack-advantage',
  'guided-turn',
  'studied-target',
  'temporary-hp',
  'survival-instinct',
  'dive-ready',
  'resonance',
  'wind-guard',
  'tech-recalculation',
  'confused',
  'commanded-strike',
  'jammed',
  'heat-reactor',
  'heat-charge',
  'inspired',
  'bonus-damage',
  'critical-focus',
  'burning',
  'surveilled',
  'helping-reaction',
  'last-push',
  'beast-challenge',
  'critical-opening', 'grease-trap', 'guest-critical', 'retaliating-crown', 'movement-spent',
]);
const EVENT_TYPES = new Set([
  'session-started',
  'view-changed',
  'scene-navigated',
  'flag-changed',
  'counter-changed',
  'relationship-changed',
  'item-changed',
  'item-charge-changed',
  'clue-revealed',
  'ending-selected',
  'story-action-resolved',
  'roll-entered',
  'ability-used',
  'manual-adjustment',
  'npc-action-selected',
  'dialogue-preset-chosen',
  'safe-location-rested',
  'party-fully-rested',
  'combat-started',
  'combat-attack-resolved',
  'combat-attack-cancelled',
  'combat-damage-resolved',
  'healing-applied',
  'combat-action-used',
  'combat-action-selected',
  'combat-item-equipped',
  'combat-stance-changed',
  'combat-enemies-summoned',
  'combat-allies-summoned',
  'combat-ac-modifier-applied',
  'combat-attack-modifier-applied',
  'combat-stat-modifier-applied',
  'combat-status-applied',
  'combat-status-removed',
  'combat-saving-throw-requested',
  'combat-saving-throw-resolved',
  'combat-condition-changed',
  'combat-weakness-exposed',
  'combat-weakness-cleared',
  'combat-log-added',
  'combat-phase-advanced',
  'turn-advanced',
  'combat-ended',
  'combat-cleared',
  'action-corrected',
  'scene-checkpoint-restored',
]);
const COUNTERS = new Set([
  'doom',
  'kreed-evidence-count',
  'show18-contradictions-broken',
  'timePressure',
  'preFinalCombats',
  'show18LiveSuccesses',
  'show18TeleprompterSuccesses',
  'show18Failures',
  'groomTunnelSuccesses',
  'groomTunnelFailures',
  'restoreLogSuccesses',
  'restoreLogFailures',
]);
const VIEWS = new Set([
  'gallery',
  'pussy',
  'prop-room',
  'archive',
  'kraken',
  'guards',
  'combat',
  'closed-bar',
]);

export interface GallerySessionSeed {
  campaignId: string;
  sessionVersion: typeof GALLERY_SESSION_VERSION;
  definitionId: string;
  definitionVersion: number;
  startedAt: string;
  heroSources: GalleryHeroSource[];
  initialInventoryState: Record<string, GalleryInventoryItemState>;
  initialLocationId: string;
}

export interface GallerySessionJournalExpectation {
  campaignId: string;
  definitionId: string;
  definitionVersion: number;
}

export type GalleryEventLogParseResult =
  | {ok: true; events: GalleryEvent[]}
  | {ok: false; error: string};

export interface StoredGallerySessionEnvelope {
  version: typeof GALLERY_SESSION_VERSION;
  campaignId: string;
  updatedAt: string;
  events: GalleryEvent[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown, min: number, max: number) {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

function isFiniteNumber(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function isText(value: unknown, max = 4_000) {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

export function isSafeJournalId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 180 && SAFE_ID.test(value);
}

function isIdArray(value: unknown, allowEmpty = false) {
  return Array.isArray(value)
    && (allowEmpty || value.length > 0)
    && value.length <= 100
    && value.every(isSafeJournalId)
    && new Set(value).size === value.length;
}

function isNumericChange(value: unknown) {
  return isObject(value)
    && (value.mode === 'set' || value.mode === 'delta')
    && isFiniteNumber(value.value, -999_999, 999_999);
}

function isUsageScope(value: unknown): value is CombatUsageScope {
  return typeof value === 'string' && USAGE_SCOPES.has(value as CombatUsageScope);
}

function isHeroSource(value: unknown) {
  if (!isObject(value)) return false;
  if (
    !isSafeJournalId(value.id)
    || !isText(value.name, 240)
    || !isInteger(value.hp, 0, 99_999)
    || !isInteger(value.maxHp, 1, 99_999)
    || !isInteger(value.ac, 0, 999)
    || !isObject(value.stats)
    || !Object.values(value.stats).every((stat) => isFiniteNumber(stat, -100, 100))
    || !Array.isArray(value.abilities)
    || !Array.isArray(value.items)
  ) return false;
  const sourceIsValid = (source: unknown, kind: 'ability' | 'item') => {
    if (!isObject(source) || !isSafeJournalId(source.id) || !isText(source.name, 240)) return false;
    if (kind === 'ability') {
      return source.uses === undefined
        || source.uses === null
        || (isObject(source.uses) && isUsageScope(source.uses.scope) && isInteger(source.uses.max, 1, 99));
    }
    return source.charges === undefined
      || source.charges === null
      || isInteger(source.charges, 0, 99)
      || (isObject(source.charges) && isUsageScope(source.charges.scope) && isInteger(source.charges.max, 0, 99));
  };
  return value.abilities.every((source) => sourceIsValid(source, 'ability'))
    && value.items.every((source) => sourceIsValid(source, 'item'));
}

function isInventoryItemState(value: unknown) {
  return isObject(value)
    && (value.ownerId === null || isSafeJournalId(value.ownerId))
    && isInteger(value.quantity, 0, 99)
    && isInteger(value.charges, 0, 99)
    && (value.maxCharges === null || isInteger(value.maxCharges, 0, 99))
    && (value.chargeScope === null || isUsageScope(value.chargeScope))
    && (value.maxCharges !== null || value.chargeScope === null)
    && (value.maxCharges === null || Number(value.charges) <= Number(value.maxCharges));
}

function isSessionSeed(value: unknown, expectation: GallerySessionJournalExpectation) {
  if (!isObject(value)) return false;
  if (
    value.campaignId !== expectation.campaignId
    || !isSafeJournalId(value.campaignId)
    || value.sessionVersion !== GALLERY_SESSION_VERSION
    || value.definitionId !== expectation.definitionId
    || !isSafeJournalId(value.definitionId)
    || value.definitionVersion !== expectation.definitionVersion
    || !isInteger(value.definitionVersion, 1, 999_999)
    || !isText(value.startedAt, 80)
    || Number.isNaN(Date.parse(String(value.startedAt)))
    || !isSafeJournalId(value.initialLocationId)
    || !Array.isArray(value.heroSources)
    || value.heroSources.length === 0
    || !value.heroSources.every(isHeroSource)
    || new Set(value.heroSources.map((hero) => (hero as {id: string}).id)).size !== value.heroSources.length
    || !isObject(value.initialInventoryState)
  ) return false;
  const heroIds = new Set(value.heroSources.map((hero) => (hero as {id: string}).id));
  return Object.entries(value.initialInventoryState).every(([itemId, item]) => (
    isSafeJournalId(itemId)
    && isInventoryItemState(item)
    && ((item as GalleryInventoryItemState).ownerId === null
      || heroIds.has((item as GalleryInventoryItemState).ownerId!))
  ));
}

function isRollResult(value: unknown) {
  return isObject(value)
    && isSafeJournalId(value.checkId)
    && isSafeJournalId(value.heroId)
    && ['strength', 'dexterity', 'wisdom', 'intelligence', 'charisma'].includes(String(value.stat))
    && Array.isArray(value.rolls)
    && value.rolls.length <= 2
    && (value.automatic === true ? value.rolls.length === 0 : value.rolls.length >= 1)
    && value.rolls.every((roll) => isInteger(roll, 1, 20))
    && isFiniteNumber(value.modifier, -100, 100)
    && isFiniteNumber(value.total, -100, 200)
    && isInteger(value.dc, 0, 100)
    && typeof value.success === 'boolean'
    && typeof value.automatic === 'boolean'
    && isText(value.text);
}

function isPendingAttack(value: unknown) {
  return isObject(value)
    && isSafeJournalId(value.actorId)
    && isText(value.actorName, 240)
    && isSafeJournalId(value.targetId)
    && isText(value.targetName, 240)
    && isText(value.attackName, 240)
    && (value.automatic === undefined || typeof value.automatic === 'boolean')
    && (isInteger(value.natural, 1, 20) || (value.automatic === true && value.natural === 0))
    && isFiniteNumber(value.bonus, -100, 100)
    && isFiniteNumber(value.total, -100, 200)
    && isFiniteNumber(value.targetAc, 0, 999)
    && typeof value.critical === 'boolean'
    && isText(value.damageExpression, 80)
    && (value.range === undefined || COMBAT_ATTACK_RANGES.has(String(value.range)))
    && (value.rerolledFrom === undefined || isInteger(value.rerolledFrom, 1, 20))
    && (value.bonusDamageDice === undefined || (
      Array.isArray(value.bonusDamageDice)
      && value.bonusDamageDice.length > 0
      && value.bonusDamageDice.length <= 12
      && value.bonusDamageDice.every((bonus) => isObject(bonus)
        && isText(bonus.expression, 40)
        && isText(bonus.label, 120))
    ))
    && (value.damageType === undefined || COMBAT_DAMAGE_TYPES.has(String(value.damageType)))
    && (value.rollMode === undefined || ['normal', 'advantage', 'disadvantage'].includes(String(value.rollMode)))
    && (value.secondaryTargetId === undefined || isSafeJournalId(value.secondaryTargetId))
    && (value.secondaryTargetName === undefined || isText(value.secondaryTargetName, 240))
    && ((value.secondaryTargetId === undefined) === (value.secondaryTargetName === undefined))
    && (value.onHitSavingThrow === undefined || isOnHitSavingThrow(value.onHitSavingThrow));
}

function isOnHitSavingThrow(value: unknown) {
  return isObject(value)
    && ['strength', 'dexterity', 'constitution', 'wisdom', 'intelligence', 'charisma'].includes(String(value.stat))
    && isInteger(value.dc, 1, 100)
    && (
      COMBAT_CONDITIONS.has(String(value.failureCondition))
      || (Array.isArray(value.failureConditions)
        && value.failureConditions.length > 0
        && value.failureConditions.length <= 4
        && value.failureConditions.every((condition) => COMBAT_CONDITIONS.has(String(condition))))
    )
    && ['next-attack', 'next-turn'].includes(String(value.duration));
}

function isSummonedAttack(value: unknown) {
  return isObject(value)
    && isText(value.name, 240)
    && isFiniteNumber(value.bonus, -100, 100)
    && isText(value.damage, 80)
    && (value.range === undefined || COMBAT_ATTACK_RANGES.has(String(value.range)))
    && (value.damageType === undefined || COMBAT_DAMAGE_TYPES.has(String(value.damageType)))
    && (value.onHitSavingThrow === undefined || isOnHitSavingThrow(value.onHitSavingThrow));
}

function isCombatAlly(value: unknown) {
  return isObject(value)
    && isSafeJournalId(value.id)
    && isSafeJournalId(value.ownerId)
    && isText(value.name, 240)
    && isInteger(value.hp, 1, 99_999)
    && isInteger(value.maxHp, 1, 99_999)
    && Number(value.hp) <= Number(value.maxHp)
    && isFiniteNumber(value.ac, 0, 999)
    && isFiniteNumber(value.initiative, -100, 100)
    && isInteger(value.expiresAfterRound, 1, 99_999)
    && (value.remainingTurns === undefined || isInteger(value.remainingTurns, 0, 99_999))
    && (value.token === undefined || isText(value.token, 1_000))
    && isSummonedAttack(value.attack);
}

function isCombatAcModifier(value: unknown) {
  return isObject(value)
    && isSafeJournalId(value.id)
    && isSafeJournalId(value.sourceActorId)
    && isIdArray(value.targetIds)
    && isFiniteNumber(value.amount, -100, 100)
    && isSafeJournalId(value.expiresAtTurnStartOf);
}

function isCombatAttackModifier(value: unknown) {
  return isObject(value)
    && isSafeJournalId(value.id)
    && isSafeJournalId(value.sourceActorId)
    && isIdArray(value.targetIds)
    && (value.againstTargetIds === undefined || isIdArray(value.againstTargetIds))
    && isFiniteNumber(value.amount, -100, 100)
    && typeof value.consumeOnAttack === 'boolean'
    && (value.expiresAtTurnStartOf === undefined || isSafeJournalId(value.expiresAtTurnStartOf));
}

function isCombatStatModifier(value: unknown) {
  return isObject(value)
    && isSafeJournalId(value.id)
    && isSafeJournalId(value.sourceActorId)
    && isSafeJournalId(value.targetId)
    && ['strength', 'dexterity', 'constitution', 'wisdom', 'intelligence', 'charisma'].includes(String(value.stat))
    && isFiniteNumber(value.amount, -100, 100);
}

function isCombatStatus(value: unknown) {
  return isObject(value)
    && isSafeJournalId(value.id)
    && COMBAT_STATUS_KINDS.has(String(value.kind))
    && isSafeJournalId(value.sourceActorId)
    && (value.againstTargetId === undefined || isSafeJournalId(value.againstTargetId))
    && isSafeJournalId(value.targetId)
    && isInteger(value.charges, 0, 99)
    && (value.amount === undefined || isFiniteNumber(value.amount, 0, 99_999))
    && (value.retaliationDamage === undefined || isInteger(value.retaliationDamage, 0, 99_999))
    && (value.consumedByIds === undefined || isIdArray(value.consumedByIds, true))
    && (value.expiresAtTurnStartOf === undefined || isSafeJournalId(value.expiresAtTurnStartOf));
}

function isPendingSavingThrow(value: unknown) {
  if (!isObject(value)) return false;
  const kind = value.kind === undefined ? 'on-hit' : String(value.kind);
  const enemySkill = value.enemySkill;
  const validEnemySkill = isObject(enemySkill) && isSafeJournalId(enemySkill.actionId) && isText(enemySkill.actionName, 240)
    && isIdArray(enemySkill.remainingTargetIds, true) && isInteger(enemySkill.damage, 0, 99999)
    && (enemySkill.damageType === undefined || COMBAT_DAMAGE_TYPES.has(String(enemySkill.damageType)))
    && (enemySkill.successAttackBonus === undefined || isFiniteNumber(enemySkill.successAttackBonus, 0, 100));
  const areaDamage = value.areaDamage;
  const validAreaDamage = isObject(areaDamage)
    && isSafeJournalId(areaDamage.actionId)
    && isText(areaDamage.actionName, 240)
    && isInteger(areaDamage.damage, 0, 99_999)
    && (areaDamage.damageType === undefined || COMBAT_DAMAGE_TYPES.has(String(areaDamage.damageType)))
    && typeof areaDamage.halfOnSuccess === 'boolean'
    && (areaDamage.failureStatus === undefined || COMBAT_STATUS_KINDS.has(String(areaDamage.failureStatus)))
    && isIdArray(areaDamage.remainingTargetIds, true);
  return isSafeJournalId(value.sourceActorId)
    && isText(value.sourceName, 240)
    && isSafeJournalId(value.targetId)
    && isText(value.targetName, 240)
    && ['strength', 'dexterity', 'constitution', 'wisdom', 'intelligence', 'charisma'].includes(String(value.stat))
    && isFiniteNumber(value.modifier, -100, 100)
    && isInteger(value.dc, kind === 'action-healing' ? 0 : 1, 100)
    && Array.isArray(value.failureConditions)
    && (kind === 'enemy-skill' || (kind === 'on-hit' ? value.failureConditions.length > 0 : value.failureConditions.length === 0))
    && value.failureConditions.length <= 4
    && value.failureConditions.every((condition) => COMBAT_CONDITIONS.has(String(condition)))
    && ['next-attack', 'next-turn'].includes(String(value.duration))
    && ['on-hit', 'area-damage-save', 'area-damage-status', 'enemy-skill', 'action-healing', 'enemy-attack-reroll'].includes(kind)
    && (value.actionName === undefined || isText(value.actionName, 240))
    && (value.rollExpression === undefined || isText(value.rollExpression, 80))
    && (kind === 'action-healing' ? isObject(value.healing) && isInteger(value.healing.maxHp, 1, 99_999)
      && typeof value.healing.endTurn === 'boolean' && isText(value.rollExpression, 80)
      : kind === 'enemy-attack-reroll' ? isObject(value.attackReroll) && isInteger(value.attackReroll.firstRoll, 1, 20)
        && isSafeJournalId(value.attackReroll.targetId) && value.rollExpression === '1d20'
        : kind === 'enemy-skill' ? validEnemySkill : kind === 'on-hit' ? areaDamage === undefined : validAreaDamage);
}

function isEnemyAttack(value: unknown) {
  if (!isObject(value)) return false;
  if (
    !isSafeJournalId(value.id)
    || !isText(value.name, 240)
    || !isFiniteNumber(value.bonus, -100, 100)
    || !isText(value.damage, 80)
    || (value.range !== undefined && !COMBAT_ATTACK_RANGES.has(String(value.range)))
    || (value.damageType !== undefined && !COMBAT_DAMAGE_TYPES.has(String(value.damageType)))
    || (value.attacks !== undefined && !isInteger(value.attacks, 1, 20))
  ) return false;
  if (value.savingThrow === undefined) return true;
  return isObject(value.savingThrow)
    && ['strength', 'dexterity', 'constitution', 'wisdom', 'intelligence', 'charisma']
      .includes(String(value.savingThrow.stat))
    && isInteger(value.savingThrow.dc, 0, 100)
    && (value.savingThrow.condition === 'shamed' || value.savingThrow.condition === 'assigned-role');
}

function isManualAdjustment(value: unknown) {
  if (!isObject(value) || typeof value.kind !== 'string') return false;
  switch (value.kind) {
    case 'participant-stat': return isSafeJournalId(value.participantId)
      && ['hp', 'maxHp', 'ac', 'attackBonus', 'temporaryModifier'].includes(String(value.field))
      && isFiniteNumber(value.value, -999, 99_999);
    case 'inventory-item': return isSafeJournalId(value.itemId)
      && typeof value.acquired === 'boolean'
      && (value.ownerId === null || isSafeJournalId(value.ownerId))
      && isInteger(value.quantity, 0, 99)
      && isInteger(value.charges, 0, 99);
    case 'condition': return isSafeJournalId(value.participantId)
      && isSafeJournalId(value.conditionId)
      && typeof value.active === 'boolean';
    case 'flag': return isSafeJournalId(value.flag) && typeof value.value === 'boolean';
    case 'counter': return typeof value.counter === 'string'
      && COUNTERS.has(value.counter)
      && isInteger(value.value, 0, 999_999);
    case 'initiative': return isIdArray(value.order)
      && isInteger(value.turnIndex, 0, (value.order as unknown[]).length - 1)
      && isInteger(value.round, 1, 999_999);
    case 'npc-override': return isSafeJournalId(value.enemyId)
      && isSafeJournalId(value.actionId)
      && (value.targetId === '' || isSafeJournalId(value.targetId))
      && isIdArray(value.targetIds, true)
      && typeof value.confirmed === 'boolean'
      && typeof value.skipped === 'boolean'
      && (value.explanation === '' || isText(value.explanation));
    case 'dialogue-preset': return isSafeJournalId(value.sceneId)
      && isSafeJournalId(value.presetId)
      && isSafeJournalId(value.speaker)
      && isText(value.text, 2_000);
    case 'scene': return isSafeJournalId(value.sceneId)
      && (value.previousSceneId === undefined || isSafeJournalId(value.previousSceneId))
      && (value.previousSceneSearch === undefined || value.previousSceneSearch === '' || (typeof value.previousSceneSearch === 'string' && /^\?view=(stas|dancers|device)$/.test(value.previousSceneSearch)));
    case 'relationship': return isSafeJournalId(value.relationshipId)
      && isFiniteNumber(value.value, -999_999, 999_999);
    case 'location': return isSafeJournalId(value.locationId)
      && (value.stateValue === undefined || value.stateValue === null || isText(value.stateValue, 500));
    case 'location-state': return isSafeJournalId(value.locationId)
      && (value.value === null || isText(value.value, 500));
    default: return false;
  }
}

function isEventPayloadValid(event: Record<string, unknown>, expectation: GallerySessionJournalExpectation) {
  switch (event.type) {
    case 'session-started': return isSessionSeed(event.seed, expectation);
    case 'view-changed': return typeof event.view === 'string' && VIEWS.has(event.view);
    case 'scene-navigated': return [event.fromPath, event.toPath].every((path) =>
      typeof path === 'string' && /^\/campaign\/[a-z0-9-]+\/play\/[a-z0-9-]+(?:\?view=(?:stas|dancers|device))?$/.test(path));
    case 'flag-changed': return isSafeJournalId(event.flag) && typeof event.value === 'boolean';
    case 'counter-changed': return typeof event.counter === 'string'
      && COUNTERS.has(event.counter)
      && isFiniteNumber(event.delta, -999_999, 999_999);
    case 'relationship-changed': return isSafeJournalId(event.relationshipId) && isNumericChange(event.change);
    case 'item-changed': return isSafeJournalId(event.itemId)
      && typeof event.acquired === 'boolean'
      && (event.quantity === undefined || isInteger(event.quantity, 1, 99));
    case 'item-charge-changed': return isSafeJournalId(event.itemId) && isNumericChange(event.change);
    case 'clue-revealed': return isSafeJournalId(event.clueId);
    case 'ending-selected': return event.endingId === null || isSafeJournalId(event.endingId);
    case 'story-action-resolved': return isSafeJournalId(event.actionId)
      && ['automatic', 'success', 'failure'].includes(String(event.result))
      && isSafeJournalId(event.sceneId);
    case 'roll-entered': return isRollResult(event.result);
    case 'ability-used': return isSafeJournalId(event.abilityId);
    case 'manual-adjustment': return isText(event.label, 140)
      && isText(event.reason, 500)
      && isManualAdjustment(event.adjustment);
    case 'npc-action-selected': return isSafeJournalId(event.enemyId)
      && isSafeJournalId(event.actionId)
      && (event.targetId === '' || isSafeJournalId(event.targetId))
      && isIdArray(event.targetIds, true)
      && typeof event.confirmed === 'boolean'
      && typeof event.skipped === 'boolean'
      && (event.explanation === '' || isText(event.explanation));
    case 'dialogue-preset-chosen': return isSafeJournalId(event.sceneId)
      && isSafeJournalId(event.presetId)
      && isSafeJournalId(event.speaker)
      && isText(event.text, 2_000);
    case 'party-fully-rested': return isSafeJournalId(event.consumedItemId);
    case 'safe-location-rested': return isSafeJournalId(event.locationId)
      && Array.isArray(event.healing)
      && event.healing.length > 0
      && event.healing.length <= 20
      && event.healing.every((entry) => isObject(entry)
        && isSafeJournalId(entry.heroId)
        && isInteger(entry.roll, 1, 8)
        && isInteger(entry.amount, 0, 8));
    case 'combat-started': return isSafeJournalId(event.encounterId) && isIdArray(event.initiativeOrder);
    case 'combat-attack-resolved': return isPendingAttack(event.attack)
      && typeof event.hit === 'boolean'
      && isText(event.text);
    case 'combat-attack-cancelled': return isText(event.text);
    case 'combat-damage-resolved': return isSafeJournalId(event.targetId)
      && isInteger(event.amount, 0, 99_999)
      && isText(event.text);
    case 'healing-applied': return isSafeJournalId(event.targetId)
      && isInteger(event.amount, 0, 99_999)
      && isInteger(event.maxHp, 1, 99_999)
      && isText(event.text);
    case 'combat-action-used': return isSafeJournalId(event.actionId)
      && isSafeJournalId(event.sourceId)
      && isSafeJournalId(event.resourceKey)
      && isUsageScope(event.scope)
      && isInteger(event.max, 1, 99);
    case 'combat-action-selected': return isSafeJournalId(event.actionId) && typeof event.selected === 'boolean';
    case 'combat-item-equipped': return isSafeJournalId(event.heroId)
      && (event.actionId === null || isSafeJournalId(event.actionId));
    case 'combat-stance-changed': return isSafeJournalId(event.participantId)
      && ['airborne', 'tiny'].includes(String(event.stance))
      && typeof event.active === 'boolean'
      && isText(event.text);
    case 'combat-enemies-summoned': return Array.isArray(event.enemies) && event.enemies.length > 0 && event.enemies.length <= 8
      && event.enemies.every((enemy) => isObject(enemy) && isSafeJournalId(enemy.id) && isSafeJournalId(enemy.summonedBy)
        && isText(enemy.name, 240) && isInteger(enemy.hp, 1, 999) && isInteger(enemy.maxHp, 1, 999)
        && isInteger(enemy.ac, 0, 100) && isFiniteNumber(enemy.initiative, -100, 100)
        && isInteger(enemy.remainingTurns, 1, 20) && isEnemyAttack(enemy.attack)
        && (enemy.token === undefined || isText(enemy.token, 1000))) && isText(event.text);
    case 'combat-allies-summoned': return Array.isArray(event.allies)
      && event.allies.length >= 1
      && event.allies.length <= 8
      && event.allies.every(isCombatAlly)
      && new Set(event.allies.map((ally) => isObject(ally) ? ally.id : null)).size === event.allies.length
      && isText(event.text);
    case 'combat-ac-modifier-applied': return isCombatAcModifier(event.modifier) && isText(event.text);
    case 'combat-attack-modifier-applied': return isCombatAttackModifier(event.modifier) && isText(event.text);
    case 'combat-stat-modifier-applied': return isCombatStatModifier(event.modifier) && isText(event.text);
    case 'combat-status-applied': return isCombatStatus(event.status)
      && (event.text === undefined || isText(event.text));
    case 'combat-status-removed': return isSafeJournalId(event.statusId)
      && (event.text === undefined || isText(event.text));
    case 'combat-saving-throw-requested': return isPendingSavingThrow(event.savingThrow);
    case 'combat-saving-throw-resolved': return isText(event.text);
    case 'combat-condition-changed': return isSafeJournalId(event.participantId)
      && COMBAT_CONDITIONS.has(String(event.condition))
      && typeof event.active === 'boolean'
      && (event.bypassImmunity === undefined || typeof event.bypassImmunity === 'boolean')
      && (event.text === undefined || isText(event.text));
    case 'combat-weakness-exposed': return isText(event.text);
    case 'combat-weakness-cleared': return (event.ac === undefined || isFiniteNumber(event.ac, 0, 999))
      && (event.text === undefined || isText(event.text));
    case 'combat-log-added': return isText(event.text);
    case 'combat-phase-advanced': return isInteger(event.phase, 1, 100)
      && isText(event.name, 240)
      && isFiniteNumber(event.ac, 0, 999)
      && isEnemyAttack(event.attack)
      && isText(event.text);
    case 'turn-advanced': return true;
    case 'combat-ended': return isText(event.text);
    case 'combat-cleared': return isSafeJournalId(event.encounterId);
    case 'scene-checkpoint-restored': return isInteger(event.eventCount, 1, 10000000);
    case 'action-corrected': return isSafeJournalId(event.correctedCommandId);
    default: return false;
  }
}

/** Strict parser used both by localStorage and by pure replay tests. */
export function parseGalleryEventLog(
  input: unknown,
  expectation: GallerySessionJournalExpectation,
): GalleryEventLogParseResult {
  if (!Array.isArray(input) || input.length === 0) return {ok: false, error: 'empty-event-log'};
  const eventIds = new Set<string>();
  const completedCommandIds = new Set<string>();
  const commandScopeIds = new Map<string, string | undefined>();
  let activeCommandId: string | null = null;
  for (let index = 0; index < input.length; index += 1) {
    const event = input[index];
    if (
      !isObject(event)
      || !isSafeJournalId(event.id)
      || !isSafeJournalId(event.commandId)
      || (event.sceneScopeId !== undefined && !isSafeJournalId(event.sceneScopeId))
    ) {
      return {ok: false, error: `invalid-event-meta:${index}`};
    }
    if (event.type === 'scene-checkpoint-restored' && (Number(event.eventCount) > index
      || (Number(event.eventCount) < index && input[Number(event.eventCount) - 1]?.commandId === input[Number(event.eventCount)]?.commandId))) {
      return {ok: false, error: `invalid-checkpoint:${index}`};
    }
    if (eventIds.has(event.id)) return {ok: false, error: `duplicate-event-id:${event.id}`};
    eventIds.add(event.id);
    if (event.commandId !== activeCommandId) {
      if (activeCommandId !== null) completedCommandIds.add(activeCommandId);
      if (completedCommandIds.has(event.commandId)) {
        return {ok: false, error: `repeated-command-group:${event.commandId}`};
      }
      activeCommandId = event.commandId;
    }
    if (
      commandScopeIds.has(event.commandId)
      && commandScopeIds.get(event.commandId) !== event.sceneScopeId
    ) return {ok: false, error: `inconsistent-command-scope:${event.commandId}`};
    commandScopeIds.set(event.commandId, event.sceneScopeId);
    if (typeof event.type !== 'string' || !EVENT_TYPES.has(event.type)) {
      return {ok: false, error: `unknown-event-type:${index}`};
    }
    if ((index === 0) !== (event.type === 'session-started')) {
      return {ok: false, error: index === 0 ? 'session-start-required' : 'duplicate-session-start'};
    }
    if (!isEventPayloadValid(event, expectation)) return {ok: false, error: `invalid-event:${event.type}:${index}`};
  }
  const firstCommandIndexes = new Map<string, number>();
  input.forEach((event, index) => {
    const commandId = (event as {commandId: string}).commandId;
    if (!firstCommandIndexes.has(commandId)) firstCommandIndexes.set(commandId, index);
  });
  for (let index = 0; index < input.length; index += 1) {
    const event = input[index];
    if (
      isObject(event)
      && event.type === 'action-corrected'
      && (
        !firstCommandIndexes.has(String(event.correctedCommandId))
        || Number(firstCommandIndexes.get(String(event.correctedCommandId))) >= index
        || event.correctedCommandId === event.commandId
        || event.correctedCommandId === (input[0] as {commandId: string}).commandId
      )
    ) return {ok: false, error: `invalid-correction:${String(event.correctedCommandId)}`};
  }
  return {ok: true, events: input as GalleryEvent[]};
}

export function parseStoredGallerySessionEnvelope(
  input: unknown,
  expectation: GallerySessionJournalExpectation,
): GalleryEventLogParseResult {
  if (!isObject(input)) return {ok: false, error: 'invalid-envelope'};
  if (
    input.version !== GALLERY_SESSION_VERSION
    || input.campaignId !== expectation.campaignId
    || !isText(input.updatedAt, 80)
    || Number.isNaN(Date.parse(String(input.updatedAt)))
  ) return {ok: false, error: 'incompatible-envelope'};
  return parseGalleryEventLog(input.events, expectation);
}

export function createStoredGallerySessionEnvelope(
  events: GalleryEvent[],
  expectation: GallerySessionJournalExpectation,
  updatedAt = new Date().toISOString(),
): StoredGallerySessionEnvelope | null {
  const parsed = parseGalleryEventLog(events, expectation);
  if (!parsed.ok || Number.isNaN(Date.parse(updatedAt))) return null;
  return {
    version: GALLERY_SESSION_VERSION,
    campaignId: expectation.campaignId,
    updatedAt,
    events: parsed.events,
  };
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const LEGACY_INVENTORY_ID_MIGRATIONS: Record<string, string> = {
  'egorik-recording': 'recording-for-egorik',
};

export function normalizeGalleryInitialInventoryIds(itemIds: string[]) {
  return [...new Set(itemIds.map((itemId) => LEGACY_INVENTORY_ID_MIGRATIONS[itemId] ?? itemId))];
}

function createInitialInventoryState(
  heroes: GalleryHeroSource[],
  existingInventory: string[],
): Record<string, GalleryInventoryItemState> {
  const state: Record<string, GalleryInventoryItemState> = {};
  heroes.forEach((hero) => hero.items.forEach((item) => {
    const maxCharges = typeof item.charges === 'number'
      ? item.charges
      : item.charges && typeof item.charges === 'object'
        ? item.charges.max
        : null;
    const chargeScope = typeof item.charges === 'number'
      ? 'campaign'
      : item.charges && typeof item.charges === 'object'
        ? item.charges.scope
        : null;
    state[item.id] = {
      ownerId: hero.id,
      quantity: 1,
      charges: maxCharges ?? 0,
      maxCharges,
      chargeScope,
    };
  }));
  normalizeGalleryInitialInventoryIds(existingInventory).forEach((itemId) => {
    if (!isSafeJournalId(itemId) || state[itemId]) return;
    state[itemId] = createPartyRewardInventory(itemId)
      ?? {ownerId: null, quantity: 1, charges: 0, maxCharges: null, chargeScope: null};
  });
  return state;
}

export function createGallerySessionStartedEvent(input: {
  definition: GalleryGameplayDefinition;
  heroes: GalleryHeroSource[];
  existingInventory?: string[];
  eventId: string;
  commandId: string;
  startedAt?: string;
}): Extract<GalleryEvent, {type: 'session-started'}> {
  const seed: GallerySessionSeed = {
    campaignId: input.definition.campaignId,
    sessionVersion: GALLERY_SESSION_VERSION,
    definitionId: input.definition.id,
    definitionVersion: input.definition.version,
    startedAt: input.startedAt ?? new Date().toISOString(),
    heroSources: cloneJson(input.heroes),
    initialInventoryState: createInitialInventoryState(input.heroes, input.existingInventory ?? []),
    initialLocationId: input.definition.sceneId,
  };
  return cloneJson({
    id: input.eventId,
    commandId: input.commandId,
    type: 'session-started' as const,
    seed,
  });
}
