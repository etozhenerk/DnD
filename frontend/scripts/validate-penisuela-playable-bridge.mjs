#!/usr/bin/env node

import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const gameplayPath = `${projectRoot}/content/campaigns/penisuela-gallery-gameplay.json`;
const previewPath = `${projectRoot}/content/campaigns/penisuela-session-preview.json`;
const playPagePath = `${projectRoot}/src/pages/campaign-play/ui/CampaignPlayPage/CampaignPlayPage.tsx`;

const [gameplay, preview, playPage] = await Promise.all([
  readFile(gameplayPath, 'utf8').then(JSON.parse),
  readFile(previewPath, 'utf8').then(JSON.parse),
  readFile(playPagePath, 'utf8'),
]);

const errors = [];
const notes = [];
let assertions = 0;

function check(condition, message) {
  assertions += 1;
  if (!condition) errors.push(message);
}

const scenes = gameplay.storyScenes ?? [];
const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));
const previewSceneIds = new Set((preview.scenes ?? []).map((scene) => scene.id));
const endingIds = [
  'wedding-epilogue',
  'director-epilogue',
  'shutdown-epilogue',
  'evacuation-epilogue',
];

check(scenes.length === 56, `Ожидалось 56 storyScenes, получено ${scenes.length}.`);
check(sceneById.size === scenes.length, 'В storyScenes есть повторяющиеся id.');
check(preview.scenes?.length === 56, `Ожидалось 56 preview-сцен, получено ${preview.scenes?.length ?? 0}.`);
check(
  previewSceneIds.size === sceneById.size
    && [...sceneById.keys()].every((id) => previewSceneIds.has(id)),
  'Наборы id в storyScenes и session-preview расходятся.',
);
check(preview.initialSceneId === 'hotel-overload', `Начальная сцена должна быть hotel-overload, получено ${preview.initialSceneId}.`);

const publishedBungalowScenes = new Map([
  ['guest-bungalows', 'assets/concepts/campaigns/penisuela/scenes/bungalows-two-paths.png'],
  ['bungalow-courtyard', 'assets/concepts/campaigns/penisuela/scenes/bungalow-courtyard.png'],
  ['olva-passes-handoff', 'assets/concepts/campaigns/penisuela/scenes/olva-quest-declined-passes.png'],
]);
for (const [sceneId, background] of publishedBungalowScenes) {
  const previewScene = (preview.scenes ?? []).find((scene) => scene.id === sceneId);
  check(sceneById.has(sceneId), `В storyScenes отсутствует новая публичная сцена ${sceneId}.`);
  check(previewScene?.background === background, `${sceneId}: ожидался опубликованный фон ${background}.`);
}
for (const removedSceneId of ['artists-dressing-room', 'groom-hypothesis']) {
  check(!sceneById.has(removedSceneId), `Удалённая сцена ${removedSceneId} осталась в storyScenes.`);
  check(!previewSceneIds.has(removedSceneId), `Удалённая сцена ${removedSceneId} осталась в session preview.`);
}
const closedBarBungalowTransitions = sceneById.get('closed-bar')?.actions?.filter(
  (action) => action.nextSceneId === 'guest-bungalows',
) ?? [];
const [closedBarBungalowTransition] = closedBarBungalowTransitions;
check(
  closedBarBungalowTransitions.length === 1
    && closedBarBungalowTransition.conditions?.allFlags?.includes('dance-troupe-freed'),
  'Из closed-bar должен быть ровно один основной выход в guest-bungalows после освобождения танцоров.',
);

const checkById = new Map((gameplay.checks ?? []).map((definition) => [definition.id, definition]));
const propRoomScene = sceneById.get('pussy-prop-room');
const propRoomActionById = new Map((propRoomScene?.actions ?? []).map((action) => [action.id, action]));
const propRoomEncounter = (gameplay.encounters ?? [])
  .find((encounter) => encounter.id === 'prop-room-winding-carriers');
const propRoomPreview = (preview.scenes ?? []).find((scene) => scene.id === 'pussy-prop-room');
const propRoomViewIds = new Set((propRoomPreview?.interactionViews ?? []).map((view) => view.id));

