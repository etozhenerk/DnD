import {useCallback, useRef} from 'react';
import {triggerCriticalRollEffect} from './criticalRollEffect';

export function useManualCriticalRollEffect() {
  const manuallyEditedKeysRef = useRef(new Set<string>());

  const markManualRoll = useCallback((key = 'main') => {
    manuallyEditedKeysRef.current.add(key);
  }, []);

  const commitManualRoll = useCallback((
    key: string,
    value: string | number,
    expression = '1d20',
  ) => {
    if (!manuallyEditedKeysRef.current.delete(key)) return;
    triggerCriticalRollEffect(Number(value), expression);
  }, []);

  const resetManualRoll = useCallback((key?: string) => {
    if (key) manuallyEditedKeysRef.current.delete(key);
    else manuallyEditedKeysRef.current.clear();
  }, []);

  return {commitManualRoll, markManualRoll, resetManualRoll};
}
