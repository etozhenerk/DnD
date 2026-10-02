import {useState} from 'react';
import {applyAdvisorProposal, canApplyCharacterProposal} from '../../../entities/character-form';
import type {CharacterFormData} from '../../../entities/character-form';
import type {AdvisorProposal} from '../../../entities/character-advisor';

export function useAdvisorProposal(form: CharacterFormData, onApply: (form: CharacterFormData) => void) {
  const [last, setLast] = useState<{id: string; before: CharacterFormData; after: CharacterFormData} | null>(null);
  function apply(id: string, proposal: AdvisorProposal) {
    if (!canApplyCharacterProposal(proposal.formData)) return;
    const after = applyAdvisorProposal(form, proposal.formData, proposal.target);
    setLast({id, before: form, after});
    onApply(after);
  }
  function undo() {
    if (!last || form !== last.after) return;
    onApply(last.before);
    setLast(null);
  }
  return {apply, undo, appliedId: last?.id ?? null, canUndo: !!last && form === last.after};
}

export type AdvisorProposalController = ReturnType<typeof useAdvisorProposal>;
