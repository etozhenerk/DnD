import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  canAttemptPussyAudienceCheck,
  getPussyTrustDc,
  getPussyAudienceViewId,
  PUSSY_BAR_PASSES_ITEM_ID,
} from '../src/entities/campaign-session/model/pussyAudienceRules.ts';
import {
  replayGalleryEvents,
  type GalleryEvent,
} from '../src/entities/campaign-session/model/gallerySession.ts';
import {createGallerySessionStartedEvent} from '../src/entities/campaign-session/model/gallerySessionJournal.ts';
import gameplayData from '../content/campaigns/penisuela-gallery-gameplay.json' with {type: 'json'};
import sessionPreviewData from '../content/campaigns/penisuela-session-preview.json' with {type: 'json'};
import charactersData from '../content/characters.json' with {type: 'json'};
import type {
  GalleryGameplayDefinition,
  GalleryHeroSource,
} from '../src/entities/campaign-session/model/galleryGameplay.ts';

const penisuelaGalleryGameplay = gameplayData as GalleryGameplayDefinition;
const partyIds = new Set(sessionPreviewData.party.map((member) => member.characterId));
const penisuelaGalleryHeroes = (charactersData as GalleryHeroSource[])
  .filter((hero) => partyIds.has(hero.id));

let scenarios = 0;

function scenario(name: string, run: () => void) {
  run();
  scenarios += 1;
  console.log(`  ✓ ${name}`);
}

console.log('Pussy Sultan audience mechanics:');

scenario('Бубсильда и Линда получают DC 7, остальные — DC 12', () => {
  assert.equal(getPussyTrustDc('bubsilda'), 7);
  assert.equal(getPussyTrustDc('linda'), 7);
  assert.equal(getPussyTrustDc('lambert'), 12);
  assert.equal(getPussyTrustDc('golovach-lena'), 12);
  assert.equal(getPussyTrustDc('thorin-pukoshchit'), 12);
});

scenario('доверие доступно один раз, а запугивание — только после отказа', () => {
  assert.equal(canAttemptPussyAudienceCheck({}, 'earn-pussy-trust'), true);
  assert.equal(canAttemptPussyAudienceCheck({}, 'intimidate-pussy'), false);
  assert.equal(canAttemptPussyAudienceCheck({'pussy-trust-refused': true}, 'earn-pussy-trust'), false);
  assert.equal(canAttemptPussyAudienceCheck({'pussy-trust-refused': true}, 'intimidate-pussy'), true);
  assert.equal(canAttemptPussyAudienceCheck({
    'pussy-trust-refused': true,
    'pussy-guards-summoned': true,
  }, 'intimidate-pussy'), false);
});

scenario('канон содержит одну проверку доверия для всех пяти героев и Харизму DC 14 для угрозы', () => {
  const trust = penisuelaGalleryGameplay.checks.find((check) => check.id === 'earn-pussy-trust');
  const intimidation = penisuelaGalleryGameplay.checks.find((check) => check.id === 'intimidate-pussy');
  assert.ok(trust);
  assert.equal(trust.eligibleHeroIds, undefined);
  assert.equal(trust.dc, 12);
  assert.deepEqual(trust.dcOverrides, [{heroIds: ['bubsilda', 'linda'], dc: 7}]);
  assert.ok(intimidation);
  assert.deepEqual(intimidation.stats, ['charisma']);
  assert.equal(intimidation.dc, 14);
  assert.equal(intimidation.eligibleHeroIds, undefined);
});

scenario('бой состоит ровно из трёх VIP-стражников и не имеет отдельного исхода поражения', () => {
  const encounter = penisuelaGalleryGameplay.encounters
    .find((candidate) => candidate.id === 'hotel-vip-guards');
  assert.ok(encounter);
  assert.equal(encounter.units?.length, 3);
  assert.equal(encounter.hp, 22);
  assert.equal(encounter.ac, 12);
  assert.equal(encounter.initiative, 1);
  assert.equal(encounter.attack.bonus, 4);
  assert.equal(encounter.attack.damage, '1d6+2');
  assert.equal(encounter.defeatFallback, undefined);
});