for (const [checkId, heroId, stat, dc] of [
  ['recover-pussy-scepter-with-tiny-linda', 'linda', 'dexterity', 15],
  ['recover-pussy-scepter-with-engineering', 'lambert', 'intelligence', 15],
  ['recover-pussy-scepter', 'golovach-lena', 'strength', 18],
]) {
  const definition = checkById.get(checkId);
  check(definition?.dc === dc, `${checkId}: ожидался DC ${dc}.`);
  check(definition?.stats?.includes(stat), `${checkId}: характеристика должна быть ${stat}.`);
  check(definition?.eligibleHeroIds?.length === 1 && definition.eligibleHeroIds[0] === heroId, `${checkId}: проверка должна принадлежать ${heroId}.`);
}
for (const actionId of [
  'recover-scepter-with-tiny-linda',
  'recover-scepter-with-engineering',
]) {
  const action = propRoomActionById.get(actionId);
  check(action?.failureOutcome?.flags?.['prop-room-force-only'] === true, `${actionId}: провал должен оставлять только силовой путь.`);
}
const strengthAction = propRoomActionById.get('recover-scepter-with-strength');
check(strengthAction?.failureOutcome?.flags?.['prop-room-carriers-awakened'] === true, 'Провал силы должен пробуждать носильщиков.');
check(
  propRoomActionById.get('start-prop-room-carriers-combat')?.encounterId === 'prop-room-winding-carriers',
  'Боевая развилка реквизиторской не связана с encounter носильщиков.',
);
check(propRoomEncounter?.units?.length === 3, 'В реквизиторской должно быть ровно три заводных носильщика.');
check(
  propRoomEncounter?.units?.every((unit) => unit.token === 'assets/concepts/campaigns/penisuela/ui/enemy-tokens/winding-palanquin-carrier.png'),
  'Все три носильщика должны использовать утверждённый боевой аватар с сохранённым лицом.',
);
check(
  ['force-only', 'carriers-awakened', 'carriers-defeated'].every((viewId) => propRoomViewIds.has(viewId)),
  'В session preview отсутствует одно из трёх производных состояний реквизиторской.',
);
check(
  !/ледян|балдахин/i.test(`${propRoomPreview?.readAloud ?? ''} ${JSON.stringify(propRoomScene ?? {})}`),
  'В активной механике реквизиторской осталась ледяная полоса или балдахин.',
);

const adjacency = new Map(scenes.map((scene) => [scene.id, new Set()]));
for (const scene of scenes) {
  const actionIds = new Set();
  for (const action of scene.actions ?? []) {
    check(!actionIds.has(action.id), `Повтор action id ${scene.id}.${action.id}.`);
    actionIds.add(action.id);
    for (const nextSceneId of [action.nextSceneId, action.failureNextSceneId].filter(Boolean)) {
      check(sceneById.has(nextSceneId), `${scene.id}.${action.id} ведёт в отсутствующую сцену ${nextSceneId}.`);
      adjacency.get(scene.id)?.add(nextSceneId);
    }
  }
}

function findStructuralPath(startId, targetId) {
  const queue = [startId];
  const parent = new Map([[startId, null]]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === targetId) break;
    for (const next of adjacency.get(current) ?? []) {
      if (parent.has(next)) continue;
      parent.set(next, current);
      queue.push(next);
    }
  }
  if (!parent.has(targetId)) return null;
  const path = [];
  for (let current = targetId; current !== null; current = parent.get(current)) path.push(current);
  return path.reverse();
}

for (const endingId of endingIds) {
  const ending = sceneById.get(endingId);
  check(Boolean(ending) && ending.actions.every((action) => action.kind === 'automatic' && action.nextSceneId === endingId), `${endingId} не является терминальной сценой.`);
  const path = findStructuralPath(preview.initialSceneId, endingId);
  check(Boolean(path), `${endingId} структурно недостижима из ${preview.initialSceneId}.`);
  if (path) notes.push(`Структурный путь к ${endingId}: ${path.join(' -> ')}`);
}

function hasOrderedPath(milestones) {
  let frontier = new Set([milestones[0]]);
  for (let index = 1; index < milestones.length; index += 1) {
    const target = milestones[index];
    const nextFrontier = new Set();
    for (const start of frontier) {
      if (findStructuralPath(start, target)) nextFrontier.add(target);
    }
    if (nextFrontier.size === 0) return false;
    frontier = nextFrontier;
  }
  return true;
}

const mainMilestones = [
  'hotel-overload',
  'hotel-gallery',
  'closed-bar',
  'guest-bungalows',
  'bungalow-courtyard',
  'olva-passes-handoff',
  'guest-bungalows',
  'egorik-bungalow-reveal',
  'groom-tunnel',
  'groom-preparation-room',
  'kreed-disclosure',
  'post-kreed-route',
  'graywise-door-trust',
  'bedroom-reveal',
  'igor-unboxing',
  'andrey-villa-breach',
  'last-take-boss',
];
check(hasOrderedPath(mainMilestones), `Нет структурной цепочки: ${mainMilestones.join(' -> ')}.`);

const pussyQuestMilestones = [
  'hotel-gallery',
  'pussy-audience',
  'pussy-prop-room',
  'pussy-scepter-return',
  'closed-bar',
];
check(hasOrderedPath(pussyQuestMilestones), `Нет целой ветки Pussy Sultan: ${pussyQuestMilestones.join(' -> ')}.`);
check(
  hasOrderedPath(['hotel-gallery', 'alexis-room', 'closed-bar'])
    && hasOrderedPath(['pussy-scepter-return', 'alexis-room-after-pussy', 'closed-bar']),
  'Комната Алексиса не встроена в обе ожидаемые позиции гостиничного хаба.',
);

