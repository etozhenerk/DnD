import {useSyncExternalStore} from 'react';
import {getCriticalRollEffect, getServerCriticalRollEffect, subscribeToCriticalRollEffect} from './criticalRollEffect';

export function useCriticalRollEffect() {
  return useSyncExternalStore(subscribeToCriticalRollEffect, getCriticalRollEffect, getServerCriticalRollEffect);
}
