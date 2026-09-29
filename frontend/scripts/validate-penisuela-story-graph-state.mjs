#!/usr/bin/env node

import {readFile} from 'node:fs/promises';

const graphPath = process.argv[2];
if (!graphPath || graphPath === '--help' || graphPath === '-h') {
  console.log('Usage: node scripts/validate-penisuela-story-graph-state.mjs <story-graph.json>');
  process.exit(graphPath ? 0 : 2);
}

const graph = JSON.parse(await readFile(graphPath, 'utf8'));
const errors = [];
const errorSet = new Set();

function addError(message) {
  if (errorSet.has(message)) return;
  errorSet.add(message);
  errors.push(message);
}

function exitIfErrors() {
  if (errors.length === 0) return;
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}

const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
const byId = new Map(nodes.map((node) => [node.id, node]));
const declaredFlags = new Set(graph.state?.flags ?? []);
const declaredCounters = new Set(graph.state?.counters ?? []);
const counterRules = graph.state?.counterRules ?? {};
const supportedEffects = new Set(graph.executionContract?.supportedEffects ?? []);
const callbackRules = graph.callbackRules ?? [];
const trackFlags = {
  live: 'final-primary-live',
  director: 'final-primary-director',
  physical: 'final-primary-physical'
};

const mandatoryChain = [
  'groom-preparation-room',
  'kreed-disclosure',
  'post-kreed-route',
  'graywise-door-trust',
  'bedroom-reveal',
  'igor-unboxing',
  'wedding-reminder',
  'wedding-reminder-resolution',
  'final-choice',
  'last-take-boss'
];
const mandatoryIndex = new Map(mandatoryChain.map((id, index) => [id, index]));
const endingIds = new Set([
  'wedding-epilogue',
  'director-epilogue',
  'shutdown-epilogue',
  'evacuation-epilogue'
]);
const consentFlags = [
  'kreed-live-consent',
  'igor-live-consent',
  'kreed-technical-consent',
  'igor-technical-consent',
  'couple-technical-consent',
  'kreed-publication-consent',
  'igor-publication-consent',
  'couple-publication-consent'
];

function initialState(callbackMode = 'routing') {
  return {
    flags: Object.fromEntries([...declaredFlags].map((flag) => [flag, false])),
    counters: Object.fromEntries(
      [...declaredCounters].map((counter) => [counter, counterRules[counter]?.initial ?? 0])
    ),
    clues: new Set(),
    callbackCounts: Object.fromEntries(callbackRules.map((rule) => [rule.assetFlag, 0])),
    chainIndex: 0,
    callbackMode
  };
}

function cloneState(state) {
  return {
    flags: {...state.flags},
    counters: {...state.counters},
    clues: new Set(state.clues),
    callbackCounts: {...state.callbackCounts},
    chainIndex: state.chainIndex,
    callbackMode: state.callbackMode
  };
}

function addConditionFlags(condition, result) {
  if (!condition || typeof condition !== 'object') return;
  if (typeof condition.flag === 'string') result.add(condition.flag);
  for (const child of condition.all ?? []) addConditionFlags(child, result);
  for (const child of condition.any ?? []) addConditionFlags(child, result);
  if (condition.not) addConditionFlags(condition.not, result);
}

function collectExecutableGuardFlags(value, result = new Set(), includeAppliesWhen = true) {
  if (Array.isArray(value)) {
    for (const child of value) {
      collectExecutableGuardFlags(child, result, includeAppliesWhen);
    }
    return result;
  }
  if (!value || typeof value !== 'object') return result;
  for (const [key, child] of Object.entries(value)) {
    if (
      [
        'condition',
        'exitCondition',
        'requiredWhen',
        'postcondition',
        'entryCondition',
        'eligibleWhen',
        'fallbackWhen',
        'appliesWhen'
      ].includes(key) &&
      (key !== 'appliesWhen' || includeAppliesWhen)
    ) {
      addConditionFlags(child, result);
    }
    collectExecutableGuardFlags(child, result, includeAppliesWhen);
  }
  return result;
}

// Equivalence keeps every value that can affect a later guard, callback, or invariant.
// Purely descriptive flags do not make the state space exponential.
const signatureFlags = collectExecutableGuardFlags({
  nodes: graph.nodes,
  exclusiveFlagGroups: graph.state?.exclusiveFlagGroups
});
const nonConditionalGuardFlags = collectExecutableGuardFlags(
  {
    nodes: graph.nodes,
    exclusiveFlagGroups: graph.state?.exclusiveFlagGroups
  },
  new Set(),
  false
);
const appliesWhenFlags = new Set();
const appliesWhenFlagsNeedingWorklistIdentity = new Set();
for (const node of nodes) {
  for (const transition of node.transitions ?? []) {
    const groups = transition.transitionOutcomes
      ? [transition.transitionOutcomes]
      : transition.transitionOutcomeGroups ?? [];
    const definitelyWrittenByPriorAtomicGroup = new Set();
    for (const group of groups) {
      const groupAppliesFlags = new Set();
      addConditionFlags(group.appliesWhen, groupAppliesFlags);
      for (const flag of groupAppliesFlags) {
        appliesWhenFlags.add(flag);
        if (!definitelyWrittenByPriorAtomicGroup.has(flag)) {
          appliesWhenFlagsNeedingWorklistIdentity.add(flag);
        }
      }
      if (!group.appliesWhen && (group.options?.length ?? 0) > 0) {
        const writtenByEveryOption = group.options
          .map(
            (option) =>
              new Set(
                (option.effects ?? [])
                  .filter((effect) => effect.type === 'set-flag')
                  .map((effect) => effect.flag)
              )
          )
          .reduce(
            (common, written) =>
              new Set([...common].filter((flag) => written.has(flag)))
          );
        for (const flag of writtenByEveryOption) {
          definitelyWrittenByPriorAtomicGroup.add(flag);
        }
      }
    }
  }
}
// A conditional flag overwritten by every option of an earlier, unconditional group
// in the same atomic transition cannot affect worklist identity. All other appliesWhen
// flags remain in the global state signature.
for (const flag of appliesWhenFlags) {
  if (
    !nonConditionalGuardFlags.has(flag) &&
    !appliesWhenFlagsNeedingWorklistIdentity.has(flag)
  ) {
    signatureFlags.delete(flag);
  }
}
for (const flag of [
  ...Object.values(trackFlags),
  ...consentFlags,
  'kreed-rescued',
  'kreed-disclosure-complete',
  'graywise-door-opened',
  'igor-revealed',
  'igor-unboxing-complete',
  'wedding-reminder-delivered',
  'wedding-reminder-refused',
  'bedroom-introduction-complete',
  'bedroom-sequence-resolved',
  'igor-oriented',
  'early-assault-declared',
  'doom-five-triggered',
  'physical-final-forced',
  'point-of-no-return-entered',
  'emergency-last-action-required',
  'emergency-last-action-resolved',
  'emergency-evacuation-forced',
  'crisis-resolved',
  'final-outcome-selected',
  'publication-decision-complete',
  'selected-epilogue-wedding',
  'selected-epilogue-director',
  'selected-epilogue-shutdown',
  'selected-epilogue-evacuation',
  'graywise-privacy-ally'
]) signatureFlags.add(flag);
for (const group of graph.state?.exclusiveFlagGroups ?? []) {
  for (const flag of group.flags ?? []) signatureFlags.add(flag);
}
signatureFlags.add('olva-relationship-review-partial');

const hotelHubNodeIds = new Set([
  'hotel-gallery',
  'alexis-room',
  'pussy-audience',
  'pussy-prop-room',
  'pussy-scepter-return',
  'alexis-room-after-pussy'
]);
const hotelHubTransientGuardFlags = new Set([
  'alexis-room-resolved',
  'pussy-quest-accepted',
  'scepter-recovered'
]);
const relationshipNodeIds = new Set([
  'couples-session-entry',
  'couples-session-stas',
  'couples-session-polina',
  'olva-relationship-review',
  'show-18-pavilion',
  'couples-session-plan',
  'couples-session-choice'
]);
const relationshipTransientGuardFlags = new Set([
  'stas-explicit-answer',
  'polina-explicit-answer',
  'stas-ready-to-continue',
  'polina-ready-to-continue',
  'olva-direct-review-complete',
  'show18-contradictions-complete',
  'couple-near-term-plan-accepted',
  'womanizer-session-entered',
  'polina-item-decision-made'
]);

function stateSignature(state, nodeId) {
  const preserveHotelHubGuards = nodeId === undefined || hotelHubNodeIds.has(nodeId);
  const preserveRelationshipGuards = nodeId === undefined || relationshipNodeIds.has(nodeId);
  const flags = [...signatureFlags]
    .filter(
      (flag) =>
        state.flags[flag] &&
        (preserveHotelHubGuards || !hotelHubTransientGuardFlags.has(flag)) &&
        (preserveRelationshipGuards || !relationshipTransientGuardFlags.has(flag))
    )
    .sort()
    .join(',');
  const counters = [...declaredCounters]
    .sort()
    .filter((counter) => {
      if (nodeId === undefined || counter === 'doom') return true;
      if (counter === 'show18-contradictions-broken') return relationshipNodeIds.has(nodeId);
      if (counter === 'kreed-evidence-count') {
        return nodeId === 'artists-dressing-room' || nodeId === 'groom-hypothesis';
      }
      if (counter.startsWith('final-')) return nodeId === 'last-take-boss';
      return true;
    })
    .map((counter) => `${counter}:${state.counters[counter]}`)
    .join(',');
  return `${state.chainIndex}|${flags}|${counters}`;
}

function evaluate(condition, state) {
  if (!condition) return true;
  if (condition.otherwise === true) return true;
  if (Array.isArray(condition.all)) return condition.all.every((item) => evaluate(item, state));
  if (Array.isArray(condition.any)) return condition.any.some((item) => evaluate(item, state));
  if (condition.not) return !evaluate(condition.not, state);
  if (condition.flag) return state.flags[condition.flag] === condition.equals;
  if (condition.counter) {
    const value = state.counters[condition.counter];
    if (condition.eq !== undefined) return value === condition.eq;
    if (condition.gt !== undefined) return value > condition.gt;
    if (condition.gte !== undefined) return value >= condition.gte;
    if (condition.lt !== undefined) return value < condition.lt;
    if (condition.lte !== undefined) return value <= condition.lte;
  }
  throw new Error(`Unknown condition at runtime: ${JSON.stringify(condition)}`);
}

function selectChoices(choices, state) {
  const regular = (choices ?? []).filter(
    (choice) => choice.condition?.otherwise !== true && evaluate(choice.condition, state)
  );
  if (regular.length > 0) return regular;
  return (choices ?? []).filter((choice) => choice.condition?.otherwise === true);
}

function applyCounterOnReach(next, counter, previous, context) {
  const onReach = counterRules[counter]?.onReach;
  if (!onReach || previous >= onReach.value || next.counters[counter] < onReach.value) return;
  for (const effect of onReach.effects ?? []) {
    applySingleEffect(next, effect, `${context}.onReach.${counter}`);
  }
}

function resolveCallback(next, rule, context) {
  if (!rule || next.flags[rule.resolvedFlag]) return;
  next.callbackCounts[rule.assetFlag] = (next.callbackCounts[rule.assetFlag] ?? 0) + 1;
  if (next.callbackCounts[rule.assetFlag] > 1) {
    addError(`Callback ${rule.assetFlag} resolved more than once at ${context}`);
  }
  next.flags[rule.resolvedFlag] = true;
  if (rule.clearsFlag) next.flags[rule.clearsFlag] = false;
}

function activateCallbackPhase(next, phase, context) {
  const eligible = callbackRules
    .filter(
      (rule) =>
        rule.phase === phase &&
        next.flags[rule.assetFlag] &&
        !next.flags[rule.resolvedFlag] &&
        evaluate(rule.eligibleWhen, next)
    )
    .sort(
      (left, right) =>
        (left.priority ?? Number.POSITIVE_INFINITY) - (right.priority ?? Number.POSITIVE_INFINITY) ||
        left.assetFlag.localeCompare(right.assetFlag)
    );
  for (const rule of eligible) resolveCallback(next, rule, `${context}.${rule.assetFlag}`);
}

