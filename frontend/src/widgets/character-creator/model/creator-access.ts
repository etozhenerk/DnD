import type {CharacterDraft, DraftValidation} from '../../../entities/character-draft';
import {creatorSteps} from '../config/creator-steps';

export function getAvailableStepIndex(draft: CharacterDraft, validation: DraftValidation): number {
  const sections = creatorSteps.filter((step) => step.id !== 'review');
  const knownSections = new Set<string>(sections.map((step) => step.id));
  const hasGlobalIssue = validation.issues.some((issue) => !knownSections.has(issue.path.split('.')[0]));
  if (hasGlobalIssue) return 0;
  const incompleteIndex = sections.findIndex((step) => {
    if (!Object.hasOwn(draft.formData, step.id)) return true;
    return validation.issues.some((issue) => issue.path === step.id || issue.path.startsWith(`${step.id}.`));
  });
  return incompleteIndex < 0 ? sections.length : incompleteIndex;
}
