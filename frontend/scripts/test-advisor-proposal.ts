import assert from 'node:assert/strict';
import {readProposal} from '../src/entities/character-advisor/api/read-proposal';
import {canApplyCharacterProposal} from '../src/entities/character-form/model/proposal-validation';
import {classProfiles} from '../src/entities/character-form/model/creation-catalog';
import {applyAdvisorProposal} from '../src/entities/character-form/model/apply-advisor-proposal';

const proposal = {formData: {
  appearance: {displayName: 'Алес', pronouns: 'он', appearance: '', story: '', motivation: '', personality: ['Любопытный']},
  race: {raceId: 'elves'}, class: {classId: 'rogue'},
  attributes: classProfiles.find((profile) => profile.id === 'rogue')!.defaultStats,
  abilities: {basicAction: {name: 'Атака', description: '', modifierStat: 'dexterity'}, items: [], narrativeItems: []},
  equipment: {items: [{id: 'advisor-item-1', name: 'Плащ', description: 'С карманами'}]},
}};
const read = readProposal(proposal)!;
const current = {...read.formData, appearance: {...read.formData.appearance, displayName: 'Мой герой', story: 'Моя история'}};
const named = applyAdvisorProposal(current, read.formData, 'name');
assert.equal(named.appearance?.displayName, 'Алес');
assert.equal(named.appearance?.story, 'Моя история');
assert.equal(named.abilities, current.abilities);
assert.equal(named.attributes, current.attributes);
assert.equal(applyAdvisorProposal(current, read.formData, 'equipment').appearance, current.appearance);
assert.equal(applyAdvisorProposal(current, read.formData), read.formData);
assert.throws(() => readProposal({...proposal, target: 'admin'}));
assert.equal(canApplyCharacterProposal(read.formData), true);
assert.equal(readProposal(undefined), undefined);
assert.throws(() => readProposal({...proposal, formData: {...proposal.formData, attributes: {strength: 999}}}));
assert.throws(() => readProposal({...proposal, formData: {...proposal.formData, appearance: {...proposal.formData.appearance, displayName: {html: '<script>'}}}}));
assert.equal(canApplyCharacterProposal({...read.formData, race: {raceId: 'unknown'}}), false);
assert.equal(canApplyCharacterProposal({...read.formData, attributes: {...read.formData.attributes, strength: 4, dexterity: 4}}), false);
assert.equal(canApplyCharacterProposal({...read.formData, abilities: {...read.formData.abilities, items: [
  {id: 'one', name: 'x', description: '', modifierStat: 'wisdom', profileId: 'healing-2d8-once'},
  {id: 'two', name: 'y', description: '', modifierStat: 'wisdom', profileId: 'healing-d8-twice'},
]}}), false);