function resolveCallbackFallback(next, context) {
  for (const rule of callbackRules) {
    if (!next.flags[rule.assetFlag] || next.flags[rule.resolvedFlag]) continue;
    const allowed = rule.fallbackWhen
      ? evaluate(rule.fallbackWhen, next)
      : rule.fallback === 'epilogue';
    if (allowed) resolveCallback(next, rule, `${context}.${rule.assetFlag}`);
  }
}

function applySingleEffect(next, effect, context) {
  if (!supportedEffects.has(effect.type)) {
    addError(`Unsupported effect ${effect.type} at ${context}`);
    return;
  }
  if (effect.type === 'set-flag') {
    next.flags[effect.flag] = effect.value;
    return;
  }
  if (effect.type === 'increment-counter') {
    const previous = next.counters[effect.counter];
    const maximum = effect.cap ?? counterRules[effect.counter]?.max ?? Number.POSITIVE_INFINITY;
    const updated = Math.min(maximum, previous + effect.value);
    if (updated < previous) {
      addError(`Counter cap decreases ${effect.counter} from ${previous} to ${updated} at ${context}`);
    }
    next.counters[effect.counter] = Math.max(previous, updated);
    applyCounterOnReach(next, effect.counter, previous, context);
    return;
  }
  if (effect.type === 'raise-counter-to-at-least') {
    const previous = next.counters[effect.counter];
    const maximum = effect.cap ?? counterRules[effect.counter]?.max ?? Number.POSITIVE_INFINITY;
    const updated = Math.min(maximum, Math.max(previous, effect.value));
    if (updated < previous) {
      addError(`Counter cap decreases ${effect.counter} from ${previous} to ${updated} at ${context}`);
    }
    next.counters[effect.counter] = Math.max(previous, updated);
    applyCounterOnReach(next, effect.counter, previous, context);
    return;
  }
  if (effect.type === 'reveal-clue') {
    next.clues.add(effect.clueId);
    return;
  }
  if (effect.type === 'select-final-track') {
    const previousTrack = Object.entries(trackFlags).find(([, flag]) => next.flags[flag])?.[0];
    const thresholdMet =
      !effect.hybridAfterCounter ||
      next.counters[effect.hybridAfterCounter] > (effect.hybridAfterValue ?? 0);
    if (effect.markHybridOnChange && thresholdMet && previousTrack && previousTrack !== effect.track) {
      next.flags['hybrid-support-used'] = true;
    }
    for (const [track, flag] of Object.entries(trackFlags)) next.flags[flag] = track === effect.track;
    return;
  }
  if (effect.type === 'activate-callback-phase') {
    if (next.callbackMode === 'routing') {
      const graywise = callbackRules.find((rule) => rule.assetFlag === 'graywise-privacy-ally');
      if (
        effect.phase === graywise?.phase &&
        next.flags[graywise.assetFlag] &&
        evaluate(graywise.eligibleWhen, next)
      ) {
        next.flags[graywise.clearsFlag] = false;
      }
      return;
    }
    activateCallbackPhase(next, effect.phase, context);
    return;
  }
  if (effect.type === 'resolve-callback-fallback' && next.callbackMode === 'full') {
    resolveCallbackFallback(next, context);
  }
}

function applyEffects(state, effects, context, validate = true) {
  const next = cloneState(state);
  for (const effect of effects ?? []) applySingleEffect(next, effect, context);
  if (validate) validateState(next, context);
  return next;
}

function validateState(state, context) {
  for (const [counter, rule] of Object.entries(counterRules)) {
    const value = state.counters[counter];
    if (!Number.isFinite(value) || value < rule.min || value > rule.max) {
      addError(`Counter ${counter}=${value} outside ${rule.min}..${rule.max} at ${context}`);
    }
  }
  const executableInvariantContracts = new Set([
    'bedroom-introduction-complete => wedding-reminder-delivered',
    'wedding-reminder-delivered => NOT wedding-reminder-refused',
    'wedding-reminder-refused => NOT wedding-reminder-delivered AND bedroom-sequence-resolved AND physical-final-forced',
    'bedroom-sequence-resolved => wedding-reminder-delivered OR wedding-reminder-refused',
    'wedding-reminder-delivered => igor-unboxing-complete',
    'igor-unboxing-complete => igor-revealed',
    'igor-revealed => graywise-door-opened',
    'graywise-door-opened => kreed-disclosure-complete',
    'kreed-disclosure-complete => kreed-rescued',
    'igor-oriented => bedroom-introduction-complete OR (crisis-resolved AND bedroom-sequence-resolved AND igor-post-crisis-orientation-attempted)',
    'kreed-live-consent OR igor-live-consent OR kreed-technical-consent OR igor-technical-consent => igor-oriented',
    'point-of-no-return-entered => bedroom-sequence-resolved',
    'emergency-last-action-resolved => emergency-last-action-required',
    'emergency-last-action-required AND crisis-resolved => emergency-last-action-resolved',
    'graywise-privacy-ally => graywise-door-opened',
    'couple-technical-consent => kreed-technical-consent AND igor-technical-consent',
    'couple-publication-consent => kreed-publication-consent AND igor-publication-consent',
    'scepter-recovered => pussy-quest-accepted',
    'scepter-returned => scepter-recovered',
    'pussy-reward-received => scepter-returned',
    'womanizer-obtained => pussy-reward-received'
  ]);
  for (const invariant of graph.state?.invariants ?? []) {
    if (!executableInvariantContracts.has(invariant)) {
      addError(`Declared invariant lacks executable validator coverage: ${invariant}`);
    }
  }
  for (const invariant of executableInvariantContracts) {
    if (!(graph.state?.invariants ?? []).includes(invariant)) {
      addError(`Required executable invariant is absent from graph: ${invariant}`);
    }
  }
  for (const group of graph.state?.exclusiveFlagGroups ?? []) {
    const active = (group.flags ?? []).filter((flag) => state.flags[flag]);
    const required = evaluate(group.requiredWhen, state);
    if (active.length > 1) addError(`Exclusive group ${group.id} has ${active.length} flags at ${context}`);
    if (required && group.selection === 'exactly-one' && active.length !== 1) {
      addError(`Exclusive group ${group.id} lacks exactly one choice at ${context}`);
    }
    if (!required && group.forbiddenBeforeRequiredWhen && active.length > 0) {
      addError(`Exclusive group ${group.id} selected before its gate at ${context}`);
    }
  }
  const anyPrefinalConsent = consentFlags.slice(0, 5).some((flag) => state.flags[flag]);
  if (anyPrefinalConsent && !state.flags['igor-oriented']) {
    addError(`Consent became true before Igor was oriented at ${context}`);
  }
  if (
    state.flags['couple-technical-consent'] !==
    Boolean(state.flags['kreed-technical-consent'] && state.flags['igor-technical-consent'])
  ) addError(`Aggregate technical consent disagrees with individual answers at ${context}`);
  if (
    state.flags['couple-publication-consent'] !==
    Boolean(state.flags['kreed-publication-consent'] && state.flags['igor-publication-consent'])
  ) addError(`Aggregate publication consent disagrees with individual answers at ${context}`);
  if (
    consentFlags.slice(5).some((flag) => state.flags[flag]) &&
    (!state.flags['crisis-resolved'] || !state.flags['igor-oriented'])
  ) addError(`Publication consent became true before post-crisis orientation at ${context}`);
  const implications = [
    ['bedroom-introduction-complete', 'wedding-reminder-delivered'],
    ['wedding-reminder-delivered', 'igor-unboxing-complete'],
    ['igor-unboxing-complete', 'igor-revealed'],
    ['igor-revealed', 'graywise-door-opened'],
    ['graywise-door-opened', 'kreed-disclosure-complete'],
    ['kreed-disclosure-complete', 'kreed-rescued'],
    ['graywise-privacy-ally', 'graywise-door-opened'],
    ['point-of-no-return-entered', 'bedroom-sequence-resolved'],
    ['scepter-recovered', 'pussy-quest-accepted'],
    ['scepter-returned', 'scepter-recovered'],
    ['pussy-reward-received', 'scepter-returned'],
    ['womanizer-obtained', 'pussy-reward-received']
  ];
  for (const [antecedent, consequent] of implications) {
    if (state.flags[antecedent] && !state.flags[consequent]) {
      addError(`${antecedent} without ${consequent} at ${context}`);
    }
  }
  if (
    state.flags['igor-oriented'] &&
    !state.flags['bedroom-introduction-complete'] &&
    !(
      state.flags['crisis-resolved'] &&
      state.flags['bedroom-sequence-resolved'] &&
      state.flags['igor-post-crisis-orientation-attempted']
    )
  ) {
    addError(`Igor became oriented outside the prefinal or explicit post-crisis path at ${context}`);
  }
  if (state.flags['bedroom-sequence-resolved']) {
    const outcomes = [
      state.flags['wedding-reminder-delivered'],
      state.flags['wedding-reminder-refused']
    ].filter(Boolean).length;
    if (outcomes !== 1) addError(`Bedroom sequence resolved without one reminder outcome at ${context}`);
  }
  if (state.flags['wedding-reminder-delivered'] && state.flags['wedding-reminder-refused']) {
    addError(`Wedding reminder is both delivered and refused at ${context}`);
  }
  if (
    state.flags['wedding-reminder-refused'] &&
    !state.flags['bedroom-sequence-resolved']
  ) {
    addError(`Reminder refusal did not resolve the bedroom sequence at ${context}`);
  }
  if (state.flags['wedding-reminder-refused'] && !state.flags['physical-final-forced']) {
    addError(`Reminder refusal did not force the physical fallback at ${context}`);
  }
  if (state.flags['emergency-last-action-resolved'] && !state.flags['emergency-last-action-required']) {
    addError(`Emergency action resolved without first being required at ${context}`);
  }
  if (
    state.flags['emergency-last-action-required'] &&
    state.flags['crisis-resolved'] &&
    !state.flags['emergency-last-action-resolved']
  ) {
    addError(`Crisis resolved while the manual emergency action is pending at ${context}`);
  }
  if (state.flags['point-of-no-return-entered']) {
    const activeTracks = Object.values(trackFlags).filter((flag) => state.flags[flag]);
    if (activeTracks.length !== 1) {
      addError(`Point of no return has ${activeTracks.length} active final tracks at ${context}`);
    }
    if (
      (state.flags['physical-final-forced'] || state.flags['doom-five-triggered']) &&
      (!state.flags['final-primary-physical'] ||
        state.flags['final-primary-live'] ||
        state.flags['final-primary-director'])
    ) {
      addError(`Forced/Doom5 state is not exclusively physical after PONR at ${context}`);
    }
  }
}

function enterMandatoryNode(state, nodeId, trace) {
  const index = mandatoryIndex.get(nodeId);
  if (index === undefined) return state;
  const next = cloneState(state);
  if (index !== next.chainIndex) {
    addError(
      `Mandatory chain violation at ${nodeId}: expected ${mandatoryChain[next.chainIndex] ?? 'end'}; route ${trace.join(' -> ')}`
    );
    return next;
  }
  next.chainIndex += 1;
  return next;
}

function expandOutcomeContract(contract, variants, context) {
  const expanded = [];
  for (const variant of variants) {
    if (contract.appliesWhen && !evaluate(contract.appliesWhen, variant.state)) {
      expanded.push(variant);
      continue;
    }
    const choices = selectChoices(contract.options, variant.state);
    if (choices.length === 0) {
      addError(`No valid outcome in ${context}.${contract.id ?? 'unnamed'}`);
      continue;
    }
    for (const option of choices) {
      expanded.push({
        state: applyEffects(
          variant.state,
          option.effects,
          `${context}.${contract.id}.${option.id}`,
          false
        ),
        choices: [...variant.choices, option.id]
      });
    }
  }
  return expanded;
}

