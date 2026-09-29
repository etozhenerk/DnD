import type {OlvaTableNavigationState, OlvaTableScreen} from './olvaTableNavigation';

interface StepBackInput {
  navigation: OlvaTableNavigationState;
  lastActionId?: string;
  canUndo: boolean;
  complete: boolean;
}

/** One crown command owns both table edits and navigation; opening a detail is a separate step. */
export function getOlvaMasterStepBack({navigation, lastActionId = '', canUndo, complete}: StepBackInput):
  {kind: 'undo'; screen: OlvaTableScreen} | {kind: 'back'} | {kind: 'exit'} {
  if (canUndo && complete && lastActionId.startsWith('table-finish-')) return {kind: 'undo', screen: 'voting'};
  if (canUndo && complete && ['table-show-reward', 'table-claim-reward'].includes(lastActionId)) return {kind: 'undo', screen: 'room'};
  if (canUndo && navigation.screen === 'evidence' && navigation.evidenceId
    && lastActionId.startsWith(`table-place-${navigation.evidenceId}-`)) return {kind: 'undo', screen: 'evidence'};
  if (navigation.screen === 'evidence' || navigation.screen === 'unlock') return {kind: 'back'};
  if (canUndo && navigation.screen === 'voting' && lastActionId.startsWith('table-vote-')
    && lastActionId !== 'table-vote-after-compromise') return {kind: 'undo', screen: 'voting'};
  if (canUndo && navigation.screen === 'table' && (
    lastActionId.startsWith('table-place-') || ['table-offer-gift', 'table-withdraw-gift'].includes(lastActionId)
  )) return {kind: 'undo', screen: 'table'};
  return navigation.screen === 'room' ? {kind: 'exit'} : {kind: 'back'};
}
