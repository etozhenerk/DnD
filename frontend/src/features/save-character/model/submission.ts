import type {CharacterFormData} from '../../../entities/character-form';
import {creationRules} from '../../../entities/character-form';

export type CharacterSubmission = {
  requestId: string;
  rulesetId: string;
  formData: Required<CharacterFormData>;
};

export function getSubmissionData(form: CharacterFormData): Omit<CharacterSubmission, 'requestId'> {
  const {appearance, race, class: characterClass, attributes, abilities, equipment} = form;
  if (!appearance || !race || !characterClass || !attributes || !abilities || !equipment) {
    throw new Error('Заполните все этапы перед сохранением.');
  }
  return {
    rulesetId: creationRules.classFoundation.rulesetId,
    formData: {appearance, race, class: characterClass, attributes, abilities, equipment},
  };
}

export type SaveAttempt = {fingerprint: string; submission: CharacterSubmission};

export function getSaveAttempt(form: CharacterFormData, previous: SaveAttempt | null): SaveAttempt {
  const data = getSubmissionData(form);
  const fingerprint = JSON.stringify(data);
  if (previous?.fingerprint === fingerprint) return previous;
  return {fingerprint, submission: {...data, requestId: crypto.randomUUID()}};
}
