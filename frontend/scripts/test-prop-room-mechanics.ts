import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  canAttemptPropRoomScepterCheck,
  resolvePropRoomScepterCheck,
  type PropRoomScepterCheckId,
} from '../src/entities/campaign-session/model/propRoomScepterRules.ts';

let scenarios = 0;

function scenario(name: string, run: () => void) {
  run();
  scenarios += 1;
  console.log(`  ✓ ${name}`);
}

function expectRecovery(checkId: PropRoomScepterCheckId, methodFlag: string) {
  const resolution = resolvePropRoomScepterCheck({}, checkId, true);
  assert.deepEqual(resolution, {kind: 'recovered', methodFlag});
}

console.log('Pussy Sultan prop-room mechanics:');

scenario('Линда освобождает стопор при успехе', () => {
  expectRecovery('recover-pussy-scepter-with-tiny-linda', 'prop-room-scepter-recovered-by-linda');
});

scenario('Ламберт разгружает лебёдку при успехе', () => {
  expectRecovery('recover-pussy-scepter-with-engineering', 'prop-room-scepter-recovered-by-lambert');
});

scenario('Головач Лена поднимает раму при успехе', () => {
  expectRecovery('recover-pussy-scepter', 'prop-room-scepter-recovered-by-strength');
});

scenario('провал Линды оставляет только силовой путь', () => {
  const resolution = resolvePropRoomScepterCheck({}, 'recover-pussy-scepter-with-tiny-linda', false);
  assert.deepEqual(resolution, {kind: 'force-only', failedFlag: 'prop-room-linda-failed'});
  const flags = {'prop-room-force-only': true, 'prop-room-linda-failed': true};
  assert.equal(canAttemptPropRoomScepterCheck(flags, 'recover-pussy-scepter-with-engineering'), false);
  assert.equal(canAttemptPropRoomScepterCheck(flags, 'recover-pussy-scepter'), true);
});

scenario('провал Ламберта оставляет только силовой путь', () => {
  const resolution = resolvePropRoomScepterCheck({}, 'recover-pussy-scepter-with-engineering', false);
  assert.deepEqual(resolution, {kind: 'force-only', failedFlag: 'prop-room-engineering-failed'});
  const flags = {'prop-room-force-only': true, 'prop-room-engineering-failed': true};
  assert.equal(canAttemptPropRoomScepterCheck(flags, 'recover-pussy-scepter-with-tiny-linda'), false);
  assert.equal(canAttemptPropRoomScepterCheck(flags, 'recover-pussy-scepter'), true);
});

scenario('провал силы переводит сцену в бой', () => {
  assert.deepEqual(
    resolvePropRoomScepterCheck({}, 'recover-pussy-scepter', false),
    {kind: 'combat', failedFlag: 'prop-room-strength-failed'},
  );
});

scenario('после пробуждения носильщиков проверки закрыты', () => {
  for (const checkId of [
    'recover-pussy-scepter-with-tiny-linda',
    'recover-pussy-scepter-with-engineering',
    'recover-pussy-scepter',
  ] satisfies PropRoomScepterCheckId[]) {
    assert.equal(canAttemptPropRoomScepterCheck({'prop-room-carriers-awakened': true}, checkId), false);
  }
});

scenario('полученный скипетр нельзя получить повторно', () => {
  assert.deepEqual(
    resolvePropRoomScepterCheck({'scepter-recovered': true}, 'recover-pussy-scepter', true),
    {kind: 'blocked'},
  );
});

scenario('в реквизиторской нет дублирующих кликов поверх арта', () => {
  const adventureSource = readFileSync(new URL(
    '../src/widgets/campaign-scene/ui/HotelGalleryAdventure/HotelGalleryAdventure.tsx',
    import.meta.url,
  ), 'utf8');

  assert.doesNotMatch(adventureSource, /prop-room-service-hatch|prop-room-winch|prop-room-palanquin-frame/);
  assert.doesNotMatch(adventureSource, /prop-room-collect-scepter|prop-room-return-scepter/);
});

console.log(`Prop-room mechanics: ${scenarios}/${scenarios} passed`);
