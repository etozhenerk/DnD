import type {AdvisorProposal} from '../../../../entities/character-advisor';
import {getProfileLabel} from '../../../../entities/character-form';
import {getProposalSummary, proposalStatLabels} from '../../model/proposal-summary';
import styles from './AdvisorProposalDetails.module.css';

export type AdvisorProposalDetailsProps = {proposal: AdvisorProposal};

export function AdvisorProposalDetails({proposal}: AdvisorProposalDetailsProps) {
  const form = proposal.formData;
  const summary = getProposalSummary(proposal);
  const target = proposal.target;
  const identity = !target || target === 'appearance';
  const build = !target || target === 'class';
  return (
    <div className={styles.details}>
      <dl>
        {target === 'name' && <><dt>Имя</dt><dd>{form.appearance.displayName}</dd></>}
        {(!target || target === 'race' || target === 'class') && <><dt>Раса и класс</dt><dd>{summary.race?.name} · {summary.profile?.name}</dd></>}
        {identity && <>
        <dt>Облик</dt><dd>{form.appearance.appearance || 'Не задан'}</dd>
        <dt>Местоимения</dt><dd>{form.appearance.pronouns || 'Не заданы'}</dd>
        <dt>История</dt><dd>{form.appearance.story || 'Не задана'}</dd>
        <dt>Мотив</dt><dd>{form.appearance.motivation || 'Не задан'}</dd>
        <dt>Характер</dt><dd>{form.appearance.personality.join(', ') || 'Не задан'}</dd>
        </>}
        {build && <>
        <dt>Характеристики</dt><dd className={styles.stats}>{Object.entries(form.attributes).map(([stat, value]) => (
          <span key={stat}>{proposalStatLabels[stat]} <b>{value > 0 ? '+' : ''}{value}</b></span>
        ))}</dd>
        <dt>Здоровье и защита</dt><dd>{summary.vitals?.maxHp} HP · {summary.vitals?.baseAc} AC</dd>
        </>}
        {(!target || target === 'abilities') && <>
        <dt>Базовая атака</dt><dd>{form.abilities.basicAction.name} · {proposalStatLabels[form.abilities.basicAction.modifierStat]}</dd>
        </>}
      </dl>
      {(!target || target === 'abilities') && <>
      <h4>Навыки</h4>
      {form.abilities.items.map((skill) => <p key={skill.id}><strong>{skill.name}</strong> — {skill.description}
        <small>{getProfileLabel(skill.profileId)} · {proposalStatLabels[skill.modifierStat]}</small></p>)}
      {!form.abilities.items.length && <p>Только базовая атака.</p>}
      </>}
      {(!target || target === 'equipment') && <>
      <h4>Снаряжение</h4>
      {form.equipment.items.map((item) => <p key={item.id}><strong>{item.name}</strong> — {item.description}</p>)}
      {!form.equipment.items.length && <p>Без снаряжения.</p>}
      </>}
    </div>
  );
}
