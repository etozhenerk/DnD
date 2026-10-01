import assert from 'node:assert/strict';
import {parseCharacter, parseCharacterList, parseCreatorCatalog} from '../src/entities/character/api/parse-character';

const summary = {
  id: 'cdfe3446-d207-4f64-9056-d3dc39947fdc',
  displayName: 'Герой проверки', raceId: 'ice-wardens', classId: 'fighter',
  maxHp: 40, baseAc: 14, createdAt: '2026-09-30T09:31:44Z',
};

assert.deepEqual(parseCharacterList({items: []}), []);
assert.deepEqual(parseCharacterList({items: [summary]}), [summary]);
assert.equal(parseCharacterList({items: [{...summary, portraitUrl: null}]})[0].portraitUrl, null);
assert.equal(parseCharacterList({items: [{...summary, portraitUrl: 'https://example.com/portrait.webp'}]})[0].portraitUrl,
  'https://example.com/portrait.webp');
assert.throws(() => parseCharacterList({items: [{...summary, portraitUrl: 42}]}));
assert.throws(() => parseCharacterList({items: [{...summary, id: 'not-a-uuid'}]}));
assert.throws(() => parseCharacterList({items: [{...summary, maxHp: Infinity}]}));
assert.throws(() => parseCharacterList({items: null}));

const character = parseCharacter({
  ...summary,
  attributes: {strength: 2, charisma: -1},
  abilities: [{id: 'manual-skill', name: 'Навык', uses: {scope: 'battle', max: 1}}],
  equipment: [{id: 'potion', name: 'Зелье', charges: {scope: 'campaign', max: 2}}],
});
assert.equal(character.story, '');
assert.deepEqual(character.personality, []);
assert.deepEqual(character.attributes, {strength: 2, charisma: -1});
assert.deepEqual(character.abilities[0].uses, {scope: 'battle', max: 1});
assert.deepEqual(character.equipment[0].charges, {scope: 'campaign', max: 2});
assert.equal(parseCharacter({...summary, equipment: [{id: 'sword', name: 'Меч'}]}).equipment[0].charges, null);
assert.throws(() => parseCharacter({...summary, attributes: {strength: '2'}}));

assert.deepEqual(parseCreatorCatalog({
  rulesetId: 'character-creation-v2',
  races: [{id: 'ice-wardens', name: 'Вахтёры Льда', privateField: 'unused'}],
  rules: {classProfiles: [{id: 'fighter', name: 'Воин', defaultStats: {strength: 2}}]},
}), {
  rulesetId: 'character-creation-v2',
  races: [{id: 'ice-wardens', name: 'Вахтёры Льда'}],
  classes: [{id: 'fighter', name: 'Воин'}],
});
console.log('Character API parsing: empty lists, old records, charges, catalog and invalid responses passed.');
