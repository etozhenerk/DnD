import {creatorSteps} from '../config/creator-steps';

export function getCreatorNavigation(id: string) {
  const index = creatorSteps.findIndex((step) => step.id === id);
  if (index < 0) return null;
  return {
    step: creatorSteps[index], number: index + 1,
  };
}
