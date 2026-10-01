import type {FantasyIconName} from '../../../shared/ui/FantasyIcon';
import {getAttributeLabel} from './catalog-labels';
import {formatSignedNumber} from '../../../shared/lib/numbers';

export type CharacterAttributeRow = {
  id: string;
  label: string;
  icon: FantasyIconName;
  display: string;
};

const attributeIcons: Record<string, FantasyIconName> = {
  strength: 'fist', dexterity: 'feather', constitution: 'heart',
  wisdom: 'eye', intelligence: 'book', charisma: 'sun',
};

export function getCharacterAttributeRows(attributes: Record<string, unknown>): CharacterAttributeRow[] {
  return Object.entries(attributeIcons).map(([id, icon]) => {
    const value = attributes[id];
    const display = typeof value === 'number' && Number.isFinite(value)
      ? formatSignedNumber(value) : '—';
    return {id, label: getAttributeLabel(id), icon, display};
  });
}
