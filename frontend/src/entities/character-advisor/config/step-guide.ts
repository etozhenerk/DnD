import source from '../../../../../shared/advisor/guide.json';
import type {AdvisorStep, AdvisorStepId} from '../model/types';

const stepIds = ['appearance', 'race', 'class', 'attributes', 'abilities', 'equipment', 'review'] as const;

function readGuide(): AdvisorStep[] {
  if (source.version !== 'character-advisor-v1' || source.steps.length !== stepIds.length) {
    throw new Error('Unsupported advisor guide');
  }
  return source.steps.map((step, index) => {
    const id = stepIds[index];
    if (step.id !== id || !step.intro.trim() || !step.text.trim() || !step.placeholder.trim()) {
      throw new Error('Invalid advisor step');
    }
    return {...step, id};
  });
}

const steps = readGuide();

// Entry hints are bundled, so changing a step never waits for a network request.
export function getAdvisorStep(stepId: AdvisorStepId): AdvisorStep {
  const step = steps.find((item) => item.id === stepId);
  if (!step) throw new Error('Missing advisor step');
  return step;
}
