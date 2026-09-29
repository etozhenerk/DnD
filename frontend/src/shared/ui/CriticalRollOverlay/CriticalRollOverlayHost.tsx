import {useCriticalRollEffect} from '../../lib/dice/useCriticalRollEffect';
import {CriticalRollOverlay} from './CriticalRollOverlay';

export function CriticalRollOverlayHost() {
  const activeEffect = useCriticalRollEffect();

  return (
    <CriticalRollOverlay
      key={activeEffect?.id}
      result={activeEffect?.result ?? null}
    />
  );
}
