import {useState} from 'react';
import type {AdvisorProposal} from '../../../../entities/character-advisor';
import {canApplyCharacterProposal} from '../../../../entities/character-form';
import type {AdvisorProposalController} from '../../model/useAdvisorProposal';
import {AdvisorProposalDetails} from '../AdvisorProposalDetails';
import {getProposalScope} from '../../model/proposal-summary';
import styles from './AdvisorProposalCard.module.css';

export type AdvisorProposalCardProps = {
  proposal: AdvisorProposal; requestId: string; application: AdvisorProposalController; disabled: boolean;
};

export function AdvisorProposalCard({proposal, requestId, application, disabled}: AdvisorProposalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const applied = application.appliedId === requestId;
  const valid = canApplyCharacterProposal(proposal.formData);
  const scope = getProposalScope(proposal);
  return (
    <section className={styles.card} aria-label="Предложение заполнения">
      <span className={styles.eyebrow}>{scope.title}</span>
      <h3>{proposal.formData.appearance.displayName}</h3>
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Свернуть значения' : 'Посмотреть значения'}
      </button>
      {expanded && <AdvisorProposalDetails proposal={proposal} />}
      {expanded && !applied && <div className={styles.actions}>
        <small>{scope.notice}</small>
        <button type="button" disabled={disabled || !valid} onClick={() => application.apply(requestId, proposal)}>Применить вариант</button>
      </div>}
      {applied && <div className={styles.actions}><p role="status">✦ Форма заполнена</p>
        {application.canUndo && <button type="button" disabled={disabled} onClick={application.undo}>Отменить заполнение</button>}
      </div>}
      {!valid && <p role="status">Правила изменились. Попроси советника собрать новый вариант.</p>}
    </section>
  );
}
