import type {AdvisorStepId} from './types';

export type AdvisorContext = {
  stepId: AdvisorStepId;
  name: string;
  raceId: string;
  classId: string;
  concept: string;
};

export type AdvisorInput = {requestId: string; message: string; context: AdvisorContext};
export type AdvisorTurn = {
  requestId: string;
  message: string;
  reply: string;
  status: 'reserved' | 'succeeded' | 'uncertain';
  accountedMicroRub: number;
  createdAt: string;
};
export type AdvisorSession = {
  id: string;
  expiresAt: string;
  budgetMicroRub: number;
  accountedMicroRub: number;
  turns: AdvisorTurn[];
};
export type AdvisorAccess = {id: string; token: string};
export type AdvisorAvailability = {chat: boolean};
