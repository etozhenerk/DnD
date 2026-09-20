#!/usr/bin/env node

import {readFile} from 'node:fs/promises';

const graphPath = process.argv[2];
if (graphPath === '--help' || graphPath === '-h') {
  console.log('Usage: node validate-story-graph.mjs <story-graph.json|->');
  process.exit(0);
}
if (!graphPath) {
  console.error('Usage: node validate-story-graph.mjs <story-graph.json|->');
  process.exit(2);
}

const errors = [];
const warnings = [];
const kebabCase = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

let graph;
try {
  let sourceText;
  if (graphPath === '-') {
    process.stdin.setEncoding('utf8');
    sourceText = '';
    for await (const chunk of process.stdin) sourceText += chunk;
  } else {
    sourceText = await readFile(graphPath, 'utf8');
  }
  graph = JSON.parse(sourceText);
} catch (error) {
  const source = graphPath === '-' ? 'stdin' : graphPath;
  console.error(`Cannot read graph from ${source}: ${error.message}`);
  process.exit(2);
}

if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
  console.error('Graph must contain a non-empty nodes array');
  process.exit(1);
}

const byId = new Map();
for (const node of graph.nodes) {
  if (!node?.id || !kebabCase.test(node.id)) errors.push(`Invalid node id: ${String(node?.id)}`);
  if (byId.has(node.id)) errors.push(`Duplicate node id: ${node.id}`);
  byId.set(node.id, node);
  if (!Number.isFinite(node.expectedMinutes) || node.expectedMinutes < 0) errors.push(`Invalid expectedMinutes: ${node.id}`);
  if (!Array.isArray(node.transitions)) errors.push(`Node transitions must be an array: ${node.id}`);
}

const starts = graph.nodes.filter((node) => node.start);
const endings = graph.nodes.filter((node) => node.ending);
if (starts.length === 0) errors.push('At least one start node is required');
if (endings.length === 0) errors.push('At least one ending node is required');

for (const node of graph.nodes) {
  const transitions = Array.isArray(node.transitions) ? node.transitions : [];
  if (!node.ending && transitions.length === 0) errors.push(`Dead end is not marked as ending: ${node.id}`);
  const hasConditional = transitions.some((transition) => transition.condition);
  const hasFallback = transitions.some((transition) => !transition.condition || transition.condition?.otherwise === true);
  if (hasConditional && !hasFallback) errors.push(`Conditional node has no fallback transition: ${node.id}`);
  for (const transition of transitions) {
    if (!byId.has(transition.to)) errors.push(`Broken transition ${node.id} -> ${String(transition.to)}`);
  }
}

for (const node of graph.nodes) {
  if (node.aliasOf === undefined) continue;
  const target = byId.get(node.aliasOf);
  if (!target) {
    errors.push(`Unknown alias target ${String(node.aliasOf)} for ${node.id}`);
    continue;
  }
  if (node.aliasOf === node.id) errors.push(`Node cannot alias itself: ${node.id}`);
  if (target.aliasOf !== undefined) errors.push(`Alias chains are not allowed: ${node.id} -> ${node.aliasOf}`);
  if (node.expectedMinutes !== target.expectedMinutes) {
    errors.push(
      `Alias duration mismatch ${node.id}=${node.expectedMinutes}m, ${node.aliasOf}=${target.expectedMinutes}m`
    );
  }
}

const reachable = new Set();
const queue = starts.map((node) => node.id);
while (queue.length > 0) {
  const id = queue.shift();
  if (reachable.has(id) || !byId.has(id)) continue;
  reachable.add(id);
  for (const transition of byId.get(id).transitions ?? []) queue.push(transition.to);
}
for (const node of graph.nodes) {
  if (!reachable.has(node.id)) errors.push(`Unreachable node: ${node.id}`);
}
for (const ending of endings) {
  if (!reachable.has(ending.id)) errors.push(`Unreachable ending: ${ending.id}`);
}

const visiting = new Set();
const visited = new Set();
function detectCycles(id, path) {
  if (visiting.has(id)) {
    const cycleStart = path.indexOf(id);
    const cycle = [...path.slice(cycleStart), id];
    const cycleNodes = cycle.slice(0, -1).map((nodeId) => byId.get(nodeId));
    if (!cycleNodes.every((node) => node?.allowCycle === true)) errors.push(`Unapproved cycle: ${cycle.join(' -> ')}`);
    return;
  }
  if (visited.has(id) || !byId.has(id)) return;
  visiting.add(id);
  for (const transition of byId.get(id).transitions ?? []) detectCycles(transition.to, [...path, id]);
  visiting.delete(id);
  visited.add(id);
}
for (const start of starts) detectCycles(start.id, []);

for (const clue of graph.criticalClues ?? []) {
  const sources = [...new Set(clue.sourceSceneIds ?? [])];
  if (sources.length < 2) errors.push(`Critical clue needs at least two sources: ${clue.id}`);
  for (const source of sources) if (!byId.has(source)) errors.push(`Unknown clue source ${source} for ${clue.id}`);
}

let routeCount = 0;
let minDuration = Number.POSITIVE_INFINITY;
let maxDuration = Number.NEGATIVE_INFINITY;
function collectDurations(id, duration, path, canonicalPath) {
  if (!byId.has(id) || path.has(id)) return;
  const node = byId.get(id);
  const canonicalId = node.aliasOf ?? node.id;
  const nextDuration = duration + (canonicalPath.has(canonicalId) ? 0 : node.expectedMinutes);
  if (node.ending) {
    routeCount += 1;
    minDuration = Math.min(minDuration, nextDuration);
    maxDuration = Math.max(maxDuration, nextDuration);
    return;
  }
  const nextPath = new Set(path);
  nextPath.add(id);
  const nextCanonicalPath = new Set(canonicalPath);
  nextCanonicalPath.add(canonicalId);
  for (const transition of node.transitions ?? []) {
    collectDurations(transition.to, nextDuration, nextPath, nextCanonicalPath);
  }
}
for (const start of starts) collectDurations(start.id, 0, new Set(), new Set());

if (routeCount === 0) errors.push('No finite route reaches an ending');
const recommended = graph.recommendedDurationMinutes;
if (routeCount > 0 && recommended) {
  if (minDuration < recommended.min) warnings.push(`Shortest route ${minDuration}m is below recommended ${recommended.min}m`);
  if (maxDuration > recommended.max) warnings.push(`Longest route ${maxDuration}m exceeds recommended ${recommended.max}m`);
}

for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);

if (errors.length > 0) process.exit(1);

const reportedMinDuration = routeCount > 0 ? minDuration : 0;
const reportedMaxDuration = routeCount > 0 ? maxDuration : 0;
console.log(`Graph valid: ${graph.nodes.length} nodes, ${starts.length} starts, ${endings.length} endings, routes ${reportedMinDuration}-${reportedMaxDuration}m`);