scenario('один откат снимает только последнее действие вместе с его тремя жетонами', () => {
  const started = createGallerySessionStartedEvent({
    definition: penisuelaGalleryGameplay,
    heroes: penisuelaGalleryHeroes,
    eventId: 'audience-event-start',
    commandId: 'audience-command-start',
    startedAt: '2026-09-04T00:00:00.000Z',
  });
  const trustCommand = 'audience-command-trust';
  const intimidationCommand = 'audience-command-intimidation';
  const events: GalleryEvent[] = [
    started,
    {
      id: 'audience-event-trust-roll',
      commandId: trustCommand,
      type: 'roll-entered',
      result: {
        checkId: 'earn-pussy-trust',
        heroId: 'lambert',
        stat: 'charisma',
        rolls: [2],
        modifier: 0,
        total: 2,
        dc: 15,
        success: false,
        automatic: false,
        text: 'Pussy Sultan отказывается сотрудничать.',
      },
    },
    {id: 'audience-event-trust-refused', commandId: trustCommand, type: 'flag-changed', flag: 'pussy-trust-refused', value: true},
    {id: 'audience-event-quest-blocked', commandId: trustCommand, type: 'flag-changed', flag: 'pussy-quest-blocked', value: true},
    {id: 'audience-event-intimidated', commandId: intimidationCommand, type: 'flag-changed', flag: 'pussy-intimidated', value: true},
    {id: 'audience-event-path', commandId: intimidationCommand, type: 'flag-changed', flag: 'pussy-path-resolved', value: true},
    {
      id: 'audience-event-passes',
      commandId: intimidationCommand,
      type: 'item-changed',
      itemId: PUSSY_BAR_PASSES_ITEM_ID,
      acquired: true,
      quantity: 3,
    },
    {
      id: 'audience-event-undo-intimidation',
      commandId: 'audience-command-undo-intimidation',
      type: 'action-corrected',
      correctedCommandId: intimidationCommand,
    },
  ];

  const afterOneBack = replayGalleryEvents(events, penisuelaGalleryGameplay);
  const afterIntimidation = replayGalleryEvents(events.slice(0, -1), penisuelaGalleryGameplay);
  assert.equal(getPussyAudienceViewId(afterIntimidation.flags), 'intimidated');
  assert.equal(getPussyAudienceViewId(afterOneBack.flags), undefined);
  assert.equal(afterOneBack.flags['pussy-trust-refused'], true);
  assert.equal(afterOneBack.flags['pussy-quest-blocked'], true);
  assert.notEqual(afterOneBack.flags['pussy-intimidated'], true);
  assert.equal(afterOneBack.inventory.includes(PUSSY_BAR_PASSES_ITEM_ID), false);

  const afterTwoBack = replayGalleryEvents([
    ...events,
    {
      id: 'audience-event-undo-trust',
      commandId: 'audience-command-undo-trust',
      type: 'action-corrected',
      correctedCommandId: trustCommand,
    },
  ], penisuelaGalleryGameplay);
  assert.notEqual(afterTwoBack.flags['pussy-trust-refused'], true);
  assert.notEqual(afterTwoBack.flags['pussy-quest-blocked'], true);
});

scenario('испуганный Pussy Sultan появляется только после успеха запугивания', () => {
  for (const flags of [{}, {'pussy-trust-refused': true}, {'pussy-guards-summoned': true}, {'pussy-guards-defeated': true}]) {
    assert.equal(getPussyAudienceViewId(flags), undefined);
  }
  assert.equal(getPussyAudienceViewId({'pussy-intimidated': true}), 'intimidated');
  assert.equal(getPussyAudienceViewId({'pussy-intimidated': true, 'pussy-guards-defeated': true}), undefined);
  const scene = sessionPreviewData.scenes.find((item) => item.id === 'pussy-audience');
  const view = scene?.interactionViews?.find((item) => item.id === 'intimidated');
  assert.ok(view?.background.endsWith('/pussy-sultan-suite-intimidated-standing.png'));
  assert.ok(view.readAloud);
  assert.ok(readFileSync(view.background).length > 0);
});