for (const alexisSceneId of ['alexis-room', 'alexis-room-after-pussy']) {
  const alexisScene = sceneById.get(alexisSceneId);
  const acceptanceActions = (alexisScene?.actions ?? []).filter((action) => action.id.startsWith('accept-alexis-outfit-'));
  const excellent = acceptanceActions.find((action) => action.id === 'accept-alexis-outfit-excellent');
  const sufficient = acceptanceActions.find((action) => action.id === 'accept-alexis-outfit-sufficient');
  check(acceptanceActions.length === 2, `${alexisSceneId}: должно быть ровно два ручных исхода приёмки наряда.`);
  check(
    Boolean(excellent?.outcome?.flags?.['alexis-bar-permits-issued'])
      && Boolean(excellent?.outcome?.flags?.['alexis-fashion-certificate-received'])
      && excellent?.outcome?.inventory?.acquire?.includes('alexis-fashion-expert-certificate'),
    `${alexisSceneId}: отличный исход должен выдавать сертификат и два разрешения.`,
  );
  check(
    Boolean(sufficient?.outcome?.flags?.['alexis-bar-permits-issued'])
      && !sufficient?.outcome?.flags?.['alexis-fashion-certificate-received']
      && !sufficient?.outcome?.inventory?.acquire?.length,
    `${alexisSceneId}: достаточный исход должен выдавать только два разрешения.`,
  );
}

const alexisCertificate = preview.scenes
  ?.flatMap((previewScene) => previewScene.inspectables ?? [])
  .find((item) => item.id === 'alexis-fashion-expert-certificate');
check(
  alexisCertificate?.visualKind === 'alexis-fashion-certificate',
  'Сертификат ALEXIS отсутствует среди code-native предметов общего инвентаря.',
);

const alexisOutfitOrders = ['alexis-room', 'alexis-room-after-pussy'].map((sceneId) => {
  const previewScene = preview.scenes?.find((candidate) => candidate.id === sceneId);
  const builder = previewScene?.interactionViews
    ?.find((view) => view.id === 'outfit-builder')
    ?.outfitBuilder;
  const categories = Object.fromEntries((builder?.categories ?? []).map((category) => [
    category.id,
    category.options ?? [],
  ]));
  check(
    ['top', 'bottom', 'accent'].every((categoryId) => categories[categoryId]?.length === 8),
    `${sceneId}: каждая карусель Алексиса должна содержать восемь предметов.`,
  );
  return {sceneId, categories};
});

const primaryOutfitOrder = alexisOutfitOrders[0]?.categories ?? {};
for (const categoryId of ['top', 'bottom', 'accent']) {
  const primaryIds = (primaryOutfitOrder[categoryId] ?? []).map((option) => option.id);
  const aliasIds = (alexisOutfitOrders[1]?.categories?.[categoryId] ?? []).map((option) => option.id);
  check(
    primaryIds.join('|') === aliasIds.join('|'),
    `Карусель ${categoryId} имеет разный порядок в двух вариантах комнаты Алексиса.`,
  );
}

const sharedOutfitSetIds = (primaryOutfitOrder.top ?? [])
  .map((option) => option.setId)
  .filter((setId) => ['bottom', 'accent'].every((categoryId) =>
    (primaryOutfitOrder[categoryId] ?? []).some((option) => option.setId === setId)));
for (const setId of sharedOutfitSetIds) {
  const positions = ['top', 'bottom', 'accent'].map((categoryId) =>
    (primaryOutfitOrder[categoryId] ?? []).findIndex((option) => option.setId === setId));
  check(
    new Set(positions).size === positions.length,
    `Готовый сет ${setId} выстроен по одинаковой позиции в каруселях Алексиса.`,
  );
}