function expandTransition(transition, state, context) {
  let variants = [{state, choices: []}];
  if (transition.transitionOutcomes) {
    variants = expandOutcomeContract(transition.transitionOutcomes, variants, context);
  } else {
    for (const group of transition.transitionOutcomeGroups ?? []) {
      variants = expandOutcomeContract(group, variants, context);
    }
  }
  return variants.map((variant) => {
    const next = applyEffects(variant.state, transition.effects, `${context}.edge`);
    if (transition.postcondition && !evaluate(transition.postcondition, next)) {
      addError(`Transition postcondition failed at ${context}`);
    }
    return {
      state: next,
      choice: variant.choices.join('+') || transition.outcomeId || 'edge'
    };
  });
}

function uniqueStateVariants(variants) {
  const unique = new Map();
  for (const variant of variants) {
    const key = stateSignature(variant.state);
    if (!unique.has(key)) unique.set(key, variant);
  }
  return [...unique.values()];
}

const finaleCache = new Map();
const finaleWrittenFlags = new Set(['privacy-lock-active']);
const finaleWrittenCounters = new Set();
walk(
  {
    finaleMachine: byId.get('last-take-boss')?.finaleMachine,
    doomOnReach: counterRules.doom?.onReach
  },
  'finale-write-analysis',
  (value) => {
    if (value?.type === 'set-flag') finaleWrittenFlags.add(value.flag);
    if (value?.type === 'select-final-track') {
      for (const flag of Object.values(trackFlags)) finaleWrittenFlags.add(flag);
      finaleWrittenFlags.add('hybrid-support-used');
    }
    if (['increment-counter', 'raise-counter-to-at-least'].includes(value?.type)) {
      finaleWrittenCounters.add(value.counter);
    }
  }
);

function materializeFinaleTemplates(entryState, templates) {
  return templates.map((template) => {
    const state = cloneState(entryState);
    for (const [flag, value] of Object.entries(template.flags)) state.flags[flag] = value;
    for (const [counter, value] of Object.entries(template.counters)) {
      state.counters[counter] = value;
    }
    validateState(state, 'last-take-boss.cached-result');
    return {state, choices: []};
  });
}

function finaleBehaviorSignature(state) {
  const primary = Object.entries(trackFlags).find(([, flag]) => state.flags[flag])?.[0] ?? 'none';
  const liveReady = state.flags['kreed-live-consent'] && state.flags['igor-live-consent'];
  const flags = [
    ['physical', state.flags['physical-final-forced']],
    ['interface', state.flags['interface-operational']],
    ['damaged', state.flags['damaged-interface']],
    ['privacy', state.flags['privacy-lock-active']],
    ['graywise', state.flags['graywise-privacy-ally']],
    ['director', state.flags['director-route-ready'] && state.flags['couple-technical-consent']],
    ['live', liveReady],
    ['oriented', state.flags['igor-oriented']],
    ['intro', state.flags['bedroom-introduction-complete']],
    ['sequence', state.flags['bedroom-sequence-resolved']],
    ['rescued', state.flags['kreed-rescued']],
    ['revealed', state.flags['igor-revealed']],
    ['phase1Price', state.flags['phase-one-price-paid']],
    ['phase2Price', state.flags['phase-two-price-paid']],
    ['phase3Price', state.flags['phase-three-price-paid']],
    ['hybrid', state.flags['hybrid-support-used']],
    ['core', state.flags['core-directive-answered']],
    ['role', state.flags['role-lock-active']],
    ['emergencyRequired', state.flags['emergency-last-action-required']],
    ['emergencyResolved', state.flags['emergency-last-action-resolved']]
  ]
    .filter(([, value]) => value)
    .map(([name]) => name)
    .join(',');
  return [
    state.chainIndex,
    `doom:${state.counters.doom}`,
    `anchors:${state.counters['final-anchors-stabilized']}`,
    `directives:${state.counters['final-directives-broken']}`,
    `discharge:${state.counters['final-discharge-progress']}`,
    `primary:${primary}`,
    flags
  ].join('|');
}

function finaleOutputSignature(state) {
  const flags = [...finaleWrittenFlags]
    .sort()
    .map((flag) => `${flag}:${Number(state.flags[flag])}`)
    .join(',');
  const counters = [...finaleWrittenCounters]
    .sort()
    .map((counter) => `${counter}:${state.counters[counter]}`)
    .join(',');
  return `flags:${flags}|counters:${counters}`;
}

function finaleInternalSignature(state) {
  return [
    finaleOutputSignature(state),
    `phase1:${Number(state.flags['phase-one-price-paid'])}`,
    `phase2:${Number(state.flags['phase-two-price-paid'])}`,
    `phase3:${Number(state.flags['phase-three-price-paid'])}`,
    `hybrid:${Number(state.flags['hybrid-support-used'])}`,
    `core:${Number(state.flags['core-directive-answered'])}`
  ].join('|');
}

function runFinaleMachine(node, entryState) {
  const machine = node.finaleMachine;
  if (!machine) return [{state: entryState, choices: []}];
  const cacheKey = finaleBehaviorSignature(entryState);
  const cached = finaleCache.get(cacheKey);
  if (cached) return materializeFinaleTemplates(entryState, cached);
  const outputs = [];
  const stack = [{phaseIndex: 0, entered: false, state: entryState, choices: [], depth: 0}];
  const seen = new Set();
  while (stack.length > 0) {
    const current = stack.pop();
    if (current.depth > 36) {
      addError(`Finale machine exceeded its progress bound at phase ${current.phaseIndex}`);
      continue;
    }
    if (current.phaseIndex >= machine.phases.length) {
      outputs.push({state: current.state, choices: current.choices});
      continue;
    }
    const phase = machine.phases[current.phaseIndex];
    const state = current.entered
      ? current.state
      : applyEffects(current.state, phase.onEnterEffects, `${node.id}.${phase.id}.enter`);
    const visitKey = `${current.phaseIndex}|${finaleInternalSignature(state)}`;
    if (seen.has(visitKey)) continue;
    seen.add(visitKey);
    if (evaluate(phase.exitCondition, state)) {
      stack.push({
        phaseIndex: current.phaseIndex + 1,
        entered: false,
        state,
        choices: current.choices,
        depth: current.depth + 1
      });
      continue;
    }
    const emergency = machine.emergencyOutcome;
    if (emergency && evaluate(emergency.condition, state)) {
      // The nested decision documents the separate manual graph node. It is not automatic.
      outputs.push({
        state: applyEffects(state, emergency.effects, `${node.id}.emergency.${emergency.id}`),
        choices: [...current.choices, `emergency:${emergency.id}:pending`]
      });
    }
    let switchVariants = [{state, choices: current.choices}];
    if (phase.id === machine.trackSwitching?.allowedPhase) {
      const switches = selectChoices(machine.trackSwitching.options, state).map((option) => ({
        state: applyEffects(state, option.effects, `${node.id}.${phase.id}.switch.${option.id}`),
        choices: [...current.choices, `switch:${option.id}`]
      }));
      switchVariants = uniqueStateVariants([...switchVariants, ...switches]);
    }
    for (const switched of switchVariants) {
      const attempts = selectChoices(phase.attemptOutcomes, switched.state);
      if (attempts.length === 0) {
        addError(`No valid attempt in finale phase ${phase.id} for ${stateSignature(switched.state)}`);
        continue;
      }
      for (const attempt of attempts) {
        const next = applyEffects(switched.state, attempt.effects, `${node.id}.${phase.id}.${attempt.id}`);
        if (
          finaleInternalSignature(next) === finaleInternalSignature(switched.state)
        ) {
          addError(`Finale attempt ${phase.id}.${attempt.id} does not change executable state`);
          continue;
        }
        stack.push({
          phaseIndex: current.phaseIndex,
          entered: true,
          state: next,
          choices: [...switched.choices, `phase:${phase.id}:${attempt.id}`],
          depth: current.depth + 1
        });
      }
    }
  }
  const unique = new Map();
  for (const output of outputs) {
    const key = finaleOutputSignature(output.state);
    if (!unique.has(key)) unique.set(key, output);
  }
  const result = [...unique.values()];
  const templates = result.map((output) => ({
    flags: Object.fromEntries(
      [...finaleWrittenFlags].map((flag) => [flag, Boolean(output.state.flags[flag])])
    ),
    counters: Object.fromEntries(
      [...finaleWrittenCounters].map((counter) => [counter, output.state.counters[counter]])
    )
  }));
  finaleCache.set(cacheKey, templates);
  return materializeFinaleTemplates(entryState, templates);
}

function validateCondition(condition, context) {
  if (!condition) return;
  const keys = Object.keys(condition);
  if (condition.otherwise === true) {
    if (keys.length !== 1) addError(`otherwise must stand alone at ${context}`);
    return;
  }
  if (Array.isArray(condition.all)) {
    if (condition.all.length === 0) addError(`Empty all-condition at ${context}`);
    condition.all.forEach((item, index) => validateCondition(item, `${context}.all[${index}]`));
    return;
  }
  if (Array.isArray(condition.any)) {
    if (condition.any.length === 0) addError(`Empty any-condition at ${context}`);
    condition.any.forEach((item, index) => validateCondition(item, `${context}.any[${index}]`));
    return;
  }
  if (condition.not) {
    validateCondition(condition.not, `${context}.not`);
    return;
  }
  if (condition.flag) {
    if (!declaredFlags.has(condition.flag)) addError(`Unknown flag ${condition.flag} at ${context}`);
    if (typeof condition.equals !== 'boolean') addError(`Flag comparison lacks boolean equals at ${context}`);
    return;
  }
  if (condition.counter) {
    if (!declaredCounters.has(condition.counter)) addError(`Unknown counter ${condition.counter} at ${context}`);
    const comparisons = ['eq', 'gt', 'gte', 'lt', 'lte'].filter((key) => condition[key] !== undefined);
    if (comparisons.length !== 1) addError(`Counter condition needs one comparison at ${context}`);
    return;
  }
  addError(`Unknown condition shape at ${context}: ${JSON.stringify(condition)}`);
}

function walk(value, context, visitor) {
  visitor(value, context);
  if (Array.isArray(value)) value.forEach((child, index) => walk(child, `${context}[${index}]`, visitor));
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) walk(child, `${context}.${key}`, visitor);
  }
}

function assertObservedContract(contract, context, actorPrefix = 'game-master-after') {
  if (!contract) {
    addError(`Missing manual-observation contract at ${context}`);
    return;
  }
  if (contract.resolution !== 'manual-observation') addError(`${context} is not manual-observation`);
  if (!String(contract.selectionActor ?? '').startsWith(actorPrefix)) {
    addError(`${context} has wrong selectionActor ${contract.selectionActor ?? 'missing'}`);
  }
  if (contract.automaticAdvance !== false) addError(`${context} permits automatic advance`);
  if (contract.requiresObservedOutcome !== true) addError(`${context} lacks observed-outcome gate`);
}

function assertPlayerChoiceContract(contract, context) {
  if (!contract) {
    addError(`Missing player-choice contract at ${context}`);
    return;
  }
  if (contract.selection !== 'exactly-one') addError(`${context} is not exactly-one`);
  const actor = String(contract.selectionActor ?? '');
  if (actor !== 'players' && !actor.startsWith('player-controlling-')) {
    addError(`${context} is not selected by players or the named player-controller`);
  }
  if (contract.automaticAdvance !== false) addError(`${context} permits automatic advance`);
  if (contract.requiresExplicitChoice !== true) addError(`${context} lacks explicit-choice gate`);
  if (contract.automaticDefaultForbidden !== true) {
    addError(`${context} permits an automatic default option`);
  }
  if (contract.firstOptionFallbackForbidden !== true) {
    addError(`${context} permits first-option fallback`);
  }
  if (contract.proxySelectionForbidden !== true) {
    addError(`${context} permits proxy selection`);
  }
  if ((contract.options ?? []).some((option) => option.condition?.otherwise === true)) {
    addError(`${context} contains an automatic otherwise option`);
  }
}

