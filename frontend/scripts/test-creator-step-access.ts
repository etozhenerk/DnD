import assert from 'node:assert/strict';
import {getAvailableStepIndex} from '../src/widgets/character-creator/model/creator-access';
import type {FormValidation} from '../src/entities/character-form/model/types';
import {updateAppearance} from '../src/entities/character-form/model/update-appearance';
import {readAppearance} from '../src/entities/character-form/model/appearance';

const valid: FormValidation = {valid: true, issues: []};
assert.equal(getAvailableStepIndex({}, valid), 0, 'An empty form only opens Appearance');
assert.equal(getAvailableStepIndex({appearance: {displayName: 'Герой'}}, valid), 1);
assert.equal(getAvailableStepIndex({appearance: {}, class: {classId: 'fighter'}}, valid), 1,
  'Saving a later section must not skip the missing Race step');

const filled = {
  appearance: {displayName: 'Герой'}, race: {raceId: 'ice-wardens'}, class: {classId: 'fighter'},
  attributes: {}, abilities: {}, equipment: {items: []},
};
assert.equal(getAvailableStepIndex(filled, valid), 6, 'A verified form opens Review');
assert.equal(getAvailableStepIndex({...filled, equipment: undefined}, {
  valid: false, issues: [{path: 'equipment', code: 'invalid', message: 'Неверное снаряжение'}],
}), 5);
assert.equal(getAvailableStepIndex(filled, {
  valid: false, issues: [{path: 'attributes.strength', code: 'range', message: 'Неверная характеристика'}],
}), 3, 'Invalid attributes must lock abilities and everything after them');
assert.equal(getAvailableStepIndex(filled, {
  valid: false, issues: [{path: 'rulesetId', code: 'obsolete', message: 'Правила недоступны'}],
}), 0, 'An obsolete ruleset must not silently unlock steps');
assert.equal(getAvailableStepIndex({appearance: {displayName: ''}}, {
  valid: false, issues: [{path: 'appearance.displayName', code: 'required', message: 'Введите имя'}],
}), 0, 'A saved but incomplete section does not unlock the next step');
const emptyForm = {formData: {}, validation: {valid: false, issues: []}};
const withStory = updateAppearance(emptyForm, {story: 'История без имени'});
assert.equal(getAvailableStepIndex(withStory.formData, withStory.validation), 0);
const withName = updateAppearance(withStory, {displayName: 'Новый герой'});
assert.equal(getAvailableStepIndex(withName.formData, withName.validation), 1);
assert.equal(readAppearance(withName.formData).story, 'История без имени');
const clearedName = updateAppearance(withName, {displayName: '   '});
assert.equal(getAvailableStepIndex(clearedName.formData, clearedName.validation), 0);
assert.deepEqual(readAppearance({appearance: null}).personality, []);
assert.deepEqual(readAppearance({appearance: {personality: ['Терпеливый', 42]}}).personality, ['Терпеливый']);
console.log('Creator progression and appearance: empty, named, cleared, invalid, out-of-order and complete forms passed.');
