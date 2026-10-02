import {classProfiles, playableRaces, getBuildVitals} from '../../../entities/character-form';
import type {AdvisorProposal} from '../../../entities/character-advisor';

export function getProposalSummary(proposal: AdvisorProposal) {
  const form = proposal.formData;
  const profile = classProfiles.find((item) => item.id === form.class.classId);
  const race = playableRaces.find((item) => item.id === form.race.raceId);
  return {profile, race, vitals: getBuildVitals(form, form.attributes)};
}

export const proposalStatLabels: Record<string, string> = {
  strength: 'Сила', dexterity: 'Ловкость', constitution: 'Телосложение',
  wisdom: 'Мудрость', intelligence: 'Интеллект', charisma: 'Харизма',
};

export function getProposalScope(proposal: AdvisorProposal) {
  const titles = {name: 'Имя героя', appearance: 'Облик и история', race: 'Раса', class: 'Класс и характеристики', abilities: 'Навыки', equipment: 'Снаряжение'};
  return proposal.target ? {title: titles[proposal.target], notice: 'Изменит только этот раздел. Остальные поля и портрет останутся.'}
    : {title: 'Набросок героя', notice: 'Заменит поля анкеты. Портрет останется. Значения можно изменить перед сохранением.'};
}
