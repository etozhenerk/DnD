export interface Campaign {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  summary: string;
  campaignGoal: string;
  partyCharacterIds: string[];
  completedChronicle?: {
    template: string;
    statusLabel: string;
    completedSummary: string;
    finalResult: string;
    story: string[];
    trials: {id: string; title: string; locationId: string; result: string}[];
    defeatedEnemies: {enemyId: string; count: number; outcome: string}[];
    restored: {id: string; title: string; result: string}[];
  };
  locations: {id: string; order: number; name: string; mapLabel: string; summary: string}[];
  enemies: {id: string; name: string; tier: string; hp: number; ac: number; defeat?: string}[];
  ending: {readAloud: string; epilogues: string[]; reward: string};
}
