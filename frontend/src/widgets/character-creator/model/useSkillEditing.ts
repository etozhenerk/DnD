import {useState} from 'react';
import {abilityRules} from '../../../entities/character-form';
import type {CharacterFormController, CustomAbility, NarrativeAbility} from '../../../entities/character-form';

export function useSkillEditing(controller: CharacterFormController) {
  const [selectedId, selectSkill] = useState('basic-attack');
  const {skills, setSection, confirmSection} = controller;
  const update = (changes: Partial<typeof skills>) => setSection('abilities', {...skills, ...changes});
  return {
    selectedId,
    selectSkill,
    selectedSkill: skills.items.find((skill) => skill.id === selectedId),
    changeBasic: (basicAction: typeof skills.basicAction) => update({basicAction}),
    addSkill: () => {
      if (skills.items.length >= abilityRules.budget.maximumCustomAbilities) return;
      const id = 'skill-' + crypto.randomUUID();
      update({items: [...skills.items, {id, name: '', description: '', profileId: '', modifierStat: skills.basicAction.modifierStat}]});
      selectSkill(id);
    },
    changeSkill: (skill: CustomAbility) => update({items: skills.items.map((item) => item.id === skill.id ? skill : item)}),
    removeSkill: (id: string) => {
      update({items: skills.items.filter((item) => item.id !== id)});
      selectSkill('basic-attack');
    },
    addNarrative: () => {
      if (skills.narrativeItems.length >= abilityRules.narrativeAbilities.maximum) return;
      update({narrativeItems: [...skills.narrativeItems, {id: 'feature-' + crypto.randomUUID(), name: '', description: ''}]});
    },
    changeNarrative: (item: NarrativeAbility) => update({narrativeItems: skills.narrativeItems.map((current) => current.id === item.id ? item : current)}),
    removeNarrative: (id: string) => update({narrativeItems: skills.narrativeItems.filter((item) => item.id !== id)}),
    confirm: () => { setSection('abilities', skills); confirmSection('abilities'); },
  };
}
