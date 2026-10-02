import type {AdvisorContext, AdvisorStepId} from '../../../entities/character-advisor';
import type {CharacterFormData} from '../../../entities/character-form';
import {getAdvisorSnapshot} from './advisor-snapshot';

function short(value = '', limit = 180) {
  return [...value].slice(0, limit).join('');
}

export function getAdvisorContext(stepId: AdvisorStepId, form: CharacterFormData): AdvisorContext {
  const appearance = form.appearance;
  const concept = JSON.stringify({
    story: short(appearance?.story, 300), motivation: short(appearance?.motivation),
    appearance: short(appearance?.appearance), pronouns: short(appearance?.pronouns, 40),
    personality: appearance?.personality.slice(0, 4).map((value) => short(value, 50)),
    attributes: form.attributes,
    skills: form.abilities?.items.slice(0, 3).map(({name, profileId}) => ({name: short(name, 80), profileId})),
    equipment: form.equipment?.items.slice(0, 5).map(({name}) => short(name, 60)),
  });
  return {stepId, name: short(appearance?.displayName, 120),
    raceId: form.race?.raceId ?? '', classId: form.class?.classId ?? '', concept, formData: getAdvisorSnapshot(form)};
}
