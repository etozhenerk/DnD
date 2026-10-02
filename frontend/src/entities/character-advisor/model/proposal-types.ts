// HTTP proposal shape; game validation remains in the character-form entity.
export type AdvisorProposal = {
  target?: 'name' | 'appearance' | 'race' | 'class' | 'abilities' | 'equipment';
  formData: {
    appearance: {displayName: string; pronouns: string; appearance: string; story: string; motivation: string; personality: string[]};
    race: {raceId: string};
    class: {classId: string};
    attributes: Record<string, number>;
    abilities: {
      basicAction: {name: string; description: string; modifierStat: string};
      items: {id: string; name: string; description: string; profileId: string; modifierStat: string}[];
      narrativeItems: {id: string; name: string; description: string}[];
    };
    equipment: {items: {id: string; name: string; description: string}[]};
  };
};
