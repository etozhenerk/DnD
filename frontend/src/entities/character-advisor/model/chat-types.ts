import type {AdvisorProposal} from './proposal-types';
import type {AdvisorStepId} from './types';

export type AdvisorContext = {
  stepId: AdvisorStepId;
  name: string;
  raceId: string;
  classId: string;
  concept: string;
  formData?: Record<string, unknown>;
};

export type AdvisorMode = 'chat' | 'comment' | 'suggest' | 'fill' | 'portrait' | 'icon';
export type AdvisorInput = {requestId: string; message: string; context: AdvisorContext; mode?: AdvisorMode; target?: string};
export type AdvisorTurn = {
  requestId: string;
  message: string;
  reply: string;
  proposal?: AdvisorProposal;
  mode: AdvisorMode;
  target?: string;
  image?: {requestId: string; kind: 'portrait' | 'icon'; target?: string; mimeType: string};
  action?: {requestId: string; kind: 'portrait' | 'icon'; prompt: string; target?: string};
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
