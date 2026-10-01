import {useState} from 'react';
import {resolveAsset} from '../../../shared/lib/assets';
import {defaultCharacterPortrait} from '../config/character-portrait';

export function useCharacterPortrait(source?: string | null) {
  const requested = source?.trim() ? resolveAsset(source.trim()) : defaultCharacterPortrait;
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const isFallback = requested === defaultCharacterPortrait || requested === failedSource;
  return {
    src: isFallback ? defaultCharacterPortrait : requested,
    isFallback,
    onError: () => setFailedSource(requested),
  };
}
