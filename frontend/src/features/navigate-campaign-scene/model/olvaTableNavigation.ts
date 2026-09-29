export type OlvaTableScreen = 'room' | 'table' | 'evidence' | 'unlock' | 'voting';
export interface OlvaTableNavigationState {screen: OlvaTableScreen; evidenceId: string | null;}
export type OlvaTableNavigationAction = {type: 'open'; complete: boolean} | {type: 'inspect'; id: string} | {type: 'decide'; revealGift: boolean} | {type: 'vote'} | {type: 'back'} | {type: 'close'};
export const initialOlvaTableNavigation: OlvaTableNavigationState = {screen: 'room', evidenceId: null};
export function olvaTableNavigationReducer(state: OlvaTableNavigationState, action: OlvaTableNavigationAction): OlvaTableNavigationState {
  switch (action.type) {
    case 'open': return {screen: action.complete ? 'voting' : 'table', evidenceId: null};
    case 'inspect': return {screen: 'evidence', evidenceId: action.id};
    case 'decide': return {screen: action.revealGift ? 'unlock' : 'voting', evidenceId: null};
    case 'vote': return {screen: 'voting', evidenceId: null};
    case 'back': return {screen: state.screen === 'table' || state.screen === 'room' ? 'room' : 'table', evidenceId: null};
    case 'close': return initialOlvaTableNavigation;
  }
}
