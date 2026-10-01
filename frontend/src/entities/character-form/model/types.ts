export type FormValidation = {
  valid: boolean;
  issues: {path: string; code: string; message: string}[];
};

export type CharacterForm = {
  formData: Record<string, unknown>;
  validation: FormValidation;
};