function assertTransitionChoiceContract(contract, context) {
  if (!contract) {
    addError(`Missing transition-choice contract at ${context}`);
    return;
  }
  if (contract.selection !== 'exactly-one-eligible-transition') {
    addError(`${context} does not select exactly one eligible transition`);
  }
  if (contract.selectionActor !== 'players') addError(`${context} is not selected by players`);
  if (contract.automaticAdvance !== false) addError(`${context} permits automatic advance`);
  if (contract.requiresExplicitChoice !== true) addError(`${context} lacks explicit-choice gate`);
  if (contract?.defaultTransitionForbidden !== true) {
    addError(`${context} permits a default transition`);
  }
  if (contract.firstTransitionFallbackForbidden !== true) {
    addError(`${context} permits first-transition fallback`);
  }
  if (contract.proxySelectionForbidden !== true) {
    addError(`${context} permits proxy transition selection`);
  }
  if (contract.otherwiseAutomaticOnlyWhenNoEligibleNonOtherwise !== true) {
    addError(`${context} does not restrict otherwise to a true fallback`);
  }
}

function assertOutcomeAgencyContract(contract, context) {
  if (
    contract.selectionActor === 'players' ||
    String(contract.selectionActor ?? '').startsWith('player-controlling-')
  ) {
    assertPlayerChoiceContract(contract, context);
    return;
  }
  if (contract.resolution === 'manual-observation') {
    if (!String(contract.selectionActor ?? '').trim()) {
      addError(`${context} lacks the observer who owns its manual outcome`);
    }
    if (contract.automaticAdvance !== false) addError(`${context} permits automatic advance`);
    if (contract.requiresObservedOutcome !== true) {
      addError(`${context} lacks observed-outcome gate`);
    }
    return;
  }
  if (contract.resolution === 'state-determined') {
    if (contract.automaticAdvance !== true) {
      addError(`${context} is state-determined but not automatically derived from state`);
    }
    if (contract.selectionActor) {
      addError(`${context} is state-determined but also assigns a selection actor`);
    }
    return;
  }
  addError(`${context} has no explicit player, observed, or state-determined owner`);
}

function sumRoute(nodeIds, context) {
  let total = 0;
  const countedCanonicalNodes = new Set();
  for (const id of nodeIds) {
    const node = byId.get(id);
    if (!node) {
      addError(`${context} references missing node ${id}`);
      continue;
    }
    const canonicalId = node.aliasOf ?? node.id;
    if (countedCanonicalNodes.has(canonicalId)) continue;
    countedCanonicalNodes.add(canonicalId);
    total += node.expectedMinutes;
  }
  return total;
}

