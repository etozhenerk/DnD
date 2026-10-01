import {readArray, readNumber, readObject, readOptionalString, readString, readUuid} from '../../../shared/lib/json-fields';
import type {CharacterSummary, CreatedCharacter, CreatedCharacterAbility, CreatedCharacterItem, CreatorCatalog} from '../model/created-character';

export function parseCharacterSummary(value: unknown): CharacterSummary {
  const data = readObject(value);
  const summary: CharacterSummary = {
    id: readUuid(data.id), displayName: readString(data.displayName),
    raceId: readString(data.raceId), classId: readString(data.classId),
    maxHp: readNumber(data.maxHp), baseAc: readNumber(data.baseAc),
    createdAt: readString(data.createdAt),
  };
  if (data.portraitUrl !== undefined) {
    summary.portraitUrl = data.portraitUrl === null ? null : readString(data.portraitUrl);
  }
  return summary;
}

export function parseCharacterList(value: unknown): CharacterSummary[] {
  return readArray(readObject(value).items).map(parseCharacterSummary);
}

export function parseCreatorCatalog(value: unknown): CreatorCatalog {
  const data = readObject(value);
  const readEntry = (entry: unknown) => {
    const item = readObject(entry);
    return {id: readString(item.id), name: readString(item.name)};
  };
  return {
    rulesetId: readString(data.rulesetId),
    races: readArray(data.races).map(readEntry),
    classes: readArray(readObject(data.rules).classProfiles).map(readEntry),
  };
}

export function parseCharacter(value: unknown): CreatedCharacter {
  const data = readObject(value);
  const attributes = Object.fromEntries(Object.entries(readObject(data.attributes ?? {}))
    .map(([key, amount]) => [key, readNumber(amount)]));
  return {
    ...parseCharacterSummary(data),
    pronouns: readOptionalString(data.pronouns), roleLabel: readOptionalString(data.roleLabel),
    story: readOptionalString(data.story), motivation: readOptionalString(data.motivation),
    appearance: readOptionalString(data.appearance),
    personality: readArray(data.personality ?? []).map(readString), attributes,
    abilities: readArray(data.abilities ?? []).map(parseAbility),
    equipment: readArray(data.equipment ?? []).map(parseItem),
    rulesetId: readOptionalString(data.rulesetId),
  };
}

function parseAbility(value: unknown): CreatedCharacterAbility {
  const data = readObject(value);
  const uses = data.uses == null ? null : readObject(data.uses);
  return {
    id: readString(data.id), name: readString(data.name),
    description: readOptionalString(data.description), effectText: readOptionalString(data.effectText),
    uses: uses ? {scope: readString(uses.scope), max: readNumber(uses.max)} : null,
  };
}

function parseItem(value: unknown): CreatedCharacterItem {
  const data = readObject(value);
  const charges = data.charges == null ? null : readObject(data.charges);
  return {
    id: readString(data.id), name: readString(data.name),
    description: readOptionalString(data.description), effectText: readOptionalString(data.effectText),
    charges: charges ? {scope: readString(charges.scope), max: readNumber(charges.max)} : null,
  };
}
