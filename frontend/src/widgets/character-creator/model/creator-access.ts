import type {FormValidation} from '../../../entities/character-form';
import {creatorSteps} from '../config/creator-steps';

export function getAvailableStepIndex(formData: Record<string, unknown>, validation: FormValidation): number {
  const sections = creatorSteps.filter((step) => step.id !== 'review');
  const knownSections = new Set<string>(sections.map((step) => step.id));
  const hasGlobalIssue = validation.issues.some((issue) => !knownSections.has(issue.path.split('.')[0]));
  if (hasGlobalIssue) return 0;
  const incompleteIndex = sections.findIndex((step) => {
    if (!Object.hasOwn(formData, step.id)) return true;
    return validation.issues.some((issue) => issue.path === step.id || issue.path.startsWith(`${step.id}.`));
  });
  return incompleteIndex < 0 ? sections.length : incompleteIndex;
}
