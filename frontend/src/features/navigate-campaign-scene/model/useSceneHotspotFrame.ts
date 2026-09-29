import {useEffect, useRef, useState} from 'react';
import {resolveAsset} from '../../../shared/lib/assets/resolveAsset';
import {getFittedImageRect} from '../../../shared/lib/image/getFittedImageRect';

export function useSceneHotspotFrame(source?: string, fit: 'cover' | 'contain' = 'cover') {
  const ref = useRef<HTMLElement>(null);
  const [frame, setFrame] = useState<ReturnType<typeof getFittedImageRect> | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!source || !element) return;
    const image = new Image();
    let active = true;
    const update = () => {
      if (!active || !image.naturalWidth || !element.clientWidth || !element.clientHeight) return;
      setFrame(getFittedImageRect(element.clientWidth, element.clientHeight, image.naturalWidth, image.naturalHeight, fit));
    };
    image.onload = update;
    image.src = resolveAsset(source);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => {active = false; observer.disconnect(); image.onload = null;};
  }, [source, fit]);
  return {ref, frame: source ? frame : null};
}
