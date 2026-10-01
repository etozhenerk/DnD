import {useState} from 'react';
import {readAppearance} from './appearance';
import type {CharacterAppearance} from './appearance';
import type {CharacterFormData, EditableSection} from './build-types';
import {classProfiles} from './creation-catalog';
import {validateForm} from './form-validation';
import {createEmptySkills} from './skill-balance';
import {getAttributeBalance} from './attribute-balance';

export function useCharacterForm() {
  const [formData, setFormData] = useState<CharacterFormData>({});
  const [confirmed, setConfirmed] = useState<Set<string>>(() => new Set());
  const [pendingClassId, setPendingClassId] = useState<string | null>(null);
  function setSection<K extends EditableSection>(section: K, value: CharacterFormData[K]) {
    setFormData((current) => ({...current, [section]: value}));
    setConfirmed((current) => new Set([...current].filter((id) => id !== section)));
  }
  function applyClass(classId: string) {
    const profile = classProfiles.find((item) => item.id === classId);
    if (!profile) return;
    setFormData((current) => ({...current, class: {classId}, attributes: {...profile.baseStats}}));
    setPendingClassId(null);
  }
  function selectClass(classId: string) {
    if (formData.class?.classId === classId) return;
    const current = classProfiles.find((item) => item.id === formData.class?.classId);
    if (current && getAttributeBalance(formData.attributes, current).spent > 0) {
      setPendingClassId(classId);
      return;
    }
    applyClass(classId);
  }
  return {
    form: {formData, validation: validateForm(formData, confirmed)},
    formData,
    setSection,
    selectClass,
    pendingClassId,
    confirmClassChange: () => { if (pendingClassId) applyClass(pendingClassId); },
    cancelClassChange: () => setPendingClassId(null),
    confirmed,
    confirmSection: (section: string) => setConfirmed((current) => new Set([...current, section])),
    skills: formData.abilities ?? createEmptySkills(formData.attributes),
    appearance: readAppearance(formData),
    setAppearance: (changes: Partial<CharacterAppearance>) => setFormData((current) => ({
      ...current, appearance: {...readAppearance(current), ...changes},
    })),
  };
}