const removedCharacterHits = [];
const removedCharacterPattern = /(prokhor|прохор|satyr|сатир)/i;
function scanActiveStrings(value, path = 'storyScenes') {
  if (typeof value === 'string') {
    if (removedCharacterPattern.test(value)) removedCharacterHits.push(`${path}: ${value}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => scanActiveStrings(child, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  Object.entries(value).forEach(([key, child]) => scanActiveStrings(child, `${path}.${key}`));
}
scanActiveStrings(scenes);
scanActiveStrings(preview.scenes ?? [], 'sessionPreview.scenes');
check(
  removedCharacterHits.length === 0,
  `В активных storyScenes остались Prokhor/Satyr: ${removedCharacterHits.join(' | ')}`,
);

const giftScene = sceneById.get('igor-consent-decisions');
const giftActionIds = new Set((giftScene?.actions ?? []).map((action) => action.id));
for (const actionId of [
  'opt-in-thorin-gift-conversation',
  'resolve-thorin-gift-exchange',
  'accept-thorin-seven-job-bag-upgrade',
  'decline-thorin-seven-job-bag-upgrade',
  'opt-in-bubsilda-gift-task',
  'resolve-bubsilda-gift-balance',
  'accept-bubsilda-steady-horizon-brooch',
  'decline-bubsilda-steady-horizon-brooch',
  'continue-after-consent-and-gift-window',
]) {
  check(giftActionIds.has(actionId), `В igor-consent-decisions отсутствует ${actionId}.`);
}

check(
  playPage.includes('hotelGalleryAdventureSceneIds.has(scene.id)')
    && playPage.includes("scene.id === 'hotel-overload'")
    && playPage.includes('guestBungalowsAdventureSceneIds.has(scene.id)')
    && playPage.includes('<GuestBungalowsAdventure')
    && playPage.includes('storySceneIds.has(scene.id)')
    && playPage.includes('<LateStoryAdventure'),
  'CampaignPlayPage не подключает hotel hub, новые сцены бунгало и универсальный runtime storyScenes.',
);

function collectGuardState(condition, state = {flags: new Set(), counters: new Set(), clues: new Set()}) {
  if (!condition || typeof condition !== 'object') return state;
  for (const flag of condition.allFlags ?? []) state.flags.add(flag);
  for (const flag of condition.noFlags ?? []) state.flags.add(flag);
  for (const clue of condition.allClues ?? []) state.clues.add(clue);
  for (const counter of Object.keys(condition.counterLte ?? {})) state.counters.add(counter);
  const graph = condition.graphCondition;
  function walkGraph(value) {
    if (!value || typeof value !== 'object') return;
    if (value.flag) state.flags.add(value.flag);
    if (value.counter) state.counters.add(value.counter);
    for (const child of value.all ?? []) walkGraph(child);
    for (const child of value.any ?? []) walkGraph(child);
    if (value.not) walkGraph(value.not);
  }
  walkGraph(graph);
  return state;
}

const relevant = {flags: new Set(), counters: new Set(), clues: new Set()};
for (const scene of scenes) {
  for (const action of scene.actions ?? []) collectGuardState(action.conditions, relevant);
}

function graphConditionMet(condition, state) {
  if (!condition || condition.otherwise === true) return true;
  if (condition.all) return condition.all.every((child) => graphConditionMet(child, state));
  if (condition.any) return condition.any.some((child) => graphConditionMet(child, state));
  if (condition.not) return !graphConditionMet(condition.not, state);
  if (condition.flag) return state.flags.has(condition.flag) === condition.equals;
  if (condition.counter) {
    const value = state.counters[condition.counter] ?? 0;
    return (condition.eq === undefined || value === condition.eq)
      && (condition.gt === undefined || value > condition.gt)
      && (condition.gte === undefined || value >= condition.gte)
      && (condition.lt === undefined || value < condition.lt)
      && (condition.lte === undefined || value <= condition.lte);
  }
  return false;
}

function conditionsMet(conditions, state) {
  if (!conditions) return true;
  return (conditions.allFlags ?? []).every((flag) => state.flags.has(flag))
    && (conditions.noFlags ?? []).every((flag) => !state.flags.has(flag))
    && (conditions.allClues ?? []).every((clue) => state.clues.has(clue))
    && (conditions.allItems ?? []).every((id) => (state.inventory.get(id) ?? 0) > 0)
    && Object.entries(conditions.itemQuantities ?? {}).every(([id, quantity]) => (state.inventory.get(id) ?? 0) >= quantity)
    && Object.entries(conditions.counterLte ?? {}).every(
      ([counter, maximum]) => (state.counters[counter] ?? 0) <= maximum,
    )
    && graphConditionMet(conditions.graphCondition, state);
}

function applyOutcome(state, outcome) {
  const next = {
    sceneId: state.sceneId,
    flags: new Set(state.flags),
    counters: {...state.counters},
    clues: new Set(state.clues),
    inventory: new Map(state.inventory ?? []),
    resolved: new Set(state.resolved),
  };
  for (const [flag, value] of Object.entries(outcome?.flags ?? {})) {
    if (!relevant.flags.has(flag)) continue;
    if (value) next.flags.add(flag);
    else next.flags.delete(flag);
  }
  for (const [counter, delta] of Object.entries(outcome?.counterDeltas ?? {})) {
    if (relevant.counters.has(counter)) next.counters[counter] = (next.counters[counter] ?? 0) + delta;
  }
  for (const clue of outcome?.clues ?? []) {
    if (relevant.clues.has(clue)) next.clues.add(clue);
  }
  for (const itemId of outcome?.inventory?.remove ?? []) next.inventory.delete(itemId);
  for (const itemId of outcome?.inventory?.acquire ?? []) {
    const quantity = outcome?.inventory?.quantities?.[itemId] ?? 1;
    next.inventory.set(itemId, (next.inventory.get(itemId) ?? 0) + quantity);
  }
  return next;
}

const commonSmokeSteps = [
  ['hotel-overload', 'continue-1-hotel-gallery', 'hotel-gallery'],
  ['hotel-gallery', 'continue-2-pussy-audience', 'pussy-audience'],
  ['pussy-audience', 'continue-2-alexis-room-after-pussy', 'alexis-room-after-pussy'],
  ['alexis-room-after-pussy', 'continue-1-pussy-prop-room', 'pussy-prop-room'],
  ['pussy-prop-room', 'continue-1-pussy-scepter-return', 'pussy-scepter-return'],
  ['pussy-scepter-return', 'continue-2-closed-bar', 'closed-bar'],
  ['closed-bar', closedBarBungalowTransition?.id, 'guest-bungalows'],
  ['guest-bungalows', 'continue-1-bungalow-courtyard', 'bungalow-courtyard'],
  ['bungalow-courtyard', 'continue-2-groom-tunnel', 'olva-passes-handoff'],
  ['olva-passes-handoff', 'continue-1-guest-bungalows', 'guest-bungalows'],
  ['guest-bungalows', 'continue-2-egorik-bungalow-reveal', 'egorik-bungalow-reveal'],
  ['egorik-bungalow-reveal', 'continue-1-bungalow-courtyard', 'groom-tunnel'],
  ['groom-tunnel', 'continue-1-groom-preparation-room', 'groom-preparation-room'],
  ['groom-preparation-room', 'continue-1-kreed-disclosure', 'kreed-disclosure'],
  ['kreed-disclosure', 'continue-1-post-kreed-route', 'post-kreed-route'],
  ['post-kreed-route', 'continue-2-graywise-door-trust', 'graywise-door-trust'],
  ['graywise-door-trust', 'continue-1-bedroom-reveal', 'bedroom-reveal'],
  ['bedroom-reveal', 'approach-bedroom-door', 'bedroom-reveal'],
  ['bedroom-reveal', 'open-bedroom-door', 'bedroom-reveal'],
  ['bedroom-reveal', 'continue-1-igor-unboxing', 'igor-unboxing'],
  ['igor-unboxing', 'continue-1-wedding-reminder', 'andrey-villa-breach'],
  ['wedding-reminder', 'continue-1-wedding-reminder-resolution', 'wedding-reminder-resolution'],
  ['wedding-reminder-resolution', 'continue-3-igor-orientation', 'igor-orientation'],
  ['igor-orientation', 'continue-1-igor-consent-decisions', 'igor-consent-decisions'],
  ['igor-consent-decisions', 'continue-after-consent-and-gift-window', 'final-choice'],
  ['final-choice', 'continue-1-last-take-boss', 'last-take-boss'],
];

const commonSetupIds = {
  'hotel-overload': [
    'choose-pendant-disposition-keep-pendant',
    'choose-weather-resolution-weather-safe',
  ],
  'alexis-room-after-pussy': ['accept-alexis-outfit-excellent'],
  'pussy-audience': ['earn-pussy-trust'],
  'pussy-prop-room': ['recover-scepter-with-tiny-linda'],
  'pussy-scepter-return': ['choose-pussy-womanizer-reward-accept-womanizer'],
  'closed-bar': ['choose-closed-bar-decision-1-clean-four-count', 'receive-stas-bungalow-pass', 'receive-troupe-bungalow-passes'],
  'couples-session-entry': ['choose-womanizer-entry-presence-earned-womanizer-enters-session'],
  'show-18-pavilion': [
    'choose-show18-auto-consent-contradiction-stas-names-non-consent',
    'choose-show18-ideal-plan-contradiction-polina-separates-plan-from-desire',
    'choose-show18-universal-expert-contradiction-womanizer-is-prop-not-expert',
    'choose-show18-stas-readiness-stas-ready-now',
    'choose-show18-polina-readiness-polina-ready-now',
  ],
  'couples-session-choice': ['choose-womanizer-final-status-polina-keeps-womanizer'],
  'egorik-bungalow-reveal': ['protect-egorik-from-guards', 'choose-egorik-first-rescue-attempt-rescue-couple', 'test-egorik-nastasia-voices', 'show-egorik-bracelet', 'return-to-egorik-conversation'],
  'groom-tunnel': ['groom-tunnel-enter', 'groom-tunnel-bubsilda-balance-passage', 'groom-tunnel-approach-door', 'groom-door-linda-inside-release', 'groom-door-follow-linda', 'groom-prop-jam-thorin-hammer'],
  'responsible-control-log': ['choose-responsible-control-log-decision-1-accept-responsibility'],
  'graywise-door-trust': ['choose-graywise-door-trust-decision-1-trust-earned'],
  'wedding-reminder': ['choose-player-wedding-reminder-decision-players-remind-about-wedding'],
  'igor-consent-decisions': [
    'choose-live-consent-both-live',
    'choose-technical-consent-both-technical',
    'confirm-consent-decisions-before-gifts',
    'opt-in-thorin-gift-conversation',
    'resolve-thorin-gift-exchange',
    'accept-thorin-seven-job-bag-upgrade',
    'opt-in-bubsilda-gift-task',
    'resolve-bubsilda-gift-balance',
    'accept-bubsilda-steady-horizon-brooch',
  ],
};

const commonRuntimeSetupFlags = {
  'closed-bar': ['dance-troupe-freed'],
  // Story-only smoke receives the combat result; the full two-battle chain is covered separately.
  'last-take-boss': ['andrey-boss-defeated'],
  // Old technical ending is tested in isolation from the retired control-log detour.
  'igor-consent-decisions': ['director-route-candidate'],
};

const endingRoutes = {
  'wedding-epilogue': [
    'post-crisis-orientation-wedding',
    'post-crisis-publication-wedding',
    'wedding-epilogue',
  ],
  'director-epilogue': [
    'post-crisis-orientation-director',
    'post-crisis-publication-director',
    'director-epilogue',
  ],
  'shutdown-epilogue': [
    'post-crisis-orientation-shutdown',
    'post-crisis-publication-shutdown',
    'shutdown-epilogue',
  ],
  'evacuation-epilogue': [
    'last-take-emergency-action',
    'post-crisis-orientation-evacuation',
    'post-crisis-publication-evacuation',
    'evacuation-epilogue',
  ],
};

const endingChoiceIds = {
  'wedding-epilogue': 'choose-final-choice-decision-1-live',
  'director-epilogue': 'choose-final-choice-decision-1-director',
  'shutdown-epilogue': 'choose-final-choice-decision-1-physical',
  'evacuation-epilogue': 'choose-final-choice-decision-1-physical',
};

function applyNamedAction(state, sceneId, actionId) {
  const action = sceneById.get(sceneId)?.actions?.find((candidate) => candidate.id === actionId);
  if (!action) return {error: `${sceneId}.${actionId} отсутствует.`};
  if (state.resolved.has(`${sceneId}.${actionId}`)) return {error: `${sceneId}.${actionId} повторяется.`};
  if (!conditionsMet(action.conditions, state)) return {error: `${sceneId}.${actionId} закрыт своими conditions.`};
  const next = applyOutcome(state, action.outcome);
  next.resolved.add(`${sceneId}.${actionId}`);
  next.sceneId = action.nextSceneId;
  return {state: next};
}

function createSmokeState(sceneId = preview.initialSceneId) {
  return {
    sceneId,
    flags: new Set(),
    counters: {},
    clues: new Set(),
    // This story-action smoke starts after collecting the room's mandatory inspectables.
    inventory: new Map(sceneId === preview.initialSceneId
      ? [['anonymous-bracelets', 1], ['overload-console', 1]] : []),
    resolved: new Set(),
  };
}

const relationshipSceneIds = new Set([
  'couples-session-entry',
  'couples-session-stas',
  'couples-session-polina',
  'olva-relationship-review',
  'show-18-pavilion',
  'couples-session-plan',
  'couples-session-choice',
]);
function runCanonicalSmoke(endingId, currentRoute = false) {
  const setupIds = structuredClone(commonSetupIds);
  setupIds['final-choice'] = [endingChoiceIds[endingId]];
  const endingName = endingId.replace('-epilogue', '');
  setupIds[`post-crisis-orientation-${endingName}`] = [currentRoute ? 'choose-post-crisis-orientation-late-clear-orientation' : 'choose-post-crisis-orientation-already-oriented'];
  setupIds[`post-crisis-publication-${endingName}`] = ['choose-publication-consent-both-agree-publication'];
  const firstEndingScene = endingRoutes[endingId][0];
  const endingSteps = [
    [
      'last-take-boss',
      endingId === 'wedding-epilogue'
        ? 'continue-1-post-crisis-orientation-wedding'
        : endingId === 'director-epilogue'
          ? 'continue-2-post-crisis-orientation-director'
          : endingId === 'shutdown-epilogue'
            ? 'continue-3-post-crisis-orientation-shutdown'
            : 'continue-4-last-take-emergency-action',
      firstEndingScene,
    ],
    ...(endingId === 'evacuation-epilogue'
      ? [[
          'last-take-emergency-action',
          'continue-1-post-crisis-orientation-evacuation',
          'post-crisis-orientation-evacuation',
        ]]
      : []),
    [
      `post-crisis-orientation-${endingName}`,
      `continue-1-post-crisis-publication-${endingName}`,
      `post-crisis-publication-${endingName}`,
    ],
    [
      `post-crisis-publication-${endingName}`,
      `continue-1-${endingId}`,
      endingId,
    ],
  ];
  const split = commonSmokeSteps.findIndex(([id]) => id === 'wedding-reminder');
  const smokeSteps = currentRoute ? [
    ...commonSmokeSteps.slice(0, split),
    ['andrey-villa-breach', 'show-andrey-appearance', 'andrey-villa-breach'],
    ['andrey-villa-breach', 'reveal-andrey-plan', 'andrey-villa-breach'],
    ['andrey-villa-breach', 'andrey-teleport-to-arena', 'last-take-boss'],
    ['last-take-boss', 'continue-after-andrey-victory', 'villa-after-andrey'],
    ['villa-after-andrey', 'approach-couple-device', 'couple-voice-reset'],
    ['couple-voice-reset', 'activate-couple-voice-reset', 'couple-voice-reset'],
    ['couple-voice-reset', 'celebrate-wedding', 'wedding-epilogue'],
  ] : [...commonSmokeSteps, ...endingSteps];
  const fullPath = [preview.initialSceneId, ...smokeSteps.map(([, , nextSceneId]) => nextSceneId)];

  let state = createSmokeState();
  for (let index = 0; index < smokeSteps.length; index += 1) {
    const [sceneId, transitionId, expectedNext] = smokeSteps[index];
    // Legacy branch is still addressable by its old URL, but no longer follows unboxing.
    if (!currentRoute && sceneId === 'wedding-reminder' && state.sceneId === 'andrey-villa-breach') state.sceneId = sceneId;
    if (state.sceneId !== sceneId) {
      return {error: `Ожидалась ${sceneId}, фактически ${state.sceneId}.`, path: fullPath.slice(0, index + 1)};
    }
    for (const flag of commonRuntimeSetupFlags[sceneId] ?? []) state.flags.add(flag);
    if (currentRoute && sceneId === 'last-take-boss') state.flags.add('andrey-death-video-finished');
    for (const actionId of setupIds[sceneId] ?? []) {
      const result = applyNamedAction(state, sceneId, actionId);
      if (result.error) return {error: result.error, path: fullPath.slice(0, index + 1)};
      state = result.state;
    }
    const result = applyNamedAction(state, sceneId, transitionId);
    if (result.error) return {error: result.error, path: fullPath.slice(0, index + 1)};
    state = result.state;
    if (state.sceneId !== expectedNext) {
      return {error: `${sceneId}.${transitionId} ведёт в ${state.sceneId}, ожидалась ${expectedNext}.`, path: fullPath.slice(0, index + 1)};
    }
  }
  return {path: fullPath, state};
}

for (const endingId of endingIds) {
  const result = runCanonicalSmoke(endingId);
  check(!result.error && result.state?.sceneId === endingId, `${endingId}: ${result.error ?? 'smoke-маршрут не завершился.'}`);
  if (!result.error) notes.push(`Legacy compatibility smoke ${endingId}: ${result.path.join(' -> ')}`);
}

const villaSmoke = runCanonicalSmoke('wedding-epilogue', true);
check(!villaSmoke.error && villaSmoke.state?.sceneId === 'wedding-epilogue', `Current villa route: ${villaSmoke.error ?? 'failed'}`);
if (!villaSmoke.error) notes.push(`Current villa route: ${villaSmoke.path.join(' -> ')}`);

function runActionSequence(sequence, initialState = createSmokeState()) {
  let state = initialState;
  for (const [sceneId, actionId] of sequence) {
    if (state.sceneId !== sceneId) return {error: `Ожидалась ${sceneId}, фактически ${state.sceneId}.`};
    const result = applyNamedAction(state, sceneId, actionId);
    if (result.error) return result;
    state = result.state;
  }
  return {state};
}

const bungalowHub = sceneById.get('guest-bungalows');
const hubOlvaAction = bungalowHub?.actions?.find(
  (action) => action.id === 'continue-1-bungalow-courtyard',
);
const hubEgorikAction = bungalowHub?.actions?.find(
  (action) => action.id === 'continue-2-egorik-bungalow-reveal',
);
const olvaCourtyard = sceneById.get('bungalow-courtyard');
const acceptOlvaQuestAction = olvaCourtyard?.actions?.find(
  (action) => action.id === 'continue-1-couples-session-entry',
);
const declineOlvaQuestAction = olvaCourtyard?.actions?.find(
  (action) => action.id === 'continue-2-groom-tunnel',
);
const olvaHandoffAction = sceneById.get('olva-passes-handoff')?.actions?.find(
  (action) => action.id === 'continue-1-guest-bungalows',
);

check(
  hubOlvaAction?.nextSceneId === 'bungalow-courtyard'
    && conditionsMet(hubOlvaAction.conditions, createSmokeState('guest-bungalows')),
  'Хаб не открывает безусловный путь к Олве в bungalow-courtyard.',
);
check(
  Boolean(hubEgorikAction)
    && hubEgorikAction.nextSceneId === 'egorik-bungalow-reveal'
    && !conditionsMet(hubEgorikAction.conditions, createSmokeState('guest-bungalows')),
  'Путь хаба к Егорику должен быть закрыт до выдачи доступа Олвой.',
);

function grantsEgorikAccessPass(action) {
  return action?.outcome?.flags?.['olva-bungalow-access-issued'] === true
    && action?.outcome?.inventory?.acquire?.includes('guest-bungalow-pass')
    && action?.outcome?.inventory?.quantities?.['guest-bungalow-pass'] === 1;
}

check(
  acceptOlvaQuestAction?.nextSceneId === 'guest-bungalows'
    && acceptOlvaQuestAction.outcome.flags['olva-quest-accepted'] === true
    && !acceptOlvaQuestAction.outcome.inventory,
  'Принятие просьбы Олвы должно вернуть героев к поиску Станиса; награды выдаются после консультации.',
);
check(
  declineOlvaQuestAction?.nextSceneId === 'olva-passes-handoff'
    && grantsEgorikAccessPass(declineOlvaQuestAction),
  'Отказ от просьбы Олвы должен атомарно выдать доступ и один guest-bungalow-pass.',
);
check(
  olvaHandoffAction?.nextSceneId === 'guest-bungalows',
  'Сцена передачи пропусков после отказа должна возвращать в guest-bungalows.',
);

const relationshipExitActions = [...relationshipSceneIds].flatMap((sceneId) =>
  (sceneById.get(sceneId)?.actions ?? []).filter(
    (action) => action.nextSceneId !== sceneId && !relationshipSceneIds.has(action.nextSceneId),
  ));
check(
  relationshipExitActions.length > 0
    && relationshipExitActions.every((action) => action.nextSceneId === 'guest-bungalows'),
  'Каждый выход принятого сайд-квеста Олвы должен возвращать в guest-bungalows.',
);

const declinedOlvaQuest = runActionSequence([
  ['guest-bungalows', 'continue-1-bungalow-courtyard'],
  ['bungalow-courtyard', 'continue-2-groom-tunnel'],
  ['olva-passes-handoff', 'continue-1-guest-bungalows'],
], createSmokeState('guest-bungalows'));
check(
  !declinedOlvaQuest.error
    && declinedOlvaQuest.state?.sceneId === 'guest-bungalows'
    && declinedOlvaQuest.state.flags.has('olva-bungalow-access-issued')
    && declinedOlvaQuest.state.inventory.get('guest-bungalow-pass') === 1,
  `Отказ Олве не проходит цепочку handoff → hub с отдельным пропуском Егорика: ${declinedOlvaQuest.error ?? 'неполное состояние'}.`,
);

const egorikAfterAccess = declinedOlvaQuest.state
  ? runActionSequence([
      ['guest-bungalows', 'continue-2-egorik-bungalow-reveal'],
      ['egorik-bungalow-reveal', 'choose-egorik-first-rescue-attempt-rescue-couple'],
      ['egorik-bungalow-reveal', 'test-egorik-nastasia-voices'],
      ['egorik-bungalow-reveal', 'show-egorik-bracelet'],
      ['egorik-bungalow-reveal', 'return-to-egorik-conversation'],
      ['egorik-bungalow-reveal', 'continue-1-bungalow-courtyard'],
    ], declinedOlvaQuest.state)
  : {error: declinedOlvaQuest.error ?? 'отказ Олве не создал состояние доступа'};
check(
  !egorikAfterAccess.error && egorikAfterAccess.state?.sceneId === 'groom-tunnel',
  `После доступа маршрут hub → Egorik → groom-tunnel не проходит: ${egorikAfterAccess.error ?? 'неверная конечная сцена'}.`,
);

const alexisFirst = runActionSequence([
  ['hotel-overload', 'choose-pendant-disposition-keep-pendant'],
  ['hotel-overload', 'choose-weather-resolution-weather-safe'],
  ['hotel-overload', 'continue-1-hotel-gallery'],
  ['hotel-gallery', 'continue-1-alexis-room'],
  ['alexis-room', 'accept-alexis-outfit-excellent'],
  ['alexis-room', 'continue-1-pussy-audience'],
  ['pussy-audience', 'earn-pussy-trust'],
  ['pussy-audience', 'continue-1-pussy-prop-room'],
  ['pussy-prop-room', 'recover-scepter-with-tiny-linda'],
  ['pussy-prop-room', 'continue-1-pussy-scepter-return'],
  ['pussy-scepter-return', 'choose-pussy-womanizer-reward-accept-womanizer'],
  ['pussy-scepter-return', 'continue-2-closed-bar'],
]);
check(
  !alexisFirst.error
    && alexisFirst.state?.sceneId === 'closed-bar'
    && alexisFirst.state.flags.has('alexis-room-resolved')
    && alexisFirst.state.flags.has('womanizer-obtained'),
  `Порядок Алексис → Pussy Sultan не доходит до бара с Womanizer: ${alexisFirst.error ?? 'неполное состояние'}.`,
);

for (const scene of scenes) {
  const outgoing = (scene.actions ?? []).filter((action) => action.nextSceneId !== scene.id);
  if (outgoing.length === 0) continue;
  for (const action of (scene.actions ?? []).filter((candidate) => candidate.nextSceneId === scene.id)) {
    const enabledFlags = Object.entries(action.outcome?.flags ?? {})
      .filter(([, value]) => value === true)
      .map(([flag]) => flag);
    for (const flag of enabledFlags) {
      const blocksEveryExit = outgoing.every((candidate) => candidate.conditions?.noFlags?.includes(flag));
      const canClearBeforeExit = (scene.actions ?? []).some((candidate) => candidate.outcome?.flags?.[flag] === false);
      check(
        !blocksEveryExit || canClearBeforeExit,
        `${scene.id}.${action.id} ставит ${flag}=true, но этот флаг запрещён каждым выходом сцены.`,
      );
    }
  }
}

for (const note of notes) console.log(`INFO: ${note}`);
if (errors.length > 0) {
  for (const error of [...new Set(errors)]) console.error(`ERROR: ${error}`);
  console.error(`Penisuela playable bridge: FAIL (${assertions} checks, ${new Set(errors).size} errors)`);
  process.exit(1);
}
console.log(`Penisuela playable bridge: PASS (${assertions} checks)`);
