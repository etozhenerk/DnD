import assert from 'node:assert/strict';
import {getAdvisorImageIntent} from '../src/features/chat-with-advisor/lib/image-intent';
import {isAdvisorPlayerMessage} from '../src/features/chat-with-advisor/lib/player-message';
import {getAdvisorSuggestionTarget} from '../src/widgets/character-creator/model/advisor-target';
import type {AdvisorContext, AdvisorTurn} from '../src/entities/character-advisor';

const context: AdvisorContext = {stepId: 'abilities', name: 'Тарен', raceId: 'elves', classId: 'rogue', concept: '',
  formData: {abilities: {items: [{id: 'spark', name: 'Искра', description: 'Огненный огонёк'}, {id: 'heal', name: 'Лесная помощь', description: 'Целебный свет'}]}}};
assert.deepEqual(getAdvisorImageIntent('Сгенерируй ещё аватарку в полный рост', context, ''), {kind: 'portrait'});
assert.deepEqual(getAdvisorImageIntent('Нарисуй портрет героя в зелёном плаще', context, ''), {kind: 'portrait'});
assert.deepEqual(getAdvisorImageIntent('сгенерь иконку', context, 'heal'), {kind: 'icon', target: 'heal'});
assert.deepEqual(getAdvisorImageIntent('Создай иконку для Искра', context, 'heal'), {kind: 'icon', target: 'spark'});
for (const message of ['Как сгенерировать портрет?', 'Не рисуй портрет', 'Придумай историю художника',
  'Нарисуй портрет и иконку', 'Собери героя и нарисуй портрет', 'Нарисуй все иконки', 'Иконка плохая']) {
  assert.equal(getAdvisorImageIntent(message, context, ''), null, message);
}
assert.equal(getAdvisorImageIntent('Нарисуй иконку', {...context, formData: {}}, ''), null);
assert.equal(getAdvisorSuggestionTarget('attributes'), 'class');
assert.equal(getAdvisorSuggestionTarget('appearance'), 'appearance');
assert.equal(getAdvisorSuggestionTarget('equipment'), 'equipment');
assert.equal(getAdvisorSuggestionTarget('review'), 'full');

const parent: AdvisorTurn = {requestId: 'text', mode: 'chat', message: 'Нарисуй героя', reply: 'Рисую', status: 'succeeded',
  accountedMicroRub: 0, createdAt: '', action: {requestId: 'image', kind: 'portrait', prompt: 'Служебное описание'}};
const image = {requestId: 'image', mode: 'portrait' as const, message: 'Служебное описание', context};
assert.equal(isAdvisorPlayerMessage(parent, [parent], new Set()), true);
assert.equal(isAdvisorPlayerMessage(image, [parent], new Set()), false);
assert.equal(isAdvisorPlayerMessage({...image, requestId: 'typed'}, [], new Set(['typed'])), true);
assert.equal(isAdvisorPlayerMessage({...image, requestId: 'button'}, [], new Set()), false);
assert.equal(isAdvisorPlayerMessage({...image, mode: 'comment'}, [], new Set(['image'])), false);
