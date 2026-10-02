import type {AdvisorContext, AdvisorStepId} from '../../../entities/character-advisor';
import type {CharacterFormData} from '../../../entities/character-form';

export function getAdvisorContext(stepId: AdvisorStepId, form: CharacterFormData): AdvisorContext {
  const appearance = form.appearance;
  const concept = JSON.stringify({
    story: appearance?.story, motivation: appearance?.motivation, personality: appearance?.personality,
    attributes: form.attributes,
    skills: form.abilities?.items.map(({name, description, profileId}) => ({name, description, profileId})),
    equipment: form.equipment?.items.map(({name}) => name),
  });
  return {stepId, name: [...(appearance?.displayName ?? '')].slice(0, 120).join(''),
    raceId: form.race?.raceId ?? '', classId: form.class?.classId ?? '',
    concept: [...concept].slice(0, 2000).join('')};
}
