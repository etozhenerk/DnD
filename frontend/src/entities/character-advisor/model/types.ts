export type AdvisorStepId = 'appearance' | 'race' | 'class' | 'attributes' | 'abilities' | 'equipment' | 'review';

export type AdvisorStep = {
  id: AdvisorStepId;
  intro: string;
  text: string;
  placeholder: string;
};

export type AdvisorMood = 'idle' | 'greeting' | 'thinking' | 'speaking' | 'happy' | 'error' | 'curious' | 'playful';
