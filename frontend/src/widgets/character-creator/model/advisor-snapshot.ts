import type {CharacterFormData} from '../../../entities/character-form';

function excerpt(value: string, limit: number) { return [...value].slice(0, limit).join(''); }

// A transient context excerpt; the editable form and player text remain untouched.
export function getAdvisorSnapshot(form: CharacterFormData): CharacterFormData {
  const a = form.appearance;
  return {
    ...form,
    ...(a ? {appearance: {...a, appearance: excerpt(a.appearance, 180), story: excerpt(a.story, 240),
      motivation: excerpt(a.motivation, 120), personality: a.personality.slice(0, 5).map((item) => excerpt(item, 60))}} : {}),
    ...(form.abilities ? {abilities: {...form.abilities,
      basicAction: {...form.abilities.basicAction, description: excerpt(form.abilities.basicAction.description, 120)},
      items: form.abilities.items.slice(0, 3).map((item) => ({...item, name: excerpt(item.name, 80), description: excerpt(item.description, 180)})),
      narrativeItems: form.abilities.narrativeItems.slice(0, 3).map((item) => ({...item, name: excerpt(item.name, 80), description: excerpt(item.description, 120)})),
    }} : {}),
    ...(form.equipment ? {equipment: {items: form.equipment.items.slice(0, 8).map((item) => ({...item, name: excerpt(item.name, 80), description: excerpt(item.description, 80)}))}} : {}),
  };
}
