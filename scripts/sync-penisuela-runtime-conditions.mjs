#!/usr/bin/env node

import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const root = resolve(import.meta.dirname, '..');
const graphPath = resolve(root, 'docs/campaigns/penisuela/story-graph.json');
const gameplayPath = resolve(root, 'content/campaigns/penisuela-gallery-gameplay.json');

const graph = JSON.parse(await readFile(graphPath, 'utf8'));
const gameplay = JSON.parse(await readFile(gameplayPath, 'utf8'));
const runtimeScenes = new Map(gameplay.storyScenes.map((scene) => [scene.id, scene]));
const skipExactTransitionNodes = new Set([
  // The first playable build compresses the multi-phase finale machine into one choice screen.
  // Its bridge conditions are intentionally authored in canonical gameplay data.
  'last-take-boss',
]);

function combineConditions(...conditions) {
  const present = conditions.filter(Boolean);
  if (present.length === 0) return null;
  return present.length === 1 ? present[0] : {all: present};
}

function otherwiseCondition(node) {
  const alternatives = node.transitions
    .map((transition) => transition.condition)
    .filter((condition) => condition && condition.otherwise !== true);
  if (alternatives.length === 0) return null;
  return {not: alternatives.length === 1 ? alternatives[0] : {any: alternatives}};
}

function writeGraphCondition(action, condition) {
  if (!condition) {
    if (!action.conditions?.graphCondition) return;
    delete action.conditions.graphCondition;
    if (Object.keys(action.conditions).length === 0) delete action.conditions;
    return;
  }
  action.conditions = {...(action.conditions ?? {}), graphCondition: condition};
}

for (const node of graph.nodes) {
  const runtimeScene = runtimeScenes.get(node.id);
  if (!runtimeScene && ['tavern-invitation', 'invitation-to-hotel-video'].includes(node.id)) continue;
  if (!runtimeScene) throw new Error(`Missing runtime story scene ${node.id}`);

  if (!skipExactTransitionNodes.has(node.id)) {
    node.transitions.forEach((transition, transitionIndex) => {
      const actionId = `continue-${transitionIndex + 1}-${transition.to}`;
      const exactAction = runtimeScene.actions.find((candidate) => candidate.id === actionId);
      const labelAction = runtimeScene.actions.find(
        (candidate) => candidate.id.startsWith('continue-') && candidate.label === transition.label,
      );
      const targetActions = runtimeScene.actions.filter(
        (candidate) => candidate.id.startsWith('continue-') && candidate.nextSceneId === transition.to,
      );
      const action = exactAction ?? labelAction ?? (targetActions.length === 1 ? targetActions[0] : null);
      if (!action) throw new Error(`Missing transition action ${node.id}.${actionId}`);
      const condition = transition.condition?.otherwise === true
        ? otherwiseCondition(node)
        : transition.condition;
      writeGraphCondition(action, condition);
    });
  }

  const outcomeByLabel = new Map();
  for (const transition of node.transitions) {
    const groups = transition.transitionOutcomes
      ? [transition.transitionOutcomes]
      : transition.transitionOutcomeGroups ?? [];
    for (const group of groups) {
      for (const option of group.options ?? []) {
        const condition = combineConditions(group.appliesWhen, option.condition);
        const existing = outcomeByLabel.get(option.label);
        if (existing && JSON.stringify(existing) !== JSON.stringify(condition)) {
          throw new Error(`Ambiguous option condition for ${node.id}: ${option.label}`);
        }
        outcomeByLabel.set(option.label, condition);
      }
    }
  }
  for (const action of runtimeScene.actions.filter((candidate) => candidate.id.startsWith('choose-'))) {
    if (!outcomeByLabel.has(action.label)) {
      throw new Error(`Cannot match choice action ${node.id}.${action.id}`);
    }
    writeGraphCondition(action, outcomeByLabel.get(action.label));
  }
}

await writeFile(gameplayPath, `${JSON.stringify(gameplay, null, 2)}\n`);
console.log(`Synced graph conditions into ${gameplay.storyScenes.length} runtime scenes.`);
