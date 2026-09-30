import assert from 'node:assert/strict';
import {getAvailableStepIndex} from '../src/widgets/character-creator/model/creator-access';
import type {CharacterDraft, DraftValidation} from '../src/entities/character-draft/model/types';

const draft: CharacterDraft = {
  id: 'cdfe3446-d207-4f64-9056-d3dc39947fdc', rulesetId: 'character-creation-v2',
  formData: {}, createdAt: '2026-09-30T09:31:44Z', updatedAt: '2026-09-30T09:31:44Z',
};
const valid: DraftValidation = {valid: true, issues: []};
assert.equal(getAvailableStepIndex(draft, valid), 0, 'An empty draft only opens Appearance');
assert.equal(getAvailableStepIndex({...draft, formData: {appearance: {displayName: 'Герой'}}}, valid), 1);
assert.equal(getAvailableStepIndex({...draft, formData: {appearance: {}, class: {classId: 'fighter'}}}, valid), 1,
  'Saving a later section must not skip the missing Race step');

const filled = {
  appearance: {displayName: 'Герой'}, race: {raceId: 'ice-wardens'}, class: {classId: 'fighter'},
  attributes: {}, abilities: {}, equipment: {items: []},
};
assert.equal(getAvailableStepIndex({...draft, formData: filled}, valid), 6, 'A verified draft opens Review');
assert.equal(getAvailableStepIndex({...draft, formData: {...filled, equipment: undefined}}, {
  valid: false, issues: [{path: 'equipment', code: 'invalid', message: 'Неверное снаряжение'}],
}), 5);
assert.equal(getAvailableStepIndex({...draft, formData: filled}, {
  valid: false, issues: [{path: 'attributes.strength', code: 'range', message: 'Неверная характеристика'}],
}), 3, 'Invalid attributes must lock abilities and everything after them');
assert.equal(getAvailableStepIndex({...draft, formData: filled}, {
  valid: false, issues: [{path: 'rulesetId', code: 'obsolete', message: 'Правила недоступны'}],
}), 0, 'An obsolete ruleset must not silently unlock steps');
assert.equal(getAvailableStepIndex({...draft, formData: {appearance: {displayName: ''}}}, {
  valid: false, issues: [{path: 'appearance.displayName', code: 'required', message: 'Введите имя'}],
}), 0, 'A saved but incomplete section does not unlock the next step');
console.log('Creator progression: empty, saved, invalid, out-of-order and complete drafts passed.');
