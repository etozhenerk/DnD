import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CAMPAIGN_DOCS = 'docs/campaigns/penisuela';
const CAMPAIGN_ID = 'penisuela';
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const EXPECTED = Object.freeze({
  storyNodes: 25,
  sessionScenes: 40,
  galleryChecks: 18,
  galleryEncounters: 6,
  galleryStoryScenes: 16,
  dialoguePresets: 111,
  dialogueVoices: 19,
  publishedAssets: 82,
});

const PATHS = Object.freeze({
  rules: 'content/rules.json',
  characters: 'content/characters.json',
  worldMap: 'content/world-map.json',
  contentReadme: 'content/README.md',
  manifest: 'assets/concepts/manifest.json',
  graph: `${CAMPAIGN_DOCS}/story-graph.json`,
  cast: `${CAMPAIGN_DOCS}/cast.md`,
  formalGameplay: `${CAMPAIGN_DOCS}/gameplay.json`,
  artPlan: `${CAMPAIGN_DOCS}/art-plan.json`,
  videoPlan: `${CAMPAIGN_DOCS}/video-plan.json`,
  videoProduction: `${CAMPAIGN_DOCS}/video-production.md`,
  workflow: `${CAMPAIGN_DOCS}/workflow.json`,
  docsDialogue: `${CAMPAIGN_DOCS}/dialogue.json`,
  session: 'content/campaigns/penisuela-session-preview.json',
  gallery: 'content/campaigns/penisuela-gallery-gameplay.json',
  dialogue: 'content/campaigns/penisuela-dialogue.json',
  finalBoss: 'content/campaigns/penisuela-final-boss.json',
  guide: 'content/campaigns/penisuela-session-preview-guide.md',
  preview: 'content/campaigns/penisuela-preview.json',
});

const REQUIRED_BUNDLE_PARTS = Object.freeze([
  PATHS.session,
  PATHS.gallery,
  PATHS.dialogue,
  PATHS.finalBoss,
  PATHS.guide,
]);

const errors = [];
const errorKeys = new Set();
const jsonCache = new Map();
const textCache = new Map();
let assertionCount = 0;

function fail(code, file, message) {
  const key = `${code}\u0000${file}\u0000${message}`;
  if (errorKeys.has(key)) return;
  errorKeys.add(key);
  errors.push({ code, file, message });
}

function check(condition, code, file, message) {
  assertionCount += 1;
  if (!condition) fail(code, file, message);
  return condition;
}

function repoPath(relativePath, source = relativePath) {
  if (typeof relativePath !== 'string' || relativePath.length === 0) {
    fail('PATH_INVALID', source, 'Путь должен быть непустой строкой.');
    return null;
  }
  if (isAbsolute(relativePath)) {
    fail('PATH_ABSOLUTE', source, `Ожидался путь относительно репозитория, получен: ${relativePath}`);
    return null;
  }
  const absolutePath = resolve(REPO_ROOT, relativePath);
  if (absolutePath !== REPO_ROOT && !absolutePath.startsWith(`${REPO_ROOT}${sep}`)) {
    fail('PATH_ESCAPE', source, `Путь выходит за пределы репозитория: ${relativePath}`);
    return null;
  }
  return absolutePath;
}

function fileExists(relativePath, source = relativePath) {
  const absolutePath = repoPath(relativePath, source);
  if (!absolutePath) return false;
  const valid = existsSync(absolutePath) && statSync(absolutePath).isFile();
  check(valid, 'FILE_MISSING', source, `Файл не существует: ${relativePath}`);
  return valid;
}

function readText(relativePath) {
  if (textCache.has(relativePath)) return textCache.get(relativePath);
  if (!fileExists(relativePath)) {
    textCache.set(relativePath, null);
    return null;
  }
  try {
    const text = readFileSync(repoPath(relativePath), 'utf8');
    textCache.set(relativePath, text);
    return text;
  } catch (error) {
    fail('FILE_READ', relativePath, error.message);
    textCache.set(relativePath, null);
    return null;
  }
}

function readJson(relativePath) {
  if (jsonCache.has(relativePath)) return jsonCache.get(relativePath);
  const text = readText(relativePath);
  if (text === null) {
    jsonCache.set(relativePath, null);
    return null;
  }
  try {
    const value = JSON.parse(text);
    jsonCache.set(relativePath, value);
    return value;
  } catch (error) {
    fail('JSON_INVALID', relativePath, `Невалидный JSON: ${error.message}`);
    jsonCache.set(relativePath, null);
    return null;
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function checkExpectedCount(items, expected, file, label) {
  check(
    Array.isArray(items),
    'SCHEMA_ARRAY',
    file,
    `${label} должен быть массивом.`,
  );
  if (!Array.isArray(items)) return;
  check(
    items.length === expected,
    'RELEASE_COUNT',
    file,
    `${label}: ожидалось ${expected}, получено ${items.length}.`,
  );
}

function checkUnique(items, key, file, label, { kebab = true, required = true } = {}) {
  if (!Array.isArray(items)) {
    if (required) fail('SCHEMA_ARRAY', file, `${label} должен быть массивом.`);
    return new Set();
  }
  const seen = new Map();
  const values = new Set();
  items.forEach((item, index) => {
    const value = typeof key === 'function' ? key(item) : item?.[key];
    if (typeof value !== 'string' || value.length === 0) {
      if (required) {
        fail('ID_MISSING', file, `${label}[${index}] не содержит обязательный ${String(key)}.`);
      }
      return;
    }
    if (kebab && !ID_PATTERN.test(value)) {
      fail('ID_FORMAT', file, `${label}[${index}] имеет не lower-kebab-case id: ${value}`);
    }
    if (seen.has(value)) {
      fail(
        'ID_DUPLICATE',
        file,
        `${label}: id «${value}» повторяется в позициях ${seen.get(value)} и ${index}.`,
      );
    } else {
      seen.set(value, index);
    }
    values.add(value);
  });
  return values;
}

function checkStringSet(values, file, label) {
  if (!Array.isArray(values)) {
    fail('SCHEMA_ARRAY', file, `${label} должен быть массивом строк.`);
    return new Set();
  }
  const seen = new Set();
  values.forEach((value, index) => {
    if (typeof value !== 'string' || value.length === 0) {
      fail('ID_MISSING', file, `${label}[${index}] должен быть непустой строкой.`);
      return;
    }
    if (!ID_PATTERN.test(value)) {
      fail('ID_FORMAT', file, `${label}[${index}] не lower-kebab-case: ${value}`);
    }
    if (seen.has(value)) fail('ID_DUPLICATE', file, `${label}: повторяется «${value}».`);
    seen.add(value);
  });
  return seen;
}

function assertReference(value, known, type, file, context) {
  if (typeof value !== 'string' || value.length === 0) {
    fail('REF_INVALID', file, `${context}: ссылка ${type} должна быть непустой строкой.`);
    return;
  }
  if (!known.has(value)) {
    fail('REF_UNKNOWN', file, `${context}: неизвестная ссылка ${type} «${value}».`);
  }
}

function assertReferenceList(values, known, type, file, context) {
  if (!Array.isArray(values)) {
    fail('REF_INVALID', file, `${context}: ожидался массив ссылок ${type}.`);
    return;
  }
  values.forEach((value, index) =>
    assertReference(value, known, type, file, `${context}[${index}]`),
  );
}

function sameSet(left, right) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function walk(value, visitor, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visitor, `${path}[${index}]`));
    return;
  }
  if (!isObject(value)) return;
  visitor(value, path);
  Object.entries(value).forEach(([key, child]) => walk(child, visitor, `${path}.${key}`));
}

function collectStrings(value, predicate, path = '$', result = []) {
  if (typeof value === 'string') {
    if (predicate(value)) result.push({ value, path });
    return result;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, predicate, `${path}[${index}]`, result));
    return result;
  }
  if (isObject(value)) {
    Object.entries(value).forEach(([key, child]) =>
      collectStrings(child, predicate, `${path}.${key}`, result),
    );
  }
  return result;
}