function enumerateStructuralRoutes() {
  let count = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  function visit(nodeId, elapsed, path, canonicalPath) {
    const node = byId.get(nodeId);
    if (!node) return;
    if (path.includes(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      const cycleIds = [...path.slice(cycleStart), nodeId];
      const cycleNodes = cycleIds.slice(0, -1).map((id) => byId.get(id));
      if (!cycleNodes.every((cycleNode) => cycleNode?.allowCycle === true)) {
        addError(`Unapproved structural cycle: ${cycleIds.join(' -> ')}`);
      }
      return;
    }
    const canonicalId = node.aliasOf ?? node.id;
    const duration = elapsed + (canonicalPath.has(canonicalId) ? 0 : node.expectedMinutes);
    if (node.ending) {
      count += 1;
      min = Math.min(min, duration);
      max = Math.max(max, duration);
      return;
    }
    const nextPath = [...path, nodeId];
    const nextCanonicalPath = new Set(canonicalPath);
    nextCanonicalPath.add(canonicalId);
    for (const transition of node.transitions) {
      visit(transition.to, duration, nextPath, nextCanonicalPath);
    }
  }
  for (const start of nodes.filter((node) => node.start)) {
    visit(start.id, 0, [], new Set());
  }
  return {count, min, max};
}

let structuralRoutes = {count: 0, min: Number.NaN, max: Number.NaN};

function staticValidation() {
  if (nodes.length !== 51) addError(`Expected current 51-node graph, got ${nodes.length}`);
  if (byId.size !== nodes.length) addError('Node ids are not unique');
  const starts = nodes.filter((node) => node.start);
  const endings = nodes.filter((node) => node.ending);
  if (starts.length !== 1) addError(`Expected exactly one start, got ${starts.length}`);
  if (endings.length !== 4) addError(`Expected exactly four endings, got ${endings.length}`);
  for (const id of endingIds) if (!byId.get(id)?.ending) addError(`Required ending ${id} is missing`);
  for (const id of [...mandatoryChain, 'last-take-emergency-action']) {
    if (!byId.has(id)) addError(`Required current node ${id} is missing`);
  }
  for (const flag of ['wedding-reminder-refused', 'bedroom-sequence-resolved']) {
    if (!declaredFlags.has(flag)) addError(`Required current flag ${flag} is missing`);
  }
  for (const node of nodes) {
    if (!Array.isArray(node.transitions)) addError(`Node ${node.id} has no transitions array`);
    if (node.ending && node.transitions.length > 0) addError(`Ending ${node.id} has outgoing transitions`);
    if (node.transitionSelectionContract) {
      assertTransitionChoiceContract(
        node.transitionSelectionContract,
        `${node.id}.transitionSelectionContract`
      );
    }
    if (node.decisionContract) {
      assertOutcomeAgencyContract(node.decisionContract, `${node.id}.decisionContract`);
    }
    for (const [transitionIndex, transition] of node.transitions.entries()) {
      const context = `${node.id}.transitions[${transitionIndex}]`;
      if (!byId.has(transition.to)) addError(`Unknown target ${transition.to} at ${context}`);
      validateCondition(transition.condition, `${context}.condition`);
      if (transition.transitionOutcomes && transition.transitionOutcomeGroups) addError(`Mixed outcomes at ${context}`);
      const contracts = transition.transitionOutcomes
        ? [transition.transitionOutcomes]
        : transition.transitionOutcomeGroups ?? [];
      const groupIds = contracts.map((contract) => contract.id);
      if (new Set(groupIds).size !== groupIds.length) addError(`Duplicate outcome group id at ${context}`);
      for (const contract of contracts) {
        if (contract.selection !== 'exactly-one') addError(`${context}.${contract.id} is not exactly-one`);
        validateCondition(contract.appliesWhen, `${context}.${contract.id}.appliesWhen`);
        assertOutcomeAgencyContract(contract, `${context}.${contract.id ?? 'outcome'}`);
        if (!Array.isArray(contract.options) || contract.options.length === 0) {
          addError(`${context}.${contract.id} has no options`);
          continue;
        }
        const optionIds = contract.options.map((option) => option.id);
        if (new Set(optionIds).size !== optionIds.length) addError(`Duplicate option id at ${context}.${contract.id}`);
        contract.options.forEach((option) =>
          validateCondition(option.condition, `${context}.${contract.id}.${option.id}.condition`)
        );
      }
    }
    validateCondition(node.entryCondition, `${node.id}.entryCondition`);
  }
  const alexisAlias = byId.get('alexis-room-after-pussy');
  if (alexisAlias?.aliasOf !== 'alexis-room') {
    addError('alexis-room-after-pussy must alias alexis-room for duration accounting');
  }
  if (alexisAlias?.expectedMinutes !== byId.get('alexis-room')?.expectedMinutes) {
    addError('Alexis room alias duration differs from its canonical room');
  }
  const allowedCycleNodes = new Set([
    'pussy-prop-room',
    'pussy-scepter-return',
    'alexis-room-after-pussy'
  ]);
  for (const node of nodes.filter((candidate) => candidate.allowCycle === true)) {
    if (!allowedCycleNodes.has(node.id)) addError(`Unexpected cycle-enabled node ${node.id}`);
  }
  for (const id of allowedCycleNodes) {
    if (byId.get(id)?.allowCycle !== true) addError(`State-guarded hub cycle is not declared on ${id}`);
  }
  const hasEdge = (from, to) =>
    byId.get(from)?.transitions?.some((transition) => transition.to === to) === true;
  for (const [from, to] of [
    ['hotel-gallery', 'alexis-room'],
    ['alexis-room', 'pussy-audience'],
    ['hotel-gallery', 'pussy-audience'],
    ['pussy-audience', 'alexis-room-after-pussy'],
    ['alexis-room-after-pussy', 'pussy-prop-room'],
    ['pussy-prop-room', 'pussy-scepter-return'],
    ['pussy-scepter-return', 'alexis-room-after-pussy'],
    ['pussy-scepter-return', 'closed-bar']
  ]) {
    if (!hasEdge(from, to)) addError(`Hotel hub order lost required edge ${from} -> ${to}`);
  }
  if (byId.get('alexis-room')?.intervention?.uiLocalExitWithoutGraphAdvance !== true) {
    addError('Alexis room lacks a non-committing UI-local return to the gallery');
  }
  if (byId.get('pussy-prop-room')?.sceneContract?.uiLocalExitWithoutGraphAdvance !== true) {
    addError('Pussy Sultan prop room lacks a non-committing UI-local return to the gallery');
  }
  const relationshipContract = graph.relationshipOutcomeContract ?? {};
  if (
    relationshipContract.selectionNodeId !== 'couples-session-choice' ||
    relationshipContract.noItemSelectionNodeId !== 'couples-session-plan' ||
    relationshipContract.noItemSelectionEdgeTargetId !== 'groom-tunnel' ||
    relationshipContract.fullWithoutItemAllowed !== true
  ) {
    addError('Relationship metadata does not expose both item and no-item full-completion paths');
  }
  const relationshipCoda = graph.epilogueContract?.relationshipCoda ?? {};
  const relationshipCodaWhen = relationshipCoda.when?.all ?? [];
  const relationshipCodaRequiresFull = relationshipCodaWhen.some(
    (condition) =>
      condition.flag === 'olva-relationship-review-complete' && condition.equals === true
  );
  const relationshipCodaRequiresItem = relationshipCodaWhen.some(
    (condition) => condition.flag === 'womanizer-obtained' && condition.equals === true
  );
  const withoutItemWhen = relationshipCoda.withoutItemWhen?.all ?? [];
  const withoutItemRequiresFull = withoutItemWhen.some(
    (condition) =>
      condition.flag === 'olva-relationship-review-complete' && condition.equals === true
  );
  const withoutItemRequiresAbsence = withoutItemWhen.some(
    (condition) => condition.flag === 'womanizer-obtained' && condition.equals === false
  );
  if (
    !relationshipCodaRequiresFull ||
    !relationshipCodaRequiresItem ||
    !withoutItemRequiresFull ||
    !withoutItemRequiresAbsence ||
    relationshipCoda.withoutItemSelection !== 'none'
  ) {
    addError('Epilogue relationship coda does not distinguish full item and full no-item paths');
  }
  const expectedThreatBindings = new Map([
    ['hotel-weather-circuit', 'hotel-overload'],
    ['palanquin-winding-mechanism', 'pussy-prop-room'],
    ['bar-loop-stage', 'closed-bar'],
    ['dressing-room-mirror-doubles', 'artists-dressing-room'],
    ['guest-wing-flood-scenery', 'egorik-bungalow-reveal'],
    ['universal-advice-algorithm', 'show-18-pavilion'],
    ['confidentiality-corp-de-ballet', 'groom-tunnel'],
    ['privacy-contour', 'groom-preparation-room'],
    ['last-take-module', 'last-take-boss']
  ]);
  const actualThreatBindings = new Map(
    (graph.threatBindings ?? []).map((binding) => [binding.threatId, binding.sceneId])
  );
  if (actualThreatBindings.size !== expectedThreatBindings.size) {
    addError(
      `Threat binding count differs: expected ${expectedThreatBindings.size}, got ${actualThreatBindings.size}`
    );
  }
  for (const [threatId, sceneId] of expectedThreatBindings) {
    if (actualThreatBindings.get(threatId) !== sceneId) {
      addError(`Threat ${threatId} must bind to ${sceneId}`);
    }
    if (!byId.has(sceneId)) addError(`Threat ${threatId} binds to missing scene ${sceneId}`);
  }
  const giftContract = graph.giftCodaContract ?? {};
  if (
    giftContract.kind !== 'embedded-non-node-window' ||
    giftContract.anchor?.afterNodeId !== 'igor-consent-decisions' ||
    giftContract.anchor?.beforeNodeId !== 'final-choice' ||
    giftContract.maximumMinutesFromImprovisationReserve !== 3 ||
    giftContract.doesNotAddRouteMinutes !== true
  ) {
    addError('Gift coda lacks the approved non-node anchor and reserve accounting');
  }
  const expectedGiftOffers = new Map([
    [
      'igor-thorin-bag-upgrade',
      {
        itemId: 'seven-job-bag',
        resolutionFlag: 'thorin-gift-offer-resolved',
        acceptanceFlag: 'thorin-seven-job-bag-upgraded'
      }
    ],
    [
      'graywise-bubsilda-brooch',
      {
        itemId: 'steady-horizon-brooch',
        resolutionFlag: 'bubsilda-gift-offer-resolved',
        acceptanceFlag: 'bubsilda-steady-horizon-brooch-accepted'
      }
    ]
  ]);
  const giftOffers = new Map(
    (giftContract.independentOffers ?? []).map((offer) => [offer.id, offer])
  );
  for (const [offerId, expected] of expectedGiftOffers) {
    const actual = giftOffers.get(offerId);
    if (
      actual?.itemId !== expected.itemId ||
      actual?.resolutionFlag !== expected.resolutionFlag ||
      actual?.acceptanceFlag !== expected.acceptanceFlag
    ) {
      addError(`Gift offer ${offerId} is missing or has inconsistent item/state ids`);
    }
    for (const flag of [expected.resolutionFlag, expected.acceptanceFlag]) {
      if (!declaredFlags.has(flag)) addError(`Gift state ${flag} is not declared`);
    }
  }
  const activeGraph = {...graph};
  delete activeGraph.legacyNodeMigrations;
  const activeGraphText = JSON.stringify(activeGraph).toLowerCase();
  for (const removedToken of ['prokhor', 'прохор', 'satyr', 'сатир']) {
    if (activeGraphText.includes(removedToken)) {
      addError(`Removed actor token is still active outside legacy migrations: ${removedToken}`);
    }
  }
  const rewardTransitions = byId.get('pussy-scepter-return')?.transitions ?? [];
  if (rewardTransitions.length !== 3) {
    addError(`Pussy Sultan reward scene must expose exactly three route exits, got ${rewardTransitions.length}`);
  }
  for (const [index, transition] of rewardTransitions.entries()) {
    const contract = transition.transitionOutcomes;
    const accept = contract?.options?.find((option) => option.id === 'accept-womanizer');
    const decline = contract?.options?.find((option) => option.id === 'decline-womanizer');
    const optionIds = new Set(contract?.options?.map((option) => option.id) ?? []);
    const writesTrue = (option, flag) =>
      option?.effects?.some(
        (effect) => effect.type === 'set-flag' && effect.flag === flag && effect.value === true
      ) === true;
    if (
      contract?.id !== 'pussy-womanizer-reward' ||
      optionIds.size !== 2 ||
      !optionIds.has('accept-womanizer') ||
      !optionIds.has('decline-womanizer') ||
      !writesTrue(accept, 'pussy-reward-received') ||
      !writesTrue(accept, 'womanizer-obtained') ||
      (decline?.effects?.length ?? 0) !== 0
    ) {
      addError(`Pussy Sultan reward exit ${index} does not preserve explicit accept/decline semantics`);
    }
  }
  const aliasToProp = alexisAlias?.transitions?.find(
    (transition) => transition.to === 'pussy-prop-room'
  );
  const aliasGuardText = JSON.stringify(aliasToProp?.condition ?? {});
  const aliasResolutionOptions = aliasToProp?.transitionOutcomes?.options ?? [];
  const aliasStyleOptions = aliasResolutionOptions.filter((option) =>
    ['alexis-style-complete', 'alexis-style-fail-forward'].includes(option.id)
  );
  const everyPlayedAliasOutcomeResolves =
    aliasStyleOptions.length === 2 &&
    aliasStyleOptions.every((option) =>
      option.effects?.some(
        (effect) =>
          effect.type === 'set-flag' &&
          effect.flag === 'alexis-room-resolved' &&
          effect.value === true
      )
    );
  const aliasEarlyExit = aliasResolutionOptions.find(
    (option) => option.id === 'leave-alexis-unresolved'
  );
  if (
    JSON.stringify(alexisAlias?.entryCondition) !==
      JSON.stringify({flag: 'alexis-room-resolved', equals: false}) ||
    !aliasGuardText.includes('pussy-quest-accepted') ||
    !aliasGuardText.includes('scepter-recovered') ||
    !everyPlayedAliasOutcomeResolves ||
    (aliasEarlyExit?.effects?.length ?? -1) !== 0
  ) {
    addError('Alexis/prop-room cycle is not guarded by a monotonic one-shot resolution');
  }

  const alexisResolutionContracts = ['alexis-room', 'alexis-room-after-pussy'].flatMap(
    (nodeId) =>
      (byId.get(nodeId)?.transitions ?? [])
        .map((transition) => transition.transitionOutcomes)
        .filter((contract) => contract?.id === 'alexis-style-resolution')
  );
  if (alexisResolutionContracts.length !== 4) {
    addError(`Expected four Alexis route-resolution contracts, got ${alexisResolutionContracts.length}`);
  }
  for (const [index, contract] of alexisResolutionContracts.entries()) {
    const options = new Map((contract.options ?? []).map((option) => [option.id, option]));
    const ids = [...options.keys()].sort().join(',');
    const expectedIds = [
      'alexis-style-complete',
      'alexis-style-fail-forward',
      'leave-alexis-unresolved'
    ].sort().join(',');
    const leave = options.get('leave-alexis-unresolved');
    const playedOutcomesResolve = ['alexis-style-complete', 'alexis-style-fail-forward'].every(
      (id) =>
        options.get(id)?.effects?.some(
          (effect) =>
            effect.type === 'set-flag' &&
            effect.flag === 'alexis-room-resolved' &&
            effect.value === true
        ) === true
    );
    if (
      ids !== expectedIds ||
      !playedOutcomesResolve ||
      (leave?.effects?.length ?? -1) !== 0 ||
      contract.selectionActor !== 'game-master-after-observed-alexis-room-attempt-or-early-exit'
    ) {
      addError(`Alexis route-resolution contract ${index} does not preserve play-or-leave semantics`);
    }
  }

  const pussyAudienceContract = byId.get('pussy-audience')?.sceneContract ?? {};
  if (
    typeof pussyAudienceContract.visibleRewardHookBeforeQuestChoice !== 'string' ||
    pussyAudienceContract.visibleRewardHookBeforeQuestChoice.trim().length === 0 ||
    pussyAudienceContract.rewardContentsHiddenUntilPhysicalReturn !== true
  ) {
    addError('Pussy Sultan audience lacks a visible non-spoiler reward hook before quest acceptance');
  }

  const dressingRoom = byId.get('artists-dressing-room');
  const evidenceGroup = dressingRoom?.transitions?.[0]?.transitionOutcomeGroups?.find(
    (group) => group.id === 'evidence'
  );
  const evidenceOptions = new Map(
    (evidenceGroup?.options ?? []).map((option) => [option.id, option])
  );
  const oneEvidenceMappings = new Map([
    ['one-clue-fail-forward', 'kreed-proof-courier'],
    ['voice-only-fail-forward', 'kreed-proof-voice'],
    ['route-only-fail-forward', 'kreed-proof-route']
  ]);
  for (const [outcomeId, proofFlag] of oneEvidenceMappings) {
    const option = evidenceOptions.get(outcomeId);
    const setsExpectedProof =
      option?.effects?.some(
        (effect) =>
          effect.type === 'set-flag' && effect.flag === proofFlag && effect.value === true
      ) === true;
    const incrementsOne =
      option?.effects?.some(
        (effect) =>
          effect.type === 'increment-counter' &&
          effect.counter === 'kreed-evidence-count' &&
          effect.value === 1
      ) === true;
    const activatesFalseCue =
      option?.effects?.some(
        (effect) =>
          effect.type === 'set-flag' && effect.flag === 'false-cue-active' && effect.value === true
      ) === true;
    const setsWrongProof = option?.effects?.some(
      (effect) =>
        effect.type === 'set-flag' &&
        effect.flag.startsWith('kreed-proof-') &&
        effect.flag !== proofFlag &&
        effect.value === true
    );
    if (!setsExpectedProof || !incrementsOne || !activatesFalseCue || setsWrongProof) {
      addError(`Single-evidence outcome ${outcomeId} does not match its observed evidence system`);
    }
  }
  if (
    dressingRoom?.sceneContract?.oneEvidenceOutcomeMustMatchObservedSystem !== true ||
    !String(dressingRoom?.sceneContract?.stageServiceKeyInterlock ?? '').includes('OFF')
  ) {
    addError('Dressing-room key/evidence exploit contract is incomplete');
  }

  const closedBarContract = byId.get('closed-bar')?.sceneContract ?? {};
  if (
    closedBarContract.thresholdLoopsUntilResolved !== true ||
    closedBarContract.livingTroupeAlwaysReleasedOnNormalExit !== true ||
    !String(closedBarContract.bypassRule ?? '').includes('без урона')
  ) {
    addError('Closed bar can still be bypassed or exited with the living troupe trapped');
  }

  const groomTunnelContract = byId.get('groom-tunnel')?.sceneContract ?? {};
  if (
    groomTunnelContract.closedWingGateVisible !== true ||
    groomTunnelContract.exactRoomUnavailableBeforeKreedEscort !== true ||
    !String(groomTunnelContract.closedWingGateRule ?? '').includes('До kreed-rescued') ||
    !String(groomTunnelContract.closedWingGateRule ?? '').includes('после kreed-disclosure')
  ) {
    addError('Closed-wing route can reveal or bypass the bride room before Kreed');
  }

  const possessionContract = relationshipContract.womanizerPossessionContract ?? {};
  if (
    possessionContract.currentPossessionFlag !== 'womanizer-obtained' ||
    possessionContract.historicalRewardFlag !== 'pussy-reward-received' ||
    possessionContract.explicitDispositionMaySetCurrentPossessionFalse !== true ||
    possessionContract.discardDoesNotEraseHistoricalReward !== true ||
    possessionContract.automaticReturnForbidden !== true ||
    possessionContract.normalizationDeadline !==
      'before player-facing presentation of bungalow-courtyard'
  ) {
    addError('Womanizer history/current-possession contract is incomplete');
  }

  const npcResponseProfiles = relationshipContract.npcResponseProfiles ?? {};
  for (const [profileId, fields] of [
    ['stas', ['fullAnswerWhen', 'readyWhen', 'notReadyWhen']],
    ['polina', ['fullAnswerWhen', 'readyWhen', 'notReadyWhen']],
    ['nearTermPlan', ['acceptedWhen', 'partialWhen']],
    ['womanizerDecision', ['keptWhen', 'show18When', 'returnedWhen']]
  ]) {
    if (fields.some((field) => !String(npcResponseProfiles[profileId]?.[field] ?? '').trim())) {
      addError(`Relationship response profile ${profileId} is incomplete`);
    }
  }
  const consentResponseProfiles = graph.consentContract?.responseProfiles ?? {};
  for (const field of [
    'kreedLiveYesWhen',
    'igorLiveYesWhen',
    'kreedTechnicalYesWhen',
    'igorTechnicalYesWhen',
    'kreedPublicationYesWhen',
    'igorPublicationYesWhen',
    'safeDefault'
  ]) {
    if (!String(consentResponseProfiles[field] ?? '').trim()) {
      addError(`Consent response profile ${field} is missing`);
    }
  }
  for (const removedNodeId of [
    'pussy-regalia-hook',
    'pussy-regalia-resolution',
    'prokhor-shift-hook',
    'prokhor-shift-resolution'
  ]) {
    if (byId.has(removedNodeId)) addError(`Removed story node is still active: ${removedNodeId}`);
  }
  const rescueGroups =
    byId.get('groom-preparation-room')?.transitions[0]?.transitionOutcomeGroups ?? [];
  const rescueResult = rescueGroups.find((group) => group.id === 'kreed-rescue-result');
  const rescuePrice = rescueGroups.find((group) => group.id === 'kreed-rescue-price');
  const cleanRescue = rescueResult?.options?.find((option) => option.id === 'clean-rescue');
  const complicatedRescue = rescueResult?.options?.find(
    (option) => option.id === 'rescue-complication'
  );
  const writesRescueRequirement = (option, value) =>
    option?.effects?.some(
      (effect) =>
        effect.type === 'set-flag' &&
        effect.flag === 'rescue-price-required' &&
        effect.value === value
    );
  if (!writesRescueRequirement(cleanRescue, false)) {
    addError('Clean Creed rescue does not skip the conditional rescue price');
  }
  if (!writesRescueRequirement(complicatedRescue, true)) {
    addError('Complicated Creed rescue does not require a declared player price');
  }
  if (
    rescuePrice?.appliesWhen?.flag !== 'rescue-price-required' ||
    rescuePrice.appliesWhen.equals !== true
  ) {
    addError('Creed rescue price is not conditional on rescue-price-required=true');
  }
  const declaredClueIds = new Set(nodes.flatMap((node) => node.clueIds ?? []));
  walk(graph, 'graph', (value, context) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    if (Object.hasOwn(value, 'condition')) validateCondition(value.condition, `${context}.condition`);
    if (Object.hasOwn(value, 'exitCondition')) validateCondition(value.exitCondition, `${context}.exitCondition`);
    if (Object.hasOwn(value, 'eligibleWhen')) validateCondition(value.eligibleWhen, `${context}.eligibleWhen`);
    if (Object.hasOwn(value, 'fallbackWhen')) validateCondition(value.fallbackWhen, `${context}.fallbackWhen`);
    if (Object.hasOwn(value, 'appliesWhen')) validateCondition(value.appliesWhen, `${context}.appliesWhen`);
    if (Object.hasOwn(value, 'postcondition')) validateCondition(value.postcondition, `${context}.postcondition`);
    const isEffectPayload = /\.(?:effects|onEnterEffects)\[\d+\]$/.test(context);
    if (isEffectPayload && !supportedEffects.has(value.type)) {
      addError(`Unknown effect payload ${value.type ?? 'missing-type'} at ${context}`);
      return;
    }
    if (!supportedEffects.has(value.type)) return;
    if (value.type === 'set-flag' && !declaredFlags.has(value.flag)) {
      addError(`Effect writes undeclared flag ${value.flag} at ${context}`);
    }
    if (value.type === 'set-flag' && typeof value.value !== 'boolean') {
      addError(`set-flag needs a boolean value at ${context}`);
    }
    if (['increment-counter', 'raise-counter-to-at-least'].includes(value.type)) {
      if (!declaredCounters.has(value.counter)) addError(`Effect writes undeclared counter ${value.counter} at ${context}`);
      if (!Number.isFinite(value.value) || value.value < 0) addError(`Invalid counter value at ${context}`);
      if (value.type === 'increment-counter' && value.value === 0) addError(`Zero counter increment at ${context}`);
      if (value.cap !== undefined && (!Number.isFinite(value.cap) || value.cap > counterRules[value.counter]?.max)) {
        addError(`Invalid cap for ${value.counter} at ${context}`);
      }
    }
    if (value.type === 'select-final-track' && !Object.hasOwn(trackFlags, value.track)) {
      addError(`Unknown final track ${value.track} at ${context}`);
    }
    if (value.type === 'select-final-track' && typeof value.markHybridOnChange !== 'boolean') {
      addError(`select-final-track lacks markHybridOnChange at ${context}`);
    }
    if (value.type === 'reveal-clue' && !declaredClueIds.has(value.clueId)) {
      addError(`Effect reveals undeclared clue ${value.clueId} at ${context}`);
    }
    if (
      value.type === 'activate-callback-phase' &&
      !byId.get('last-take-boss')?.finaleMachine?.phaseOrder.includes(value.phase)
    ) {
      addError(`Unknown callback phase ${value.phase} at ${context}`);
    }
  });
  for (const [counter, rule] of Object.entries(counterRules)) {
    if (!declaredCounters.has(counter)) addError(`Counter rule for undeclared counter ${counter}`);
    if (!Number.isFinite(rule.min) || !Number.isFinite(rule.max) || rule.min > rule.max) addError(`Invalid range for ${counter}`);
  }
  for (const clue of graph.criticalClues ?? []) {
    const sources = [...new Set(clue.sourceSceneIds ?? [])];
    if (sources.length < 2) addError(`Critical clue ${clue.id} has fewer than two sources`);
    for (const sourceId of sources) {
      const source = byId.get(sourceId);
      if (!source) addError(`Critical clue ${clue.id} has unknown source ${sourceId}`);
      else if (!(source.clueIds ?? []).includes(clue.id)) addError(`Source ${sourceId} does not declare clue ${clue.id}`);
      if (source?.optional) addError(`Critical clue ${clue.id} depends on optional ${sourceId}`);
    }
  }
  for (const node of nodes.filter((candidate) => candidate.optional)) {
    if ((node.clueIds ?? []).length > 0) addError(`Optional node ${node.id} declares a clue`);
    walk(node.transitions, `node.${node.id}.transitions`, (value, context) => {
      if (value?.type === 'reveal-clue') {
        addError(`Optional node ${node.id} executes reveal-clue at ${context}`);
      }
      if (
        ['increment-counter', 'raise-counter-to-at-least'].includes(value?.type) &&
        value.counter === 'doom'
      ) {
        addError(`Optional node ${node.id} changes Doom at ${context}`);
      }
    });
  }
  const revealWriters = [];
  for (const node of nodes) {
    walk(node.transitions, `node.${node.id}.transitions`, (value, context) => {
      if (value?.type === 'set-flag' && value.flag === graph.spoilerContract?.revealFlag && value.value === true) {
        revealWriters.push({nodeId: node.id, context});
      }
    });
  }
  if (revealWriters.length !== 1) addError(`Reveal must have one executable writer, got ${revealWriters.length}`);
  else if (revealWriters[0].nodeId !== graph.spoilerContract?.revealNodeId) {
    addError(`Reveal writer is ${revealWriters[0].nodeId}, not ${graph.spoilerContract?.revealNodeId}`);
  }
  function trueWriters(flag) {
    const writers = [];
    for (const node of nodes) {
      walk(node, `node.${node.id}`, (value, context) => {
        if (value?.type === 'set-flag' && value.flag === flag && value.value === true) {
          writers.push({nodeId: node.id, context});
        }
      });
    }
    return writers;
  }
  const writerAllowlists = new Map([
    ['wedding-reminder-delivered', new Set(['wedding-reminder'])],
    ['wedding-reminder-refused', new Set(['wedding-reminder'])],
    ['bedroom-sequence-resolved', new Set(['wedding-reminder'])],
    ['emergency-last-action-required', new Set(['last-take-boss'])],
    ['emergency-last-action-resolved', new Set(['last-take-emergency-action'])],
    ['emergency-evacuation-forced', new Set(['last-take-emergency-action'])],
    ['womanizer-obtained', new Set(['pussy-scepter-return'])]
  ]);
  for (const [flag, allowedNodes] of writerAllowlists) {
    const writers = trueWriters(flag);
    if (writers.length === 0) addError(`State flag ${flag} has no true writer`);
    for (const writer of writers) {
      if (!allowedNodes.has(writer.nodeId)) {
        addError(`State flag ${flag} has forbidden writer ${writer.nodeId} at ${writer.context}`);
      }
    }
    if (flag === 'womanizer-obtained' && writers.length !== 3) {
      addError(`Womanizer reward must have one writer option on each of three exits, got ${writers.length}`);
    }
  }

  const revealNodeId = graph.spoilerContract?.revealNodeId;
  const preReveal = new Set();
  const spoilerQueue = nodes.filter((node) => node.start).map((node) => node.id);
  while (spoilerQueue.length > 0) {
    const id = spoilerQueue.shift();
    if (preReveal.has(id)) continue;
    preReveal.add(id);
    if (id === revealNodeId) continue;
    for (const transition of byId.get(id)?.transitions ?? []) spoilerQueue.push(transition.to);
  }
  const escapedTokens = (graph.spoilerContract?.forbiddenBeforeReveal ?? []).map((token) =>
    token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const spoilerPattern = escapedTokens.length > 0
    ? new RegExp(`(?:${escapedTokens.join('|')})`, 'iu')
    : null;
  for (const id of preReveal) {
    const node = byId.get(id);
    const playerFacing = [node.title];
    for (const transition of node.transitions) {
      playerFacing.push(transition.label);
      if (transition.transitionOutcomes) {
        playerFacing.push(...transition.transitionOutcomes.options.map((option) => option.label));
      }
      for (const group of transition.transitionOutcomeGroups ?? []) {
        playerFacing.push(...group.options.map((option) => option.label));
      }
    }
    for (const text of playerFacing.filter(Boolean)) {
      if (spoilerPattern?.test(text)) addError(`Pre-reveal spoiler in ${id}: ${text}`);
    }
  }
  const emergencyResolvedWriters = [];
  for (const node of nodes) {
    walk(node.transitions, `node.${node.id}.transitions`, (value, context) => {
      if (value?.type === 'set-flag' && value.flag === 'emergency-last-action-resolved' && value.value === true) {
        emergencyResolvedWriters.push({nodeId: node.id, context});
      }
    });
  }
  if (emergencyResolvedWriters.length !== 1 || emergencyResolvedWriters[0].nodeId !== 'last-take-emergency-action') {
    addError(
      `Emergency resolution needs one writer in last-take-emergency-action, got ${emergencyResolvedWriters.map((writer) => writer.nodeId).join(', ') || 'none'}`
    );
  }
  const callbackAssets = callbackRules.map((rule) => rule.assetFlag);
  const callbackResolved = callbackRules.map((rule) => rule.resolvedFlag);
  const callbackReactions = callbackRules.map((rule) => rule.reactionId);
  if (new Set(callbackAssets).size !== callbackAssets.length) addError('Duplicate callback asset');
  if (new Set(callbackResolved).size !== callbackResolved.length) addError('Duplicate callback resolved flag');
  if (new Set(callbackReactions).size !== callbackReactions.length) addError('Duplicate callback reaction');
  for (const rule of callbackRules) {
    if (!declaredFlags.has(rule.assetFlag)) addError(`Unknown callback asset ${rule.assetFlag}`);
    if (!declaredFlags.has(rule.resolvedFlag)) addError(`Unknown callback result ${rule.resolvedFlag}`);
    if (rule.clearsFlag && !declaredFlags.has(rule.clearsFlag)) addError(`Unknown callback clear ${rule.clearsFlag}`);
  }
  if (graph.callbackLifecycle?.resolveExactlyOnce !== true) addError('Callbacks are not declared exact-once');
  const lifecycle = graph.callbackLifecycle ?? {};
  if (
    lifecycle.selectionOrder !== 'earned-assets-first-then-mandatory-candidates-then-stable-roster-order' ||
    lifecycle.cancelScheduledReaction !== true ||
    lifecycle.backfillAfterCancellation !== false ||
    lifecycle.overflowEarnedAssetBeat !== 'preventive' ||
    lifecycle.unresolvedEarnedAssetFallback !== 'epilogue'
  ) {
    addError('Callback selection/budget lifecycle contract has changed');
  }
  const expectedBudgets = [2, 2, 2, 2, 3, 4];
  for (let doom = 0; doom <= 5; doom += 1) {
    if (lifecycle.reactionBudgetByDoom?.[String(doom)] !== expectedBudgets[doom]) {
      addError(`Callback budget for Doom ${doom} is not ${expectedBudgets[doom]}`);
    }
  }
  const stableRoster = Object.entries(lifecycle.stableRosterOrder ?? {}).flatMap(
    ([phase, reactions]) => reactions.map((reactionId) => ({phase, reactionId}))
  );
  const stableReactionIds = stableRoster.map((entry) => entry.reactionId);
  if (new Set(stableReactionIds).size !== stableReactionIds.length) {
    addError('Stable callback roster repeats a reaction');
  }
  for (const rule of callbackRules) {
    const rosterEntry = stableRoster.find((entry) => entry.reactionId === rule.reactionId);
    if (rule.reactionId === 'privacy-lock') {
      if (rosterEntry) addError('Conditional privacy-lock must not be synthesized in stable roster');
    } else if (!rosterEntry || rosterEntry.phase !== rule.phase) {
      addError(`Callback ${rule.reactionId} is absent from its stable phase roster`);
    }
    if (rule.fallback !== 'epilogue' || !Number.isFinite(rule.priority)) {
      addError(`Callback ${rule.assetFlag} lacks priority or epilogue fallback`);
    }
  }
  for (const candidate of lifecycle.mandatoryReactionCandidates ?? []) {
    if (
      candidate.reactionId !== 'privacy-lock' &&
      !stableReactionIds.includes(candidate.reactionId)
    ) {
      addError(`Mandatory callback reaction ${candidate.reactionId} is absent from stable roster`);
    }
  }

  const manualContract = graph.executionContract?.manualSelectionContract;
  if (
    manualContract?.playerSelection?.automaticDefaultForbidden !== true ||
    manualContract.playerSelection.firstOptionFallbackForbidden !== true ||
    manualContract.playerSelection.proxySelectionForbidden !== true
  ) {
    addError('Global player-selection contract permits an automatic/default/proxy choice');
  }
  if (
    manualContract?.observedOutcome?.automaticAdvanceForbidden !== true ||
    manualContract.observedOutcome.requiresObservedOutcome !== true
  ) {
    addError('Global observed-outcome contract permits automatic advance');
  }
  if (
    manualContract?.manualActionNode?.requiresPlayerDeclaredAction !== true ||
    manualContract.manualActionNode.automaticAdvanceForbidden !== true ||
    manualContract.manualActionNode.npcOrGameMasterSubstitutionForbidden !== true
  ) {
    addError('Global manual-action contract does not protect player authorship');
  }

  const trackSwitching = byId.get('last-take-boss')?.finaleMachine?.trackSwitching;
  if (
    trackSwitching?.selection !== 'zero-or-one-per-decision-window' ||
    trackSwitching.selectionActor !== 'players' ||
    trackSwitching.automaticAdvance !== false ||
    trackSwitching.requiresExplicitChoice !== true ||
    trackSwitching.automaticDefaultForbidden !== true ||
    trackSwitching.firstOptionFallbackForbidden !== true ||
    trackSwitching.proxySelectionForbidden !== true ||
    trackSwitching.retainCurrentTrackOnNoChoice !== true ||
    trackSwitching.allowedPhase !== 'discharge' ||
    trackSwitching.allowedBeforeFirstDischargeStep !== true ||
    trackSwitching.allowedBetweenDischargeSteps !== true ||
    trackSwitching.marksHybridOnlyAfterCompletedDischargeStep !== true ||
    trackSwitching.doomFiveForcesPhysical !== true
  ) {
    addError('Finale track switching does not preserve explicit player authorship');
  }
  const switchWindows = new Set(trackSwitching?.decisionWindows ?? []);
  for (const requiredWindow of [
    'before-first-discharge-step',
    'between-discharge-steps'
  ]) {
    if (!switchWindows.has(requiredWindow)) {
      addError(`Finale track switching lacks ${requiredWindow} decision window`);
    }
  }
  if (switchWindows.size !== 2) addError('Finale track switching declares an unknown decision window');

  assertPlayerChoiceContract(
    byId.get('wedding-reminder')?.transitions[0]?.transitionOutcomes,
    'wedding-reminder.player-decision'
  );
  assertPlayerChoiceContract(
    byId.get('final-choice')?.transitions[0]?.transitionOutcomes,
    'final-choice.primary-plan'
  );

  const orientation = byId.get('igor-orientation')?.orientationContract;
  assertObservedContract(orientation, 'igor-orientation.orientationContract');
  if (
    orientation?.noPersuasionCheck !== true ||
    orientation.noMagicOrProxy !== true ||
    orientation.doubtfulMeansNoConsent !== true
  ) {
    addError('Igor orientation contract permits a check, proxy, or consent from doubt');
  }
  const consentGroups =
    byId.get('igor-consent-decisions')?.transitions[0]?.transitionOutcomeGroups ?? [];
  for (const id of ['live-consent', 'technical-consent']) {
    assertObservedContract(
      consentGroups.find((group) => group.id === id),
      `igor-consent-decisions.${id}`,
      'game-master-after-two-individual-answers'
    );
  }
  for (const node of nodes.filter((candidate) => candidate.id.startsWith('post-crisis-orientation-'))) {
    assertObservedContract(
      node.transitions[0]?.transitionOutcomes,
      `${node.id}.post-crisis-orientation`
    );
  }
  for (const node of nodes.filter((candidate) => candidate.id.startsWith('post-crisis-publication-'))) {
    assertObservedContract(
      node.transitions[0]?.transitionOutcomes,
      `${node.id}.publication-consent`,
      'game-master-after-two-individual-answers'
    );
  }
  assertObservedContract(
    byId.get('couples-session-plan')?.decisionContract,
    'couples-session-plan.decisionContract',
    'game-master-after-stas-and-polina-individual-answers'
  );
  const womanizerContract = byId
    .get('couples-session-choice')
    ?.transitions.find((transition) => transition.exitKind === 'full')?.transitionOutcomes;
  assertObservedContract(
    womanizerContract,
    'couples-session-choice.womanizer-final-status',
    'polina-voiced-by-game-master-after-her-explicit-decision'
  );

  const emergencyNode = byId.get('last-take-emergency-action');
  if (
    emergencyNode?.manualActionContract?.requiredActor !== 'player-selected-hero' ||
    emergencyNode.manualActionContract.automaticAdvance !== false ||
    emergencyNode.manualActionContract.requiresCheck !== false ||
    emergencyNode.manualActionContract.npcOrGmSubstitutionForbidden !== true
  ) {
    addError('last-take-emergency-action is not protected as a manual player action');
  }
  const emergency = byId.get('last-take-boss')?.finaleMachine?.emergencyOutcome;
  if (
    emergency?.trigger?.type !== 'all-player-heroes-at-zero-hp' ||
    emergency.trigger.required !== true ||
    emergency.automaticTrigger !== true ||
    emergency.automaticResolution !== false ||
    emergency.unavailableWithoutTrigger !== true ||
    emergency.lastPhysicalDecision?.resolutionNodeId !== 'last-take-emergency-action' ||
    emergency.lastPhysicalDecision?.effectsAppliedOnlyByNodeTransition !== true
  ) {
    addError('Party-defeat emergency trigger/manual-resolution contract is incomplete');
  }
  const doomFiveContract = byId.get('doom-five-cable-junction')?.transitions[0]?.transitionOutcomes;
  if (
    doomFiveContract?.resolution !== 'state-determined' ||
    doomFiveContract.automaticAdvance !== true
  ) {
    addError('Doom 5 junction is not explicitly state-determined');
  }

  for (const node of nodes) {
    if (/сайд[- ]?квест|необязательн/i.test(node.title)) {
      addError(`Forbidden intervention label in node title ${node.id}`);
    }
    for (const transition of node.transitions) {
      if (/сайд[- ]?квест|необязательн/i.test(transition.label)) {
        addError(`Forbidden intervention label on ${node.id}->${transition.to}`);
      }
      if (transition.exitKind === 'partial') {
        walk(transition, `${node.id}->${transition.to}.partial`, (value, context) => {
          if (value?.type === 'increment-counter' && value.counter === 'doom') {
            addError(`Partial relationship/intervention exit changes Doom at ${context}`);
          }
          if (
            value?.type === 'set-flag' &&
            [
              'clear-boundary-cue',
              'olva-relationship-review-complete',
              'womanizer-polina-kept',
              'womanizer-show18-used',
              'womanizer-returned'
            ].includes(value.flag) &&
            value.value === true
          ) {
            addError(`Partial exit grants full relationship reward at ${context}`);
          }
        });
      }
    }
  }

  const duration = graph.durationContract;
  const expectedDurationFields = {
    'structuralRoutesWithoutReserveMinutes.min': 111,
    'structuralRoutesWithoutReserveMinutes.max': 267,
    'normalRoutesWithoutReserveMinutes.min': 180,
    'normalRoutesWithoutReserveMinutes.max': 257,
    cleanDirectRouteMinutes: 180,
    fullNormalRouteMinutes: 257,
    hardCapMinutes: 300
  };
  for (const [field, expected] of Object.entries(expectedDurationFields)) {
    const actual = field.split('.').reduce((value, key) => value?.[key], duration);
    if (actual !== expected) addError(`durationContract.${field}=${actual}, expected ${expected}`);
  }
  const mandatoryNormalRoute = [
    'tavern-invitation', 'invitation-to-hotel-video', 'hotel-overload', 'hotel-gallery',
    'closed-bar', 'artists-dressing-room', 'groom-hypothesis', 'bungalow-courtyard',
    'groom-tunnel', 'groom-preparation-room', 'kreed-disclosure', 'post-kreed-route',
    'graywise-door-trust', 'bedroom-reveal', 'igor-unboxing', 'wedding-reminder',
    'wedding-reminder-resolution', 'igor-orientation', 'igor-consent-decisions',
    'final-choice', 'last-take-boss', 'post-crisis-orientation-shutdown',
    'post-crisis-publication-shutdown', 'shutdown-epilogue'
  ];
  const fullNormalExtras = [
    'alexis-room', 'pussy-audience', 'pussy-prop-room', 'pussy-scepter-return',
    'egorik-bungalow-reveal', 'couples-session-entry',
    'couples-session-stas', 'couples-session-polina', 'olva-relationship-review',
    'show-18-pavilion', 'couples-session-plan', 'couples-session-choice',
    'restore-control-log', 'responsible-control-log'
  ];
  const cleanDuration = sumRoute(mandatoryNormalRoute, 'clean normal route');
  const fullDuration = cleanDuration + sumRoute(fullNormalExtras, 'full normal extras');
  if (cleanDuration !== 180) addError(`Executable clean normal route is ${cleanDuration}m, expected 180m`);
  if (fullDuration !== 257) addError(`Executable full normal route is ${fullDuration}m, expected 257m`);
  structuralRoutes = enumerateStructuralRoutes();
  if (structuralRoutes.min !== 111 || structuralRoutes.max !== 267) {
    addError(
      `Structural route durations are ${structuralRoutes.min}-${structuralRoutes.max}m, expected 111-267m`
    );
  }
  const endingGuardText = JSON.stringify(
    nodes.flatMap((node) => node.transitions.filter((edge) => endingIds.has(edge.to)).map((edge) => edge.condition))
  );
  if (endingGuardText.includes('couple-publication-consent')) addError('Publication consent gates an ending');
}

staticValidation();
exitIfErrors();

function validateCallbackLifecycle() {
  let earned = initialState('full');
  for (const rule of callbackRules) earned.flags[rule.assetFlag] = true;
  earned.flags['kreed-rescued'] = true;
  earned.flags['kreed-disclosure-complete'] = true;
  earned.flags['graywise-door-opened'] = true;
  earned.flags['privacy-lock-active'] = true;
  for (const phase of ['assembly', 'imposed-staging', 'discharge']) {
    earned = applyEffects(
      earned,
      [{type: 'activate-callback-phase', phase}],
      `callback-proof.${phase}.first`
    );
    earned = applyEffects(
      earned,
      [{type: 'activate-callback-phase', phase}],
      `callback-proof.${phase}.repeat`
    );
  }
  earned = applyEffects(earned, [{type: 'resolve-callback-fallback'}], 'callback-proof.fallback.first');
  earned = applyEffects(earned, [{type: 'resolve-callback-fallback'}], 'callback-proof.fallback.repeat');
  for (const rule of callbackRules) {
    if (earned.callbackCounts[rule.assetFlag] !== 1 || !earned.flags[rule.resolvedFlag]) {
      addError(`Callback exact-once proof failed for ${rule.assetFlag}`);
    }
  }

  let graywiseFallback = initialState('full');
  graywiseFallback.flags['kreed-rescued'] = true;
  graywiseFallback.flags['kreed-disclosure-complete'] = true;
  graywiseFallback.flags['graywise-door-opened'] = true;
  graywiseFallback.flags['graywise-privacy-ally'] = true;
  graywiseFallback = applyEffects(
    graywiseFallback,
    [{type: 'activate-callback-phase', phase: 'imposed-staging'}],
    'callback-proof.graywise.no-active-lock'
  );
  graywiseFallback = applyEffects(
    graywiseFallback,
    [{type: 'resolve-callback-fallback'}],
    'callback-proof.graywise.fallback'
  );
  if (graywiseFallback.callbackCounts['graywise-privacy-ally'] !== 1) {
    addError('Graywise callback has no exact-once epilogue fallback when privacy-lock is inactive');
  }

  let unearned = initialState('full');
  for (const phase of ['assembly', 'imposed-staging', 'discharge']) {
    unearned = applyEffects(
      unearned,
      [{type: 'activate-callback-phase', phase}],
      `callback-proof.unearned.${phase}`
    );
  }
  unearned = applyEffects(
    unearned,
    [{type: 'resolve-callback-fallback'}],
    'callback-proof.unearned.fallback'
  );
  if (Object.values(unearned.callbackCounts).some((count) => count !== 0)) {
    addError('Unearned callback resolved during lifecycle proof');
  }
}

validateCallbackLifecycle();
exitIfErrors();

const starts = nodes.filter((node) => node.start);
const queue = [];
const queued = new Set();
function enqueue(item) {
  const key = `${item.nodeId}|${stateSignature(item.state, item.nodeId)}`;
  if (queued.has(key)) return;
  queued.add(key);
  queue.push(item);
}
for (const node of starts) enqueue({nodeId: node.id, state: initialState(), trace: [node.id]});
const seen = new Set();
let terminalStateCount = 0;
const endingCounts = Object.fromEntries([...endingIds].map((id) => [id, 0]));
const liveProfiles = new Set();
const technicalProfiles = new Set();
const publicationProfiles = new Set();
const stateExplorationLimit = 1000000;
let reachableStates = 0;
let finaleStates = 0;
let earlyAssaultWitness = false;
let doomFiveWitness = false;
let reminderDeliveredWitness = false;
let reminderRefusalWitness = false;
let emergencyPendingWitness = false;
let emergencyResolvedWitness = false;
let cleanRescueSkipsPriceWitness = false;
let complicatedRescuePriceWitness = false;
let relationshipSkipWitness = false;
let relationshipPartialWitness = false;
let relationshipFullWithItemWitness = false;
let relationshipFullWithoutItemWitness = false;

while (queue.length > 0) {
  const current = queue.pop();
  queued.delete(`${current.nodeId}|${stateSignature(current.state, current.nodeId)}`);
  const node = byId.get(current.nodeId);
  if (!node) continue;
  const enteredState = enterMandatoryNode(current.state, node.id, current.trace);
  if (node.entryCondition && !evaluate(node.entryCondition, enteredState)) {
    addError(`Entry condition failed at ${node.id}: ${current.trace.join(' -> ')}`);
    continue;
  }
  validateState(enteredState, `enter.${node.id}`);
  const key = `${node.id}|${stateSignature(enteredState, node.id)}`;
  if (seen.has(key)) continue;
  seen.add(key);
  reachableStates += 1;
  if (reachableStates > stateExplorationLimit) {
    throw new Error(`State exploration exceeded ${stateExplorationLimit} graph states`);
  }

  if (node.id === 'kreed-disclosure') {
    const priceOutcomes = [
      enteredState.flags['privacy-lock-active'],
      enteredState.flags['rescue-doom-price-paid']
    ].filter(Boolean).length;
    if (enteredState.flags['rescue-price-required']) {
      if (priceOutcomes !== 1) {
        addError(`Complicated Creed rescue has ${priceOutcomes} declared prices`);
      }
      complicatedRescuePriceWitness ||= priceOutcomes === 1;
    } else {
      if (priceOutcomes !== 0) addError('Clean Creed rescue incorrectly applied a price');
      cleanRescueSkipsPriceWitness ||= priceOutcomes === 0;
    }
  }

  if (node.id === 'final-choice') {
    if (!enteredState.flags['bedroom-sequence-resolved']) {
      addError(`final-choice reached before bedroom sequence resolved: ${current.trace.join(' -> ')}`);
    }
    if (enteredState.flags['igor-oriented']) {
      liveProfiles.add(`${Number(enteredState.flags['kreed-live-consent'])}${Number(enteredState.flags['igor-live-consent'])}`);
      technicalProfiles.add(`${Number(enteredState.flags['kreed-technical-consent'])}${Number(enteredState.flags['igor-technical-consent'])}`);
    }
  }

  if (node.ending) {
    terminalStateCount += 1;
    endingCounts[node.id] = (endingCounts[node.id] ?? 0) + 1;
    publicationProfiles.add(
      `${Number(enteredState.flags['kreed-publication-consent'])}${Number(enteredState.flags['igor-publication-consent'])}`
    );
    if (enteredState.chainIndex !== mandatoryChain.length) {
      addError(`Ending ${node.id} missed chain after ${mandatoryChain[enteredState.chainIndex]}`);
    }
    if (enteredState.flags['emergency-last-action-required'] && !enteredState.flags['emergency-last-action-resolved']) {
      addError(`Ending ${node.id} bypassed the manual emergency action`);
    }
    const selected = [...endingIds].filter((id) => {
      const flag = `selected-epilogue-${id.replace('-epilogue', '')}`;
      return enteredState.flags[flag];
    });
    if (selected.length !== 1 || selected[0] !== node.id) {
      addError(`Ending selection disagrees with ${node.id}: ${selected.join(',')}`);
    }
    if (!enteredState.flags['publication-decision-complete']) addError(`${node.id} bypassed publication decision`);
    reminderDeliveredWitness ||= enteredState.flags['wedding-reminder-delivered'];
    reminderRefusalWitness ||=
      enteredState.flags['wedding-reminder-refused'] &&
      !enteredState.flags['wedding-reminder-delivered'] &&
      enteredState.flags['physical-final-forced'];
    earlyAssaultWitness ||= enteredState.flags['early-assault-declared'];
    doomFiveWitness ||= enteredState.flags['doom-five-triggered'];
    emergencyResolvedWitness ||=
      enteredState.flags['emergency-last-action-required'] &&
      enteredState.flags['emergency-last-action-resolved'] &&
      node.id === 'evacuation-epilogue';
    const womanizerOutcomeCount = [
      'womanizer-polina-kept',
      'womanizer-show18-used',
      'womanizer-returned'
    ].filter((flag) => enteredState.flags[flag]).length;
    relationshipSkipWitness ||=
      !enteredState.flags['olva-relationship-review-partial'] &&
      !enteredState.flags['olva-relationship-review-complete'] &&
      !enteredState.flags['clear-boundary-cue'] &&
      womanizerOutcomeCount === 0;
    relationshipPartialWitness ||=
      enteredState.flags['olva-relationship-review-partial'] &&
      !enteredState.flags['olva-relationship-review-complete'] &&
      !enteredState.flags['clear-boundary-cue'] &&
      womanizerOutcomeCount === 0;
    const relationshipFullBase =
      !enteredState.flags['olva-relationship-review-partial'] &&
      enteredState.flags['olva-relationship-review-complete'] &&
      enteredState.flags['clear-boundary-cue'];
    relationshipFullWithItemWitness ||=
      relationshipFullBase &&
      enteredState.flags['womanizer-obtained'] &&
      womanizerOutcomeCount === 1;
    relationshipFullWithoutItemWitness ||=
      relationshipFullBase &&
      !enteredState.flags['womanizer-obtained'] &&
      womanizerOutcomeCount === 0;
    continue;
  }

  let sourceVariants = [{state: enteredState, choices: []}];
  if (node.finaleMachine) {
    sourceVariants = runFinaleMachine(node, enteredState);
    finaleStates += sourceVariants.length;
  }
  for (const sourceVariant of sourceVariants) {
    const pending =
      sourceVariant.state.flags['emergency-last-action-required'] &&
      !sourceVariant.state.flags['emergency-last-action-resolved'];
    emergencyPendingWitness ||= pending;
    const transitions = selectChoices(node.transitions, sourceVariant.state);
    if (transitions.length === 0) {
      addError(`No executable transition at ${node.id} for ${stateSignature(sourceVariant.state)}`);
      continue;
    }
    if (
      transitions.length > 1 &&
      !node.transitionSelectionContract &&
      !node.decisionContract &&
      !node.orientationContract
    ) {
      addError(`Overlapping transitions at ${node.id} lack an explicit selection owner`);
    }
    if (pending && node.id === 'last-take-boss') {
      const wrongTargets = transitions.map((edge) => edge.to).filter((target) => target !== 'last-take-emergency-action');
      if (wrongTargets.length > 0) addError(`Pending emergency bypasses manual action via ${wrongTargets.join(', ')}`);
    }
    for (const transition of transitions) {
      for (const variant of expandTransition(transition, sourceVariant.state, `${node.id}->${transition.to}`)) {
        if (variant.state.counters.doom < sourceVariant.state.counters.doom) addError(`Doom decreased at ${node.id}->${transition.to}`);
        enqueue({
          nodeId: transition.to,
          state: variant.state,
          trace: [...current.trace, transition.to]
        });
      }
    }
  }
}

for (const [ending, count] of Object.entries(endingCounts)) if (count === 0) addError(`Ending ${ending} is unreachable`);
for (const profile of ['00', '10', '01', '11']) {
  if (!liveProfiles.has(profile)) addError(`Live-consent profile ${profile} is unreachable`);
  if (!technicalProfiles.has(profile)) addError(`Technical-consent profile ${profile} is unreachable`);
  if (!publicationProfiles.has(profile)) addError(`Publication-consent profile ${profile} is unreachable`);
}
if (!reminderDeliveredWitness) addError('No normal route delivers the wedding reminder');
if (!reminderRefusalWitness) addError('Wedding-reminder refusal lacks physical fail-forward');
if (!earlyAssaultWitness) addError('No terminal route proves early-assault fail-forward');
if (!doomFiveWitness) addError('No terminal route proves Doom 5 fail-forward');
if (!emergencyPendingWitness) addError('Finale produced no pending emergency state');
if (!emergencyResolvedWitness) addError('Manual emergency action does not reach evacuation');
if (!cleanRescueSkipsPriceWitness) addError('No executable clean Creed rescue skips the price group');
if (!complicatedRescuePriceWitness) {
  addError('No executable complicated Creed rescue applies exactly one player-selected price');
}
if (!relationshipSkipWitness) addError('Relationship intervention has no terminal skip witness');
if (!relationshipPartialWitness) {
  addError('Relationship intervention has no reward-free terminal partial-exit witness');
}
if (!relationshipFullWithItemWitness) {
  addError('Relationship intervention has no terminal full-reward/exactly-one item outcome witness');
}
if (!relationshipFullWithoutItemWitness) {
  addError('Relationship intervention has no terminal full-reward witness without Womanizer');
}

exitIfErrors();

console.log(`State graph valid: ${reachableStates + finaleStates} reachable states, ${terminalStateCount} terminal state classes`);
console.log(
  `Endings reachable: ${Object.entries(endingCounts).map(([id, count]) => `${id}=${count}`).join(', ')}`
);
console.log(
  `Structural routes valid: ${structuralRoutes.count} paths, durations ${structuralRoutes.min}-${structuralRoutes.max}m; normal routes 180-257m`
);
console.log(`Mandatory chain valid: ${mandatoryChain.join(' -> ')}`);
console.log(
  'Critical invariants valid: single reveal writer, ordered Creed/Graywise/reveal/unboxing/reminder/final chain, explicit player/observed ownership, conditional rescue price, relationship skip/partial/full-with-item/full-without-item exits, guarded hotel-room orders, scepter/Womanizer chain, Doom5 and early-assault fail-forward, reminder-refusal physical fail-forward, manual emergency action, individual consent profiles, publication-after-orientation, exact-once callbacks'
);