scenario('ветка использует общие GM, roll и legend-компоненты', () => {
  const adventureSource = readFileSync(new URL(
    '../src/widgets/campaign-scene/ui/HotelGalleryAdventure/HotelGalleryAdventure.tsx',
    import.meta.url,
  ), 'utf8');
  const checkPanelSource = readFileSync(new URL(
    '../src/features/navigate-campaign-scene/ui/SceneCheckPanel/SceneCheckPanel.tsx',
    import.meta.url,
  ), 'utf8');
  const rollerSource = readFileSync(new URL(
    '../src/shared/ui/D20Roller/D20Roller.tsx',
    import.meta.url,
  ), 'utf8');
  const modalStyles = readFileSync(new URL(
    '../src/features/navigate-campaign-scene/ui/SceneDecisionModal/SceneDecisionModal.module.css',
    import.meta.url,
  ), 'utf8');
  const checkStyles = readFileSync(new URL(
    '../src/features/navigate-campaign-scene/ui/SceneCheckPanel/SceneCheckPanel.module.css',
    import.meta.url,
  ), 'utf8');

  assert.match(adventureSource, /<SceneCheckPanel/);
  assert.match(adventureSource, /masterActions=\{masterActions\}/);
  assert.match(adventureSource, /<SceneTextPanel[\s\S]*?appearance="narration"/);
  assert.match(adventureSource, /<InspectableArtifactDialog/);
  assert.match(adventureSource, /PUSSY_REWARD_ITEM_IDS/);
  assert.doesNotMatch(adventureSource, /gm-pussy-return-to-gallery/);
  assert.doesNotMatch(adventureSource, /gm-pussy-to-gallery/);
  assert.match(adventureSource, /id: 'pussy-suite-exit'[\s\S]*?onSelect: goToHub/);
  assert.match(adventureSource, /onMasterStepBack=\{masterStepBack\}/);
  assert.match(adventureSource, /Показать полученные награды/);
  assert.match(adventureSource, /masterContent=\{isAlexisSceneId\(state\.activeSceneId\) \? interaction : null\}/);
  assert.doesNotMatch(adventureSource, /audienceDiceRequestId|propRoomDiceRequestId|styles\.heroPicker/);
  assert.doesNotMatch(adventureSource, /Футляр|футляр|lockedReward/);
  assert.doesNotMatch(adventureSource, /gm-leave-pussy|gm-abandon-pussy|gm-decline-womanizer|gm-skip-womanizer|prop-room-exit-without-scepter/);
  assert.doesNotMatch(adventureSource, /pussy-suite-return-to-gallery/);
  assert.doesNotMatch(adventureSource, /detail: 'Харизма|detail: '.*DC 1[0578]|detail: 'Грубая сила|detail: 'Гений-технарь/);
  assert.match(checkPanelSource, /<SceneDecisionModal/);
  assert.match(checkPanelSource, /<D20Roller/);
  assert.match(checkPanelSource, /useManualCriticalRollEffect/);
  assert.match(checkPanelSource, /className=\{styles\.heroAvatarFrame\}/);
  assert.match(rollerSource, /Принять результат/);
  assert.match(modalStyles, /font-family: var\(--font-display\)/);
  assert.equal((`${modalStyles}\n${checkStyles}`.match(/font-size:/g) ?? []).length, 2);
});

scenario('награды Pussy Sultan показываются по очереди и оставляют явный выход в холл', () => {
  const adventureSource = readFileSync(new URL(
    '../src/widgets/campaign-scene/ui/HotelGalleryAdventure/HotelGalleryAdventure.tsx',
    import.meta.url,
  ), 'utf8');
  const scenePreview = JSON.parse(readFileSync(new URL(
    '../content/campaigns/penisuela-session-preview.json',
    import.meta.url,
  ), 'utf8')) as {scenes: Array<{id: string; inspectables: Array<{id: string; order: number}>}>};
  const sessionControllerSource = readFileSync(new URL(
    '../src/features/navigate-campaign-scene/model/useGallerySession.ts',
    import.meta.url,
  ), 'utf8');
  const rewardControllerSource = sessionControllerSource.match(
    /const grantPussyReward = useCallback[\s\S]*?const collectScepter = useCallback/,
  )?.[0] ?? '';
  const rewardScene = scenePreview.scenes.find((scene) => scene.id === 'pussy-scepter-return');

  assert.deepEqual(rewardScene?.inspectables.map((artifact) => artifact.id), [
    PUSSY_BAR_PASSES_ITEM_ID,
    'pussy-sultan-womanizer',
  ]);
  assert.deepEqual(rewardScene?.inspectables.map((artifact) => artifact.order), [1, 2]);
  assert.match(adventureSource, /setPussyRewardPreviewIndex\(0\)/);
  assert.match(adventureSource, /current \+ 1/);
  assert.match(adventureSource, /sharedController\.grantPussyReward\(\)/);
  assert.match(adventureSource, /state\.activeSceneId === 'pussy-scepter-return' && rewardDecision !== null/);
  assert.match(adventureSource, /canLeavePussySuite \? \([\s\S]*?<SceneReturnButton onClick=\{goToHub\}>Вернуться в холл/);
  assert.match(rewardControllerSource, /flag: 'pussy-bar-passes-issued', value: true/);
  assert.match(rewardControllerSource, /itemId: PUSSY_BAR_PASSES_ITEM_ID/);
  assert.match(rewardControllerSource, /quantity: PUSSY_BAR_PASSES_QUANTITY/);
  assert.doesNotMatch(rewardControllerSource, /archiveKeyItemId|archive-key-recovered/);
});

console.log(`Pussy Sultan audience mechanics: ${scenarios}/${scenarios} passed`);