function toKebabCase(value) {
  const runtimeCounterAliases = {
    show18LiveSuccesses: 'show-18-live-successes',
    show18TeleprompterSuccesses: 'show-18-teleprompter-successes',
    show18Failures: 'show-18-failures',
    groomTunnelSuccesses: 'groom-tunnel-successes',
    groomTunnelFailures: 'groom-tunnel-failures',
    restoreLogSuccesses: 'restore-log-successes',
    restoreLogFailures: 'restore-log-failures',
    timePressure: 'time-pressure',
    preFinalCombats: 'pre-final-combats',
  };
  if (runtimeCounterAliases[value]) return runtimeCounterAliases[value];
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

function compareSet(label, actual, expected, file) {
  const missing = [...expected].filter((value) => !actual.has(value));
  const extra = [...actual].filter((value) => !expected.has(value));
  check(
    missing.length === 0 && extra.length === 0,
    'SET_MISMATCH',
    file,
    `${label}: отсутствуют [${missing.join(', ')}], лишние [${extra.join(', ')}].`,
  );
}

// Parse every Penisuela JSON in the working and canonical directories up front.
for (const [directory, matcher] of [
  [CAMPAIGN_DOCS, /\.json$/],
  ['content/campaigns', /^penisuela.*\.json$/],
]) {
  const absoluteDirectory = repoPath(directory);
  if (!absoluteDirectory || !existsSync(absoluteDirectory)) {
    fail('DIRECTORY_MISSING', directory, 'Каталог релизных данных не существует.');
    continue;
  }
  for (const name of readdirSync(absoluteDirectory).filter((entry) => matcher.test(entry)).sort()) {
    readJson(`${directory}/${name}`);
  }
}

const rules = readJson(PATHS.rules);
const characters = readJson(PATHS.characters);
const worldMap = readJson(PATHS.worldMap);
const manifest = readJson(PATHS.manifest);
const graph = readJson(PATHS.graph);
const formalGameplay = readJson(PATHS.formalGameplay);
const artPlan = readJson(PATHS.artPlan);
const videoPlan = readJson(PATHS.videoPlan);
const workflow = readJson(PATHS.workflow);
const docsDialogue = readJson(PATHS.docsDialogue);
const session = readJson(PATHS.session);
const gallery = readJson(PATHS.gallery);
const dialogue = readJson(PATHS.dialogue);
const finalBoss = readJson(PATHS.finalBoss);
const preview = readJson(PATHS.preview);
const guide = readText(PATHS.guide);
const cast = readText(PATHS.cast);
const contentReadme = readText(PATHS.contentReadme);
const videoProduction = readText(PATHS.videoProduction);

const characterIds = checkUnique(characters, 'id', PATHS.characters, 'characters');
const heroAbilityIds = new Set();
const heroItemIds = new Set();
const heroSourcesByCharacterId = new Map();
for (const [index, character] of asArray(characters).entries()) {
  const abilities = checkUnique(
    character.abilities,
    'id',
    PATHS.characters,
    `characters[${index}].abilities`,
  );
  const items = checkUnique(
    character.items,
    'id',
    PATHS.characters,
    `characters[${index}].items`,
  );
  abilities.forEach((id) => heroAbilityIds.add(id));
  items.forEach((id) => heroItemIds.add(id));
  if (typeof character.id === 'string') {
    heroSourcesByCharacterId.set(character.id, { ability: abilities, item: items });
  }
}

const regionIds = checkUnique(worldMap?.regions, 'id', PATHS.worldMap, 'regions');
const penisuelaRegion = asArray(worldMap?.regions).find((region) => region.id === CAMPAIGN_ID);
check(Boolean(penisuelaRegion), 'REGION_MISSING', PATHS.worldMap, 'Регион penisuela отсутствует.');
if (penisuelaRegion) {
  check(
    penisuelaRegion.campaignId === CAMPAIGN_ID,
    'REGION_CAMPAIGN',
    PATHS.worldMap,
    `regions[penisuela].campaignId должен быть «${CAMPAIGN_ID}».`,
  );
  check(
    ['ready', 'completed'].includes(penisuelaRegion.status),
    'REGION_STATUS',
    PATHS.worldMap,
    'Игровая Пенисуэла должна иметь status «ready» либо «completed» после переноса в летопись.',
  );
  assertReference(
    penisuelaRegion.gameMasterCharacterId,
    characterIds,
    'hero/GM',
    PATHS.worldMap,
    'regions[penisuela].gameMasterCharacterId',
  );
}

const manifestEntries = [];
const manifestIds = new Set();
const manifestPaths = new Map();
if (manifest) {
  for (const [section, entries] of Object.entries(manifest)) {
    if (!Array.isArray(entries)) continue;
    checkUnique(entries, 'id', PATHS.manifest, `manifest.${section}`);
    entries.forEach((entry, index) => {
      if (manifestIds.has(entry.id)) {
        fail('ID_DUPLICATE', PATHS.manifest, `manifest: id «${entry.id}» повторяется между разделами.`);
      }
      manifestIds.add(entry.id);
      manifestEntries.push({ ...entry, section });
      if (typeof entry.path === 'string') {
        if (!manifestPaths.has(entry.path)) manifestPaths.set(entry.path, []);
        manifestPaths.get(entry.path).push({ ...entry, section, index });
      }
    });
  }
}

for (const entry of manifestEntries.filter((item) => item.path?.includes('/penisuela/'))) {
  fileExists(entry.path, `${PATHS.manifest}#${entry.section}/${entry.id}`);
}

const graphNodeIds = checkUnique(graph?.nodes, 'id', PATHS.graph, 'nodes');
const criticalClueIds = checkUnique(graph?.criticalClues, 'id', PATHS.graph, 'criticalClues');
const graphFlags = checkStringSet(graph?.state?.flags, PATHS.graph, 'state.flags');
const graphCounters = checkStringSet(graph?.state?.counters, PATHS.graph, 'state.counters');
checkExpectedCount(graph?.nodes, EXPECTED.storyNodes, PATHS.graph, 'nodes');

for (const [nodeIndex, node] of asArray(graph?.nodes).entries()) {
  const nodeContext = `nodes[${nodeIndex}](${node.id})`;
  if (node.clueIds) {
    assertReferenceList(node.clueIds, criticalClueIds, 'clue', PATHS.graph, `${nodeContext}.clueIds`);
  }
  for (const [transitionIndex, transition] of asArray(node.transitions).entries()) {
    assertReference(
      transition.to,
      graphNodeIds,
      'scene',
      PATHS.graph,
      `${nodeContext}.transitions[${transitionIndex}].to`,
    );
  }
}
for (const [index, clue] of asArray(graph?.criticalClues).entries()) {
  assertReferenceList(
    clue.sourceSceneIds,
    graphNodeIds,
    'scene',
    PATHS.graph,
    `criticalClues[${index}].sourceSceneIds`,
  );
}

const graphStarts = asArray(graph?.nodes).filter((node) => node.start === true);
check(graphStarts.length === 1, 'GRAPH_START', PATHS.graph, `Ожидался один стартовый узел, получено ${graphStarts.length}.`);
if (graphStarts.length === 1) {
  const reachable = new Set([graphStarts[0].id]);
  const queue = [graphStarts[0].id];
  const byId = new Map(asArray(graph?.nodes).map((node) => [node.id, node]));
  while (queue.length > 0) {
    const current = byId.get(queue.shift());
    for (const transition of asArray(current?.transitions)) {
      if (!byId.has(transition.to) || reachable.has(transition.to)) continue;
      reachable.add(transition.to);
      queue.push(transition.to);
    }
  }
  const unreachable = [...graphNodeIds].filter((id) => !reachable.has(id));
  check(
    unreachable.length === 0,
    'GRAPH_UNREACHABLE',
    PATHS.graph,
    `Недостижимые узлы: ${unreachable.join(', ')}.`,
  );
}

const sessionSceneIds = checkUnique(session?.scenes, 'id', PATHS.session, 'scenes');
const sessionPartyIds = checkUnique(
  session?.party,
  'characterId',
  PATHS.session,
  'party',
);
checkExpectedCount(session?.scenes, EXPECTED.sessionScenes, PATHS.session, 'scenes');
check(session?.campaignId === CAMPAIGN_ID, 'CAMPAIGN_ID', PATHS.session, 'campaignId должен быть penisuela.');
check(session?.status === 'ready', 'SESSION_STATUS', PATHS.session, 'status должен быть «ready».');
assertReference(session?.regionId, regionIds, 'region', PATHS.session, 'regionId');
assertReference(session?.initialSceneId, sessionSceneIds, 'scene', PATHS.session, 'initialSceneId');
for (const [partyIndex, member] of asArray(session?.party).entries()) {
  assertReference(member.characterId, characterIds, 'hero', PATHS.session, `party[${partyIndex}].characterId`);
}
for (const [sceneIndex, scene] of asArray(session?.scenes).entries()) {
  const sceneContext = `scenes[${sceneIndex}](${scene.id})`;
  const inspectableIds = checkUnique(
    scene.inspectables,
    'id',
    PATHS.session,
    `${sceneContext}.inspectables`,
  );
  const orders = asArray(scene.inspectables).map((item) => item.order);
  const expectedOrders = orders.map((_, index) => index + 1);
  check(
    JSON.stringify(orders) === JSON.stringify(expectedOrders),
    'ORDER_INVALID',
    PATHS.session,
    `${sceneContext}.inspectables[].order должен идти от 1 без пропусков.`,
  );
  if (scene.exit !== null && scene.exit !== undefined) {
    assertReference(scene.exit.nextSceneId, sessionSceneIds, 'scene', PATHS.session, `${sceneContext}.exit.nextSceneId`);
    assertReferenceList(
      scene.exit.availableAfter,
      inspectableIds,
      'inspectable',
      PATHS.session,
      `${sceneContext}.exit.availableAfter`,
    );
  }
  if (guide) {
    check(
      guide.includes(`\`${scene.id}\``),
      'GUIDE_SCENE_MISSING',
      PATHS.guide,
      `В guide отсутствует раздел/упоминание сцены «${scene.id}».`,
    );
  }
}

const previewSlideIds = checkUnique(preview?.slides, 'id', PATHS.preview, 'slides');
void previewSlideIds;
check(preview?.campaignId === CAMPAIGN_ID, 'CAMPAIGN_ID', PATHS.preview, 'campaignId должен быть penisuela.');
assertReference(preview?.regionId, regionIds, 'region', PATHS.preview, 'regionId');
const previewOrders = asArray(preview?.slides).map((slide) => slide.order);
check(
  JSON.stringify(previewOrders) === JSON.stringify(previewOrders.map((_, index) => index + 1)),
  'ORDER_INVALID',
  PATHS.preview,
  'slides[].order должен идти от 1 без пропусков.',
);
for (const [index, slide] of asArray(preview?.slides).entries()) {
  if (slide.speaker?.kind === 'character') {
    assertReference(slide.speaker.characterId, characterIds, 'hero', PATHS.preview, `slides[${index}].speaker.characterId`);
  }
}

const galleryCheckIds = checkUnique(gallery?.checks, 'id', PATHS.gallery, 'checks');
const galleryEncounterIds = checkUnique(gallery?.encounters, 'id', PATHS.gallery, 'encounters');
const galleryStorySceneIds = checkUnique(gallery?.storyScenes, 'id', PATHS.gallery, 'storyScenes');
const combatActionIds = checkUnique(gallery?.combatActions, 'id', PATHS.gallery, 'combatActions');
const galleryBehaviorIds = checkUnique(gallery?.npcBehaviors, 'id', PATHS.gallery, 'npcBehaviors');
void combatActionIds;
void galleryBehaviorIds;
checkUnique(gallery?.doors, 'id', PATHS.gallery, 'doors');
checkUnique(gallery?.dancePuzzle?.tracks, 'id', PATHS.gallery, 'dancePuzzle.tracks');
checkUnique(gallery?.dressingRoom?.objects, 'id', PATHS.gallery, 'dressingRoom.objects');
checkUnique(
  gallery?.dressingRoom?.stageModule?.assistance,
  'id',
  PATHS.gallery,
  'dressingRoom.stageModule.assistance',
);
checkExpectedCount(gallery?.checks, EXPECTED.galleryChecks, PATHS.gallery, 'checks');
checkExpectedCount(gallery?.encounters, EXPECTED.galleryEncounters, PATHS.gallery, 'encounters');
checkExpectedCount(gallery?.storyScenes, EXPECTED.galleryStoryScenes, PATHS.gallery, 'storyScenes');
check(gallery?.campaignId === CAMPAIGN_ID, 'CAMPAIGN_ID', PATHS.gallery, 'campaignId должен быть penisuela.');

const formalEncounterIds = checkUnique(
  formalGameplay?.encounters,
  'id',
  PATHS.formalGameplay,
  'encounters',
);
const formalItemIds = checkUnique(formalGameplay?.items, 'id', PATHS.formalGameplay, 'items');
const formalConditionIds = checkUnique(
  formalGameplay?.campaignConditions,
  'id',
  PATHS.formalGameplay,
  'campaignConditions',
);
const formalCounterIds = checkUnique(
  formalGameplay?.state?.counters,
  'id',
  PATHS.formalGameplay,
  'state.counters',
);
const relationshipIds = checkUnique(
  formalGameplay?.state?.relationshipTracks,
  'id',
  PATHS.formalGameplay,
  'state.relationshipTracks',
);
const formalSceneIds = checkUnique(
  formalGameplay?.sceneMechanics,
  'sceneId',
  PATHS.formalGameplay,
  'sceneMechanics',
);
for (const [sceneIndex, mechanic] of asArray(formalGameplay?.sceneMechanics).entries()) {
  checkUnique(
    mechanic.actions,
    'id',
    PATHS.formalGameplay,
    `sceneMechanics[${sceneIndex}](${mechanic.sceneId}).actions`,
    { required: false },
  );
  checkUnique(
    mechanic.challenge?.checks,
    'id',
    PATHS.formalGameplay,
    `sceneMechanics[${sceneIndex}](${mechanic.sceneId}).challenge.checks`,
    { required: false },
  );
  checkUnique(
    mechanic.plans,
    'id',
    PATHS.formalGameplay,
    `sceneMechanics[${sceneIndex}](${mechanic.sceneId}).plans`,
    { required: false },
  );
}
for (const [encounterIndex, encounter] of asArray(formalGameplay?.encounters).entries()) {
  checkUnique(
    encounter.actions,
    'id',
    PATHS.formalGameplay,
    `encounters[${encounterIndex}](${encounter.id}).actions`,
    { required: false },
  );
  checkUnique(
    encounter.combatants,
    'id',
    PATHS.formalGameplay,
    `encounters[${encounterIndex}](${encounter.id}).combatants`,
    { required: false },
  );
  if (encounter.unitIds !== undefined) {
    checkStringSet(
      encounter.unitIds,
      PATHS.formalGameplay,
      `encounters[${encounterIndex}](${encounter.id}).unitIds`,
    );
  }
}
check(formalGameplay?.campaignId === CAMPAIGN_ID, 'CAMPAIGN_ID', PATHS.formalGameplay, 'campaignId должен быть penisuela.');
check(formalGameplay?.status === 'approved', 'GAMEPLAY_STATUS', PATHS.formalGameplay, 'status должен быть «approved».');
compareSet('formal state.counters и story graph state.counters', formalCounterIds, graphCounters, PATHS.formalGameplay);
compareSet('sceneMechanics и story graph nodes', formalSceneIds, graphNodeIds, PATHS.formalGameplay);

const finalEncounterId = finalBoss?.encounter?.id;
const allEncounterIds = new Set(galleryEncounterIds);
if (typeof finalEncounterId === 'string') allEncounterIds.add(finalEncounterId);
compareSet('formal encounters и canonical encounters', formalEncounterIds, allEncounterIds, PATHS.formalGameplay);

const knownItems = new Set([...heroItemIds, ...formalItemIds]);
const rulesConditionIds = new Set(asArray(rules?.conditions).map((condition) => condition.id));
const knownConditions = new Set([...rulesConditionIds, ...formalConditionIds]);
const usageScopes = new Set(asArray(rules?.usageScopes));

const allSceneIds = new Set([...graphNodeIds, ...sessionSceneIds, ...galleryStorySceneIds]);
const declaredStorySceneIds = new Set([...graphNodeIds, ...sessionSceneIds]);
for (const sceneId of galleryStorySceneIds) {
  assertReference(sceneId, declaredStorySceneIds, 'story scene', PATHS.gallery, 'storyScenes[].id');
}

const storyActionIds = new Set();
for (const [sceneIndex, storyScene] of asArray(gallery?.storyScenes).entries()) {
  const localActionIds = checkUnique(
    storyScene.actions,
    'id',
    PATHS.gallery,
    `storyScenes[${sceneIndex}](${storyScene.id}).actions`,
  );
  for (const actionId of localActionIds) {
    if (storyActionIds.has(actionId)) {
      fail('ID_DUPLICATE', PATHS.gallery, `storyScenes.actions: глобально повторяется «${actionId}».`);
    }
    storyActionIds.add(actionId);
  }
  for (const [trackIndex, track] of asArray(storyScene.challenge?.tracks).entries()) {
    assertReference(
      track.actionId,
      localActionIds,
      'story action',
      PATHS.gallery,
      `storyScenes[${sceneIndex}].challenge.tracks[${trackIndex}].actionId`,
    );
  }
}

const finalPhaseIds = checkUnique(finalBoss?.phases, 'id', PATHS.finalBoss, 'phases');
const finalPlanIds = checkUnique(finalBoss?.plans, 'id', PATHS.finalBoss, 'plans');
checkUnique(finalBoss?.npcBehavior?.actions, 'id', PATHS.finalBoss, 'npcBehavior.actions');
checkUnique(finalBoss?.encounter?.heroAttacks, 'characterId', PATHS.finalBoss, 'encounter.heroAttacks');
check(finalBoss?.campaignId === CAMPAIGN_ID, 'CAMPAIGN_ID', PATHS.finalBoss, 'campaignId должен быть penisuela.');
assertReference(finalBoss?.sceneId, allSceneIds, 'scene', PATHS.finalBoss, 'sceneId');
compareSet(
  'final plans и final-choice actions',
  finalPlanIds,
  new Set(asArray(gallery?.storyScenes).find((scene) => scene.id === 'final-choice')?.actions?.map((action) => action.id)),
  PATHS.finalBoss,
);
check(
  JSON.stringify(finalBoss?.segmentedHp) === JSON.stringify(finalBoss?.encounter?.segmentedHp),
  'FINAL_SEGMENTS',
  PATHS.finalBoss,
  'segmentedHp верхнего уровня и encounter.segmentedHp должны совпадать.',
);
const phaseNumbers = new Set(asArray(finalBoss?.phases).map((phase) => phase.number));
for (const [index, transition] of asArray(finalBoss?.encounter?.phaseTransitions).entries()) {
  check(
    phaseNumbers.has(transition.phase),
    'REF_UNKNOWN',
    PATHS.finalBoss,
    `encounter.phaseTransitions[${index}].phase ссылается на неизвестную фазу ${transition.phase}.`,
  );
}
for (const [index, action] of asArray(finalBoss?.npcBehavior?.actions).entries()) {
  assertReferenceList(action.phaseIds, finalPhaseIds, 'phase', PATHS.finalBoss, `npcBehavior.actions[${index}].phaseIds`);
}
for (const [index, plan] of asArray(finalBoss?.plans).entries()) {
  assertReference(plan.epilogueSceneId, allSceneIds, 'scene', PATHS.finalBoss, `plans[${index}].epilogueSceneId`);
}
assertReference(
  finalBoss?.defeatFallback?.epilogueSceneId,
  allSceneIds,
  'scene',
  PATHS.finalBoss,
  'defeatFallback.epilogueSceneId',
);
check(
  finalBoss?.npcBehavior?.encounterId === finalEncounterId,
  'REF_UNKNOWN',
  PATHS.finalBoss,
  'npcBehavior.encounterId должен совпадать с encounter.id.',
);

const dialogueVoiceIds = checkUnique(dialogue?.voices, 'characterId', PATHS.dialogue, 'voices');
const dialoguePresetIds = checkUnique(dialogue?.presets, 'id', PATHS.dialogue, 'presets');
checkExpectedCount(dialogue?.voices, EXPECTED.dialogueVoices, PATHS.dialogue, 'voices');
checkExpectedCount(dialogue?.presets, EXPECTED.dialoguePresets, PATHS.dialogue, 'presets');
check(dialogue?.campaignId === CAMPAIGN_ID, 'CAMPAIGN_ID', PATHS.dialogue, 'campaignId должен быть penisuela.');
check(dialogue?.status === 'approved', 'DIALOGUE_STATUS', PATHS.dialogue, 'status должен быть «approved».');
check(dialogue?.selectionPolicy === 'gm-only', 'DIALOGUE_POLICY', PATHS.dialogue, 'selectionPolicy должен быть «gm-only».');
if (docsDialogue && dialogue) {
  check(
    readText(PATHS.docsDialogue) === readText(PATHS.dialogue),
    'DIALOGUE_DESYNC',
    PATHS.dialogue,
    `Рабочий ${PATHS.docsDialogue} и canonical dialogue не являются byte-for-byte копиями.`,
  );
}

const castIds = new Set(
  [...(cast?.matchAll(/`([a-z0-9]+(?:-[a-z0-9]+)*)`/g) ?? [])].map((match) => match[1]),
);
const canonicalActorRegistry = new Set([
  ...castIds,
  ...characterIds,
  ...allEncounterIds,
  ...knownItems,
]);
const knownActors = new Set([...canonicalActorRegistry, ...dialogueVoiceIds]);
for (const [index, voice] of asArray(dialogue?.voices).entries()) {
  assertReference(
    voice.characterId,
    canonicalActorRegistry,
    'NPC/enemy/hero',
    PATHS.dialogue,
    `voices[${index}].characterId`,
  );
}
for (const [index, preset] of asArray(dialogue?.presets).entries()) {
  assertReference(preset.characterId, dialogueVoiceIds, 'dialogue voice', PATHS.dialogue, `presets[${index}].characterId`);
  assertReferenceList(preset.sceneIds, allSceneIds, 'scene', PATHS.dialogue, `presets[${index}].sceneIds`);
  for (const [revealIndex, clueId] of asArray(preset.reveals).entries()) {
    // The known clue set is extended below from formal reveal-clue declarations.
    if (typeof clueId !== 'string') {
      fail('REF_INVALID', PATHS.dialogue, `presets[${index}].reveals[${revealIndex}] должен быть строкой.`);
    }
  }
}

const formalClueIds = new Set(criticalClueIds);
walk(formalGameplay, (object) => {
  if (object.type === 'reveal-clue') {
    const value = object.clueId ?? object.value;
    if (typeof value === 'string') formalClueIds.add(value);
  }
});

function validateSharedReferences(root, file, options = {}) {
  const scenes = options.scenes ?? allSceneIds;
  const encounters = options.encounters ?? allEncounterIds;
  const checks = options.checks ?? galleryCheckIds;
  const actions = options.actions ?? storyActionIds;
  walk(root, (object, objectPath) => {
    const stringSceneFields = ['sceneId', 'nextSceneId', 'failureNextSceneId', 'epilogueSceneId', 'locationId'];
    for (const field of stringSceneFields) {
      if (object[field] !== undefined && object[field] !== null) {
        assertReference(object[field], scenes, 'scene/location', file, `${objectPath}.${field}`);
      }
    }
    for (const field of ['sceneIds', 'sourceSceneIds']) {
      if (object[field] !== undefined) {
        assertReferenceList(object[field], scenes, 'scene', file, `${objectPath}.${field}`);
      }
    }
    for (const field of ['encounterId', 'encounterRef']) {
      if (object[field] !== undefined && object[field] !== null) {
        assertReference(object[field], encounters, 'encounter', file, `${objectPath}.${field}`);
      }
    }
    for (const field of ['encounterIds', 'encounterRefs']) {
      if (object[field] !== undefined) {
        assertReferenceList(object[field], encounters, 'encounter', file, `${objectPath}.${field}`);
      }
    }
    if (object.checkId !== undefined && object.checkId !== null) {
      assertReference(object.checkId, checks, 'check', file, `${objectPath}.checkId`);
    }
    for (const field of ['dialogueId', 'dialoguePresetId', 'presetId']) {
      if (object[field] !== undefined && object[field] !== null) {
        assertReference(object[field], dialoguePresetIds, 'dialogue preset', file, `${objectPath}.${field}`);
      }
    }
    for (const field of ['completionActionId', 'defeatCompletionActionId', 'abortActionId']) {
      if (object[field] !== undefined && object[field] !== null) {
        assertReference(object[field], actions, 'story action', file, `${objectPath}.${field}`);
      }
    }
    for (const field of ['eligibleHeroIds']) {
      if (object[field] !== undefined) {
        assertReferenceList(object[field], sessionPartyIds, 'hero', file, `${objectPath}.${field}`);
      }
    }
    for (const field of ['heroId', 'advantageIfHeroId']) {
      if (object[field] !== undefined && object[field] !== null) {
        assertReference(object[field], sessionPartyIds, 'hero', file, `${objectPath}.${field}`);
      }
    }
    for (const field of ['abilityId', 'automaticSuccessAbilityId', 'advantageAbilityId']) {
      if (object[field] !== undefined && object[field] !== null) {
        assertReference(object[field], heroAbilityIds, 'ability', file, `${objectPath}.${field}`);
      }
    }
    for (const field of ['itemId', 'itemHeld', 'itemOffered', 'itemRecovered']) {
      if (object[field] !== undefined && object[field] !== null) {
        assertReference(object[field], knownItems, 'item', file, `${objectPath}.${field}`);
      }
    }
    if (isObject(object.inventory)) {
      for (const field of ['acquire', 'remove']) {
        if (object.inventory[field] !== undefined) {
          assertReferenceList(object.inventory[field], knownItems, 'item', file, `${objectPath}.inventory.${field}`);
        }
      }
    }
    if (isObject(object.itemCharges)) {
      Object.keys(object.itemCharges).forEach((itemId) =>
        assertReference(itemId, knownItems, 'item', file, `${objectPath}.itemCharges`),
      );
    }
    for (const field of ['flag', 'requiresFlag', 'endingFlag']) {
      if (object[field] !== undefined && object[field] !== null) {
        assertReference(object[field], graphFlags, 'campaign flag', file, `${objectPath}.${field}`);
      }
    }
    for (const field of ['allFlags', 'anyFlags', 'noFlags', 'requiresAnyFlag']) {
      if (object[field] !== undefined) {
        assertReferenceList(object[field], graphFlags, 'campaign flag', file, `${objectPath}.${field}`);
      }
    }
    if (isObject(object.flags)) {
      Object.keys(object.flags).forEach((flag) =>
        assertReference(flag, graphFlags, 'campaign flag', file, `${objectPath}.flags`),
      );
    }
    for (const field of ['counter', 'successCounter', 'failureCounter']) {
      if (typeof object[field] === 'string') {
        assertReference(toKebabCase(object[field]), graphCounters, 'counter', file, `${objectPath}.${field}`);
      }
    }
    for (const field of ['counterLte', 'counterGte']) {
      if (isObject(object[field]) && object[field].counter === undefined) {
        Object.keys(object[field]).forEach((counter) =>
          assertReference(toKebabCase(counter), graphCounters, 'counter', file, `${objectPath}.${field}`),
        );
      }
    }
    if (isObject(object.counters)) {
      Object.keys(object.counters).forEach((counter) =>
        assertReference(toKebabCase(counter), graphCounters, 'counter', file, `${objectPath}.counters`),
      );
    }
    if (object.type === 'increment-counter' && typeof object.target === 'string') {
      assertReference(toKebabCase(object.target), graphCounters, 'counter', file, `${objectPath}.target`);
    }
    if (typeof object.condition === 'string') {
      const conditionParts = object.condition === 'shamed-or-assigned-role'
        ? ['shamed', 'assigned-role']
        : [object.condition];
      conditionParts.forEach((condition) =>
        assertReference(condition, knownConditions, 'condition', file, `${objectPath}.condition`),
      );
    }
    if (typeof object.targetHasCondition === 'string') {
      assertReference(object.targetHasCondition, knownConditions, 'condition', file, `${objectPath}.targetHasCondition`);
    }
    for (const field of ['clues', 'allClues']) {
      if (Array.isArray(object[field])) {
        assertReferenceList(object[field], formalClueIds, 'clue', file, `${objectPath}.${field}`);
      }
    }
    if (typeof object.clue === 'string' && objectPath.includes('.conditions')) {
      assertReference(object.clue, formalClueIds, 'clue', file, `${objectPath}.clue`);
    }
    if (typeof object.relationshipId === 'string') {
      assertReference(object.relationshipId, relationshipIds, 'relationship', file, `${objectPath}.relationshipId`);
    }
  });
}

validateSharedReferences(graph, PATHS.graph, { scenes: graphNodeIds });
validateSharedReferences(gallery, PATHS.gallery);
validateSharedReferences(formalGameplay, PATHS.formalGameplay);
validateSharedReferences(dialogue, PATHS.dialogue);
validateSharedReferences(finalBoss, PATHS.finalBoss);

for (const [index, checkDefinition] of asArray(gallery?.checks).entries()) {
  if (checkDefinition.eligibleHeroIds) {
    assertReferenceList(
      checkDefinition.eligibleHeroIds,
      sessionPartyIds,
      'hero',
      PATHS.gallery,
      `checks[${index}].eligibleHeroIds`,
    );
  }
}
for (const [index, action] of asArray(gallery?.combatActions).entries()) {
  const actionContext = `combatActions[${index}](${action.id ?? '?'})`;
  assertReference(action.characterId, sessionPartyIds, 'hero', PATHS.gallery, `${actionContext}.characterId`);
  assertReferenceList(action.encounterIds, allEncounterIds, 'encounter', PATHS.gallery, `${actionContext}.encounterIds`);
  const validSource = action.source === 'ability' || action.source === 'item';
  check(
    validSource,
    'COMBAT_ACTION_SOURCE',
    PATHS.gallery,
    `${actionContext}.source должен быть «ability» или «item», получено «${action.source}».`,
  );
  check(
    typeof action.sourceId === 'string' && ID_PATTERN.test(action.sourceId),
    'COMBAT_ACTION_SOURCE_ID',
    PATHS.gallery,
    `${actionContext}.sourceId должен быть непустым lower-kebab-case id.`,
  );
  const ownerSources = heroSourcesByCharacterId.get(action.characterId);
  if (validSource && ownerSources) {
    assertReference(
      action.sourceId,
      ownerSources[action.source],
      `${action.source} героя ${action.characterId}`,
      PATHS.gallery,
      `${actionContext}.sourceId`,
    );
  }
  check(
    isObject(action.uses),
    'USES_REQUIRED',
    PATHS.gallery,
    `${actionContext}.uses обязателен.`,
  );
  if (isObject(action.uses)) {
    check(
      usageScopes.has(action.uses.scope),
      'USES_SCOPE',
      PATHS.gallery,
      `${actionContext}.uses.scope неизвестен: ${action.uses.scope}`,
    );
    check(
      Number.isInteger(action.uses.max) && action.uses.max > 0,
      'USES_MAX',
      PATHS.gallery,
      `${actionContext}.uses.max должен быть положительным целым числом.`,
    );
  }
}

const encounterActorIds = new Set(allEncounterIds);
for (const [encounterIndex, encounter] of asArray(gallery?.encounters).entries()) {
  const unitIds = checkUnique(encounter.units, 'id', PATHS.gallery, `encounters[${encounterIndex}].units`, { required: false });
  unitIds.forEach((id) => encounterActorIds.add(id));
  const attackHeroIds = checkUnique(
    encounter.heroAttacks,
    'characterId',
    PATHS.gallery,
    `encounters[${encounterIndex}].heroAttacks`,
  );
  compareSet(`encounters[${encounterIndex}].heroAttacks и party`, attackHeroIds, sessionPartyIds, PATHS.gallery);
}
for (const actorId of dialogueVoiceIds) encounterActorIds.add(actorId);
for (const [behaviorIndex, behavior] of asArray(gallery?.npcBehaviors).entries()) {
  assertReference(behavior.encounterId, galleryEncounterIds, 'encounter', PATHS.gallery, `npcBehaviors[${behaviorIndex}].encounterId`);
  assertReferenceList(behavior.actorIds, encounterActorIds, 'NPC/enemy', PATHS.gallery, `npcBehaviors[${behaviorIndex}].actorIds`);
  const behaviorActionIds = checkUnique(
    behavior.actions,
    'id',
    PATHS.gallery,
    `npcBehaviors[${behaviorIndex}].actions`,
  );
  for (const [priorityIndex, priority] of asArray(behavior.targetPriorities).entries()) {
    if (priority.actionIds) {
      assertReferenceList(
        priority.actionIds,
        behaviorActionIds,
        'NPC action',
        PATHS.gallery,
        `npcBehaviors[${behaviorIndex}].targetPriorities[${priorityIndex}].actionIds`,
      );
    }
  }
}
for (const [encounterIndex, encounter] of asArray(gallery?.encounters).entries()) {
  if (encounter.defeatFallback?.completionActionId) {
    assertReference(
      encounter.defeatFallback.completionActionId,
      storyActionIds,
      'story action',
      PATHS.gallery,
      `encounters[${encounterIndex}].defeatFallback.completionActionId`,
    );
  }
}
for (const [index, attack] of asArray(finalBoss?.encounter?.heroAttacks).entries()) {
  assertReference(attack.characterId, sessionPartyIds, 'hero', PATHS.finalBoss, `encounter.heroAttacks[${index}].characterId`);
}
compareSet(
  'final encounter heroAttacks и party',
  new Set(asArray(finalBoss?.encounter?.heroAttacks).map((attack) => attack.characterId)),
  sessionPartyIds,
  PATHS.finalBoss,
);

for (const [index, preset] of asArray(dialogue?.presets).entries()) {
  walk(preset.conditions, (object, objectPath) => {
    if (typeof object.checkId === 'string') {
      assertReference(object.checkId, galleryCheckIds, 'check', PATHS.dialogue, `presets[${index}].conditions${objectPath}.checkId`);
    }
    if (typeof object.bossPhase === 'number') {
      check(
        phaseNumbers.has(object.bossPhase),
        'REF_UNKNOWN',
        PATHS.dialogue,
        `presets[${index}].conditions${objectPath}.bossPhase неизвестна: ${object.bossPhase}`,
      );
    }
  });
  for (const [effectIndex, effect] of asArray(preset.effects).entries()) {
    if (effect.type === 'start-battle') {
      assertReference(effect.encounterId, allEncounterIds, 'encounter', PATHS.dialogue, `presets[${index}].effects[${effectIndex}].encounterId`);
    }
  }
  assertReferenceList(preset.reveals ?? [], formalClueIds, 'clue', PATHS.dialogue, `presets[${index}].reveals`);
}

const formalActionIds = new Set();
walk(formalGameplay?.sceneMechanics, (object) => {
  if (typeof object.id === 'string') formalActionIds.add(object.id);
});
for (const checkId of galleryCheckIds) {
  assertReference(checkId, formalActionIds, 'formal check/action', PATHS.formalGameplay, 'gallery checks');
}
const knownActionReferences = new Set([
  ...formalActionIds,
  ...storyActionIds,
  ...combatActionIds,
]);
walk(formalGameplay, (object, objectPath) => {
  if (typeof object.actionId === 'string') {
    assertReference(
      object.actionId,
      knownActionReferences,
      'action',
      PATHS.formalGameplay,
      `${objectPath}.actionId`,
    );
  }
});
for (const [index, contribution] of asArray(formalGameplay?.heroContributions).entries()) {
  assertReference(contribution.characterId, sessionPartyIds, 'hero', PATHS.formalGameplay, `heroContributions[${index}].characterId`);
  const capabilities = new Set([...heroAbilityIds, ...heroItemIds]);
  assertReferenceList(contribution.capabilities, capabilities, 'ability/item', PATHS.formalGameplay, `heroContributions[${index}].capabilities`);
}
compareSet(
  'formal party и session party',
  new Set(asArray(formalGameplay?.party?.characterIds)),
  sessionPartyIds,
  PATHS.formalGameplay,
);
for (const [index, behavior] of asArray(formalGameplay?.npcBehaviors).entries()) {
  assertReference(behavior.characterId, knownActors, 'NPC/enemy', PATHS.formalGameplay, `npcBehaviors[${index}].characterId`);
}

for (const sourceRef of asArray(formalGameplay?.sourceRefs)) {
  fileExists(`${CAMPAIGN_DOCS}/${sourceRef}`, `${PATHS.formalGameplay}#sourceRefs`);
}
if (typeof formalGameplay?.systemRef === 'string') {
  fileExists(formalGameplay.systemRef, `${PATHS.formalGameplay}#systemRef`);
}

function validateRuntimeAssetPaths(root, file) {
  for (const asset of collectStrings(root, (value) => value.startsWith('assets/'))) {
    fileExists(asset.value, `${file}${asset.path}`);
    const entries = manifestPaths.get(asset.value) ?? [];
    check(
      entries.length > 0,
      'ASSET_MANIFEST_MISSING',
      file,
      `${asset.path}: путь отсутствует в manifest: ${asset.value}`,
    );
  }
}

validateRuntimeAssetPaths(session, PATHS.session);
validateRuntimeAssetPaths(gallery, PATHS.gallery);
validateRuntimeAssetPaths(dialogue, PATHS.dialogue);
validateRuntimeAssetPaths(finalBoss, PATHS.finalBoss);
validateRuntimeAssetPaths(preview, PATHS.preview);
validateRuntimeAssetPaths(penisuelaRegion, `${PATHS.worldMap}#penisuela`);
for (const character of asArray(characters).filter((item) => sessionPartyIds.has(item.id) || item.id === penisuelaRegion?.gameMasterCharacterId)) {
  validateRuntimeAssetPaths(character, `${PATHS.characters}#${character.id}`);
}

const artAssetIds = checkUnique(artPlan?.assets, 'id', PATHS.artPlan, 'assets');
const publishedArt = asArray(artPlan?.assets).filter((asset) => asset.generationStatus === 'published');
checkExpectedCount(publishedArt, EXPECTED.publishedAssets, PATHS.artPlan, 'published assets');
check(
  artPlan?.cost?.publishedAssets === EXPECTED.publishedAssets,
  'ART_COUNT',
  PATHS.artPlan,
  `cost.publishedAssets должен быть ${EXPECTED.publishedAssets}.`,
);
check(
  artPlan?.cost?.essentialPublishedAssets === EXPECTED.publishedAssets,
  'ART_COUNT',
  PATHS.artPlan,
  `cost.essentialPublishedAssets должен быть ${EXPECTED.publishedAssets}.`,
);
const publishedCanonicalPaths = new Set();
for (const [index, asset] of publishedArt.entries()) {
  const context = `assets[${index}](${asset.id})`;
  check(asset.status === 'approved', 'ART_STATUS', PATHS.artPlan, `${context}.status должен быть «approved».`);
  if (typeof asset.canonicalPath !== 'string' || asset.canonicalPath.length === 0) {
    fail('ASSET_PATH_MISSING', PATHS.artPlan, `${context} не содержит canonicalPath.`);
    continue;
  }
  if (publishedCanonicalPaths.has(asset.canonicalPath)) {
    fail('ASSET_PATH_DUPLICATE', PATHS.artPlan, `${context}: canonicalPath повторяется: ${asset.canonicalPath}`);
  }
  publishedCanonicalPaths.add(asset.canonicalPath);
  fileExists(asset.canonicalPath, `${PATHS.artPlan}#${asset.id}`);
  const entries = manifestPaths.get(asset.canonicalPath) ?? [];
  check(
    entries.length > 0,
    'ASSET_MANIFEST_MISSING',
    PATHS.artPlan,
    `${context}: canonicalPath отсутствует в manifest: ${asset.canonicalPath}`,
  );
  check(
    entries.some((entry) => entry.status === 'canonical'),
    'ASSET_MANIFEST_STATUS',
    PATHS.artPlan,
    `${context}: manifest-запись canonicalPath не имеет status «canonical».`,
  );
  if (asset.reviewSource) {
    fileExists(
      asset.reviewSource.startsWith('docs/')
        ? asset.reviewSource
        : `${CAMPAIGN_DOCS}/${asset.reviewSource}`,
      `${PATHS.artPlan}#${asset.id}.reviewSource`,
    );
  }
  if (Number.isInteger(asset.reviewRound)) {
    fileExists(
      `${CAMPAIGN_DOCS}/art-review-round-${asset.reviewRound}.json`,
      `${PATHS.artPlan}#${asset.id}.reviewRound`,
    );
  }
}

const variantIds = new Set();
walk(artPlan?.assets, (object) => {
  if (
    typeof object.id === 'string' &&
    typeof object.status === 'string' &&
    (object.storage || object.path || object.method)
  ) {
    variantIds.add(object.id);
  }
});
const localReferenceIds = new Set([...artAssetIds, ...manifestIds, ...variantIds]);
for (const [assetIndex, asset] of asArray(artPlan?.assets).entries()) {
  for (const [referenceIndex, reference] of asArray(asset.localReferences).entries()) {
    const context = `assets[${assetIndex}].localReferences[${referenceIndex}]`;
    if (typeof reference !== 'string') {
      fail('REF_INVALID', PATHS.artPlan, `${context} должен быть строкой.`);
    } else if (reference.startsWith('assets/')) {
      fileExists(reference, `${PATHS.artPlan}#${context}`);
      check(
        manifestPaths.has(reference),
        'ASSET_MANIFEST_MISSING',
        PATHS.artPlan,
        `${context}: reference path отсутствует в manifest: ${reference}`,
      );
    } else if (ID_PATTERN.test(reference)) {
      assertReference(reference, localReferenceIds, 'asset/reference', PATHS.artPlan, context);
    }
  }
  if (String(asset.generationStatus).startsWith('deferred')) {
    check(asset.releaseBlocking === false, 'ART_DEFERRED_BLOCKING', PATHS.artPlan, `assets[${assetIndex}] deferred, но releaseBlocking не false.`);
    const reuseIds = new Set([
      ...(typeof asset.reuseAssetId === 'string' ? [asset.reuseAssetId] : []),
      ...asArray(asset.reuseAssetIds),
    ]);
    check(reuseIds.size > 0, 'ART_REUSE_MISSING', PATHS.artPlan, `assets[${assetIndex}] deferred без reuse mapping.`);
    for (const reuseId of reuseIds) {
      assertReference(reuseId, artAssetIds, 'art asset', PATHS.artPlan, `assets[${assetIndex}].reuseAssetIds`);
      const reused = asArray(artPlan?.assets).find((candidate) => candidate.id === reuseId);
      check(
        reused?.generationStatus === 'published',
        'ART_REUSE_UNPUBLISHED',
        PATHS.artPlan,
        `assets[${assetIndex}] переиспользует неопубликованный asset «${reuseId}».`,
      );
    }
  }
}

const workflowArtifacts = workflow?.artifacts;
const allowedArtifactStatuses = new Set(['draft', 'approved', 'stale', 'published']);
const rootPathPrefixes = ['assets/', 'content/', 'docs/', 'scripts/', 'skills/', 'src/', '.github/'];

function resolveWorkflowReference(reference) {
  if (typeof reference !== 'string' || reference.length === 0) {
    fail('WORKFLOW_PATH', PATHS.workflow, 'Workflow artifact path должен быть непустой строкой.');
    return null;
  }
  if (rootPathPrefixes.some((prefix) => reference.startsWith(prefix))) return reference;
  return `${CAMPAIGN_DOCS}/${reference}`;
}

if (!isObject(workflowArtifacts)) {
  fail('WORKFLOW_SCHEMA', PATHS.workflow, 'artifacts должен быть объектом.');
} else {
  for (const [artifactName, artifact] of Object.entries(workflowArtifacts)) {
    check(
      allowedArtifactStatuses.has(artifact.status),
      'WORKFLOW_STATUS',
      PATHS.workflow,
      `artifacts.${artifactName}.status имеет недопустимое значение «${artifact.status}».`,
    );
    for (const field of ['path', 'readablePath', 'canonicalPath', 'repoPath']) {
      if (artifact[field] === undefined || artifact[field] === null) continue;
      const resolvedPath = resolveWorkflowReference(artifact[field]);
      if (!resolvedPath) continue;
      if (fileExists(resolvedPath, `${PATHS.workflow}#artifacts.${artifactName}.${field}`) && extname(resolvedPath) === '.json') {
        readJson(resolvedPath);
      }
    }
    for (const field of ['paths', 'parts']) {
      if (artifact[field] === undefined) continue;
      if (!Array.isArray(artifact[field])) {
        fail('WORKFLOW_SCHEMA', PATHS.workflow, `artifacts.${artifactName}.${field} должен быть массивом.`);
        continue;
      }
      for (const [index, reference] of artifact[field].entries()) {
        const resolvedPath = resolveWorkflowReference(reference);
        if (!resolvedPath) continue;
        if (fileExists(resolvedPath, `${PATHS.workflow}#artifacts.${artifactName}.${field}[${index}]`) && extname(resolvedPath) === '.json') {
          readJson(resolvedPath);
        }
      }
    }
  }
}

const bundleArtifact = workflowArtifacts?.canonicalCampaignBundle;
check(bundleArtifact?.status === 'published', 'BUNDLE_STATUS', PATHS.workflow, 'canonicalCampaignBundle.status должен быть «published».');
compareSet(
  'canonicalCampaignBundle.parts',
  new Set(asArray(bundleArtifact?.parts)),
  new Set(REQUIRED_BUNDLE_PARTS),
  PATHS.workflow,
);
for (const part of REQUIRED_BUNDLE_PARTS) {
  fileExists(part, `${PATHS.workflow}#canonicalCampaignBundle.parts`);
  if (contentReadme) {
    check(
      contentReadme.includes(basename(part)),
      'BUNDLE_DOC_MISSING',
      PATHS.contentReadme,
      `Canonical bundle part не описан: ${basename(part)}.`,
    );
  }
}
check(
  workflowArtifacts?.publishedAssets?.repoPath === PATHS.manifest,
  'WORKFLOW_PATH',
  PATHS.workflow,
  `publishedAssets.repoPath должен быть ${PATHS.manifest}.`,
);
check(
  workflowArtifacts?.dialogue?.canonicalPath === PATHS.dialogue,
  'WORKFLOW_PATH',
  PATHS.workflow,
  `dialogue.canonicalPath должен быть ${PATHS.dialogue}.`,
);
check(
  workflowArtifacts?.dialogue?.presetCount === asArray(dialogue?.presets).length,
  'WORKFLOW_COUNT',
  PATHS.workflow,
  'dialogue.presetCount не совпадает с canonical dialogue.',
);
check(
  workflowArtifacts?.dialogue?.voiceCount === asArray(dialogue?.voices).length,
  'WORKFLOW_COUNT',
  PATHS.workflow,
  'dialogue.voiceCount не совпадает с canonical dialogue.',
);
check(
  workflowArtifacts?.gameplay?.balanceStatus === formalGameplay?.balanceStatus,
  'WORKFLOW_BALANCE',
  PATHS.workflow,
  'gameplay.balanceStatus не совпадает с gameplay.json.',
);

const reviewFileNames = readdirSync(repoPath(CAMPAIGN_DOCS))
  .filter((name) => /^art-review-round-\d+\.json$/.test(name))
  .sort((left, right) => Number(left.match(/\d+/)[0]) - Number(right.match(/\d+/)[0]));
const workflowReviewPaths = asArray(workflowArtifacts?.artReview?.paths);
compareSet('artReview.paths и реальные art-review файлы', new Set(workflowReviewPaths), new Set(reviewFileNames), PATHS.workflow);
for (const reviewName of reviewFileNames) {
  const reviewPath = `${CAMPAIGN_DOCS}/${reviewName}`;
  const review = readJson(reviewPath);
  const expectedRound = Number(reviewName.match(/round-(\d+)/)[1]);
  check(
    (review?.round ?? review?.reviewRound) === expectedRound,
    'ART_REVIEW_ROUND',
    reviewPath,
    `Номер раунда внутри файла не совпадает с именем (${expectedRound}).`,
  );
  for (const [index, item] of asArray(review?.items).entries()) {
    if (typeof item.canonicalPath === 'string' && item.canonicalPath.startsWith('assets/')) {
      fileExists(item.canonicalPath, `${reviewPath}#items[${index}].canonicalPath`);
      check(
        manifestPaths.has(item.canonicalPath),
        'ASSET_MANIFEST_MISSING',
        reviewPath,
        `items[${index}].canonicalPath отсутствует в manifest: ${item.canonicalPath}`,
      );
    }
  }
}

const allowedVideoStatuses = new Set(['draft', 'approved', 'stale', 'published']);
const allowedVideoReadiness = new Set(['ready-for-approval', 'blocked']);
const allowedExecutionStatuses = new Set(['deferred', 'planned', 'in-production', 'complete']);
const allowedReleaseScopes = new Set(['deferred-nonblocking', 'release-blocking']);
check(allowedVideoStatuses.has(videoPlan?.status), 'VIDEO_STATUS', PATHS.videoPlan, `Недопустимый status «${videoPlan?.status}».`);
check(allowedVideoReadiness.has(videoPlan?.readiness), 'VIDEO_READINESS', PATHS.videoPlan, `Недопустимый readiness «${videoPlan?.readiness}».`);
check(allowedExecutionStatuses.has(videoPlan?.executionStatus), 'VIDEO_EXECUTION', PATHS.videoPlan, `Недопустимый executionStatus «${videoPlan?.executionStatus}».`);
check(allowedReleaseScopes.has(videoPlan?.releaseScope), 'VIDEO_SCOPE', PATHS.videoPlan, `Недопустимый releaseScope «${videoPlan?.releaseScope}».`);
checkUnique(videoPlan?.sequences, 'id', PATHS.videoPlan, 'sequences');
const generatedVideoSources = new Map();
for (const asset of asArray(artPlan?.assets).filter((item) => item.generationStatus === 'generated-approved')) {
  if (asset.generatedVariant?.id && asset.generatedVariant?.storage) {
    generatedVideoSources.set(asset.generatedVariant.id, asset.generatedVariant.storage);
  }
}
for (const [sequenceIndex, sequence] of asArray(videoPlan?.sequences).entries()) {
  assertReferenceList(sequence.sourceSceneIds, graphNodeIds, 'story scene', PATHS.videoPlan, `sequences[${sequenceIndex}].sourceSceneIds`);
  checkUnique(sequence.shots, 'id', PATHS.videoPlan, `sequences[${sequenceIndex}].shots`);
  for (const [shotIndex, shot] of asArray(sequence.shots).entries()) {
    const source = shot.sourceArt;
    const context = `sequences[${sequenceIndex}].shots[${shotIndex}].sourceArt`;
    if (!isObject(source)) {
      fail('VIDEO_SOURCE', PATHS.videoPlan, `${context} отсутствует.`);
      continue;
    }
    fileExists(source.path, `${PATHS.videoPlan}#${context}.path`);
    const generatedPath = generatedVideoSources.get(source.assetId);
    const manifestEntry = manifestEntries.find((entry) => entry.id === source.assetId && entry.path === source.path);
    check(
      generatedPath === source.path || Boolean(manifestEntry),
      'VIDEO_SOURCE_UNKNOWN',
      PATHS.videoPlan,
      `${context}: assetId/path не совпадает ни с approved generatedVariant, ни с manifest: ${source.assetId} -> ${source.path}`,
    );
    if (videoPlan.readiness === 'ready-for-approval') {
      check(Boolean(manifestEntry), 'VIDEO_SOURCE_UNPUBLISHED', PATHS.videoPlan, `${context}: ready-for-approval требует manifest-запись.`);
    }
    for (const [cueIndex, cueId] of asArray(shot.audio?.dialogueCueIds).entries()) {
      assertReference(cueId, dialoguePresetIds, 'dialogue preset', PATHS.videoPlan, `${context}.audio.dialogueCueIds[${cueIndex}]`);
    }
  }
}
if (videoPlan?.readiness === 'blocked') {
  check(['draft', 'stale'].includes(videoPlan.status), 'VIDEO_CONTRADICTION', PATHS.videoPlan, 'blocked video не может быть approved/published.');
  check(asArray(videoPlan.blockedInputs).length > 0, 'VIDEO_BLOCKERS_MISSING', PATHS.videoPlan, 'blocked требует непустой blockedInputs.');
  check(videoPlan.executionStatus === 'deferred', 'VIDEO_CONTRADICTION', PATHS.videoPlan, 'Текущий blocked release pack должен иметь executionStatus «deferred».');
  check(videoPlan.releaseScope === 'deferred-nonblocking', 'VIDEO_CONTRADICTION', PATHS.videoPlan, 'Deferred video должен быть deferred-nonblocking.');
} else if (videoPlan?.readiness === 'ready-for-approval') {
  check(asArray(videoPlan.blockedInputs).length === 0, 'VIDEO_CONTRADICTION', PATHS.videoPlan, 'ready-for-approval не должен иметь blockedInputs.');
  check(videoPlan.status !== 'stale', 'VIDEO_CONTRADICTION', PATHS.videoPlan, 'stale video не может быть ready-for-approval.');
}
check(
  workflowArtifacts?.videoPlan?.status === videoPlan?.status,
  'VIDEO_WORKFLOW_DESYNC',
  PATHS.workflow,
  'videoPlan.status не совпадает с video-plan.json.',
);
check(
  workflowArtifacts?.videoPlan?.readiness === videoPlan?.readiness,
  'VIDEO_WORKFLOW_DESYNC',
  PATHS.workflow,
  'videoPlan.readiness не совпадает с video-plan.json.',
);
if (videoProduction && videoPlan) {
  check(
    videoProduction.includes(`\`${videoPlan.status}\``) && videoProduction.includes(`\`${videoPlan.readiness}\``),
    'VIDEO_MARKDOWN_DESYNC',
    PATHS.videoProduction,
    'Markdown не отражает status/readiness из video-plan.json.',
  );
  if (videoPlan.executionStatus === 'deferred') {
    check(/отложен|deferred/i.test(videoProduction), 'VIDEO_MARKDOWN_DESYNC', PATHS.videoProduction, 'Markdown не сообщает, что production отложен.');
  }
}

if (errors.length > 0) {
  errors.sort((left, right) =>
    left.file.localeCompare(right.file, 'ru') ||
    left.code.localeCompare(right.code, 'en') ||
    left.message.localeCompare(right.message, 'ru'),
  );
  console.error(`Penisuela release validation FAILED: ${errors.length} error(s).`);
  errors.forEach((error, index) => {
    console.error(`${index + 1}. [${error.code}] ${error.file}: ${error.message}`);
  });
  process.exitCode = 1;
} else {
  console.log(
    `Penisuela release validation PASSED: ${assertionCount} assertions; ` +
      `${graphNodeIds.size} graph nodes, ${sessionSceneIds.size} screens, ` +
      `${galleryCheckIds.size} checks, ${allEncounterIds.size} encounters, ` +
      `${dialoguePresetIds.size} dialogue presets, ${publishedArt.length} published assets.`,
  );
}
