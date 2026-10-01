import {PortraitImage} from '../../../../shared/ui/PortraitImage';
import {useCharacterPortrait} from '../../model/useCharacterPortrait';

export type CharacterPortraitProps = {src?: string | null; name: string; className?: string};

export function CharacterPortrait({src, name, className}: CharacterPortraitProps) {
  const portrait = useCharacterPortrait(src);
  return (
    <PortraitImage src={portrait.src} className={className} onError={portrait.onError}
      alt={portrait.isFallback ? `Заглушка портрета: ${name}` : `Портрет персонажа: ${name}`} />
  );
}
