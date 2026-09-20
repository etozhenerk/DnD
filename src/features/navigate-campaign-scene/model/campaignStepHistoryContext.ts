import {createContext} from 'react';

export const CampaignStepHistoryContext = createContext<{
  stepBack: (fallback?: () => void) => boolean;
} | null>(null);
