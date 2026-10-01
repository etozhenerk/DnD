import {getCharacterAttributeRows} from '../../../entities/character';

export function getPreviewAttributes(formData: Record<string, unknown>) {
  const section = formData.attributes;
  const attributes: Record<string, unknown> = section !== null && typeof section === 'object'
    ? section as Record<string, unknown> : {};
  return getCharacterAttributeRows(attributes);
}
