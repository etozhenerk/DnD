import assert from 'node:assert/strict';
import {classProfiles} from '../src/entities/character-form/model/creation-catalog';
import {getAttributeBalance, getBuildVitals} from '../src/entities/character-form/model/attribute-balance';
import {getAttributeAdjustment} from '../src/entities/character-form/model/attribute-adjustment';
import {createEmptySkills, getSkillBalance} from '../src/entities/character-form/model/skill-balance';
import {validateForm} from '../src/entities/character-form/model/form-validation';
import {readAppearance} from '../src/entities/character-form/model/appearance';
import type {CharacterFormData} from '../src/entities/character-form/model/build-types';
import {getAvailableStepIndex} from '../src/widgets/character-creator/model/creator-access';

for (const profile of classProfiles) {
  assert.deepEqual(getAttributeBalance(profile.defaultStats, profile).issues, [], profile.id + ' preset must be valid');
  assert.equal(getAttributeBalance(profile.baseStats, profile).spent, 0, profile.id + ' foundation spends no bonus points');
  assert.equal(getAttributeBalance(profile.baseStats, profile).remaining, 4);
  assert.ok(Object.values(profile.baseStats).some((value) => value < 0), profile.id + ' foundation has a weakness');
  assert.ok(Object.values(profile.defaultStats).some((value) => value < 0), profile.id + ' recommendation retains a weakness');
}
const fighter = classProfiles.find((profile) => profile.id === 'fighter')!;
const form: CharacterFormData = {
  appearance: {...readAppearance({}), displayName: 'Тестовый герой'},
  race: {raceId: 'elves'}, class: {classId: fighter.id}, attributes: {...fighter.defaultStats},
  abilities: createEmptySkills(), equipment: {items: []},
};
assert.deepEqual(getBuildVitals(form, fighter.defaultStats), {maxHp: 40, baseAc: 14});
assert.deepEqual(getBuildVitals(form, {...fighter.defaultStats, constitution: -4, dexterity: -4}), {maxHp: 28, baseAc: 10});
assert.equal(getAvailableStepIndex(form, validateForm(form, new Set())), 4, 'Optional skills require deliberate confirmation');
assert.equal(getAvailableStepIndex(form, validateForm(form, new Set(['abilities']))), 5);
assert.equal(validateForm(form, new Set(['abilities', 'equipment'])).valid, true, 'Empty equipment and no active skills are allowed');
const overspent = {...form, attributes: {...fighter.defaultStats, strength: 4}};
assert.equal(getAvailableStepIndex(overspent, validateForm(overspent, new Set(['abilities', 'equipment']))), 3,
  'Invalid attributes must relock later stages, even after previous confirmation');
const baseStrength = getAttributeAdjustment('strength', fighter.baseStats, fighter);
assert.equal(baseStrength.canDecrease, false, 'Class strength cannot be erased');
assert.equal(baseStrength.nextCost, 4);
assert.equal(baseStrength.canIncrease, true);
const specialized = {...fighter.baseStats, strength: 4};
assert.deepEqual(getAttributeBalance(specialized, fighter).issues, []);
assert.equal(getAttributeAdjustment('dexterity', specialized, fighter).canIncrease, false, 'Spent bonus budget blocks another increase');
assert.equal(getAttributeAdjustment('strength', specialized, fighter).canDecrease, true, 'A player can refund their own bonus');
assert.ok(getAttributeBalance({...fighter.defaultStats, strength: 2, charisma: 2}, fighter).issues.includes(
  'Нельзя уменьшить характеристики ниже основы класса.',
), 'Buying another specialization cannot replace the class base');
assert.equal(getAvailableStepIndex({...form, appearance: {...form.appearance!, displayName: ' '}}, validateForm(
  {...form, appearance: {...form.appearance!, displayName: ' '}}, new Set(['abilities', 'equipment']),
)), 0, 'Clearing the name relocks the entire flow');
const skills = createEmptySkills();
skills.items = [
  {id: 'skill-one', name: 'Навык один', description: '', modifierStat: 'strength', profileId: 'damage-2d8-once'},
  {id: 'skill-two', name: 'Навык два', description: '', modifierStat: 'wisdom', profileId: 'healing-d8-twice'},
];
assert.deepEqual(getSkillBalance(skills), {spent: 6, remaining: 0, issues: []});
assert.ok(getSkillBalance({...skills, items: [...skills.items, {...skills.items[0], id: 'skill-three'}]}).issues.length > 0,
  'Duplicate profiles and overspending must reject the skill collection');
assert.ok(getSkillBalance({...skills, basicAction: {...skills.basicAction, modifierStat: 'constitution'}}).issues.length > 0,
  'Constitution cannot power attacks');
assert.equal(getAvailableStepIndex(form, validateForm({...form, race: {raceId: 'ice-dragons'}}, new Set(['abilities', 'equipment']))), 1,
  'Encountered races are unavailable for creation');
console.log('Character creation: presets, derived values, progression, empty optional sections and invalid skills passed.');
