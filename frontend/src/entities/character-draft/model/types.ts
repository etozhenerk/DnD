export type CharacterDraft = {
  id: string;
  rulesetId: string;
  formData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type DraftSession = {
  id: string;
  token: string;
  persistent: boolean;
};

export type DraftValidation = {
  valid: boolean;
  issues: {path: string; code: string; message: string}[];
};
