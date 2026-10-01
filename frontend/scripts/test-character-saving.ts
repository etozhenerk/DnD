import assert from 'node:assert/strict';
import {getSaveAttempt, getSubmissionData} from '../src/features/save-character/model/submission';
import {getSaveIssues} from '../src/features/save-character/model/save-errors';
import {ApiError} from '../src/shared/api/http/api-error';
import type {CharacterFormData} from '../src/entities/character-form/model/build-types';

const form: CharacterFormData = {
  appearance: {displayName: 'Путешественник', pronouns: '', appearance: '', story: '', motivation: '', personality: []},
  race: {raceId: 'humans'}, class: {classId: 'fighter'},
  attributes: {strength: 4, dexterity: 1, constitution: 2, wisdom: 1, intelligence: -1, charisma: 0},
  abilities: {basicAction: {name: 'Клинок', description: '', modifierStat: 'strength'}, items: [], narrativeItems: []},
  equipment: {items: []},
};

const first = getSaveAttempt(form, null);
assert.equal(first.submission.rulesetId, 'character-creation-v3');
assert.match(first.submission.requestId, /^[0-9a-f-]{36}$/);
assert.equal(getSaveAttempt(form, first), first, 'network retry must preserve the creation ID');
assert.equal(getSaveAttempt(structuredClone(form), first), first, 'an equivalent form must preserve the receipt');
const edited = getSaveAttempt({...form, appearance: {...form.appearance!, displayName: 'Другой герой'}}, first);
assert.notEqual(edited.submission.requestId, first.submission.requestId, 'changed form uses a new attempt');
assert.throws(() => getSubmissionData({}), /Заполните/);
assert.equal('maxHp' in first.submission.formData, false, 'server computes vitals');
assert.equal('effects' in first.submission.formData.abilities.basicAction, false, 'server computes effects');
assert.deepEqual(getSaveIssues(new ApiError('Validation', 422, 'validation_failed', {
  issues: [{path: 'abilities.items.0.name', message: 'Введите имя'}, {path: 'rulesetId', message: 'Обновите правила'}],
})), [
  {path: 'abilities.items.0.name', message: 'Введите имя', step: 'abilities'},
  {path: 'rulesetId', message: 'Обновите правила', step: 'review'},
]);
assert.deepEqual(getSaveIssues(new Error('Network')), []);
assert.deepEqual(getSaveIssues(new ApiError('Malformed', 422, 'validation_failed', {issues: [null, {}]})), []);
console.log('Character saving: retry identity, changed form, server-owned fields and validation links passed.');

const withPortrait = getSaveAttempt(form, first, 'portrait-a');
assert.notEqual(withPortrait.submission.requestId, first.submission.requestId);
assert.equal(getSaveAttempt(form, withPortrait, 'portrait-a'), withPortrait);
assert.notEqual(getSaveAttempt(form, withPortrait, 'portrait-b').submission.requestId, withPortrait.submission.requestId);
