import type {AdvisorProposal} from '../model/proposal-types';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid advisor proposal');
  return value as Record<string, unknown>;
}

function text(value: unknown, max = 1000): string {
  if (typeof value !== 'string' || [...value].length > max || value.includes('\0')) throw new Error('Invalid proposal text');
  return value;
}

function array(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error('Invalid proposal list');
  return value;
}

function action(value: unknown) {
  const data = object(value);
  return {name: text(data.name, 120), description: text(data.description), modifierStat: text(data.modifierStat, 80)};
}

export function readProposal(value: unknown): AdvisorProposal | undefined {
  if (value === undefined) return undefined;
  const envelope = object(value);
  const data = object(envelope.formData);
  const targets = ['name', 'appearance', 'race', 'class', 'abilities', 'equipment'] as const;
  const target = targets.find((item) => item === envelope.target);
  if (envelope.target !== undefined && !target) throw new Error('Invalid proposal target');
  const appearance = object(data.appearance);
  const skills = object(data.abilities);
  const attributes = object(data.attributes);
  const stats = ['strength', 'dexterity', 'constitution', 'wisdom', 'intelligence', 'charisma'];
  if (Object.keys(attributes).length !== stats.length) throw new Error('Invalid proposal attributes');
  const entries = stats.map((key): [string, number] => {
    const value = attributes[key];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < -4 || value > 4) throw new Error('Invalid proposal stat');
    return [key, value];
  });
  return {target, formData: {
    appearance: {displayName: text(appearance.displayName, 120), pronouns: text(appearance.pronouns),
      appearance: text(appearance.appearance), story: text(appearance.story), motivation: text(appearance.motivation),
      personality: array(appearance.personality, 5).map((item) => text(item, 120))},
    race: {raceId: text(object(data.race).raceId, 80)}, class: {classId: text(object(data.class).classId, 80)},
    attributes: Object.fromEntries(entries),
    abilities: {basicAction: action(skills.basicAction),
      items: array(skills.items, 3).map((value) => {
        const item = object(value);
        return {...action(item), id: text(item.id, 80), profileId: text(item.profileId, 80)};
      }),
      narrativeItems: array(skills.narrativeItems, 3).map((value) => {
        const item = object(value);
        return {id: text(item.id, 80), name: text(item.name, 120), description: text(item.description)};
      })},
    equipment: {items: array(object(data.equipment).items, 8).map((value) => {
      const item = object(value);
      return {id: text(item.id, 80), name: text(item.name, 120), description: text(item.description)};
    })},
  }};
}
