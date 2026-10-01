export type CharacterAppearance = {
  displayName: string;
  pronouns: string;
  appearance: string;
  story: string;
  personality: string[];
  motivation: string;
};

export type AppearanceTextKey = Exclude<keyof CharacterAppearance, 'personality'>;

export function readAppearance(formData: Record<string, unknown>): CharacterAppearance {
  const section = formData.appearance;
  const data: Record<string, unknown> = section !== null && typeof section === 'object' && !Array.isArray(section)
    ? section as Record<string, unknown> : {};
  const text = (key: AppearanceTextKey) => {
    const value = data[key];
    return typeof value === 'string' ? value : '';
  };
  const personality = Array.isArray(data.personality)
    ? data.personality.filter((item: unknown): item is string => typeof item === 'string') : [];
  return {
    displayName: text('displayName'), pronouns: text('pronouns'), appearance: text('appearance'),
    story: text('story'), personality, motivation: text('motivation'),
  };
}
