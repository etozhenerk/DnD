import type {AdvisorStepId} from '../../../entities/character-advisor';

export function getAdvisorSuggestionTarget(step: AdvisorStepId): string {
  if (step === 'attributes') return 'class';
  if (step === 'review') return 'full';
  return step;
}
