export type StageProgress = {
  state: 'completed' | 'current' | 'planned';
  label: string;
};

export function getStageProgress(status: string): StageProgress {
  const normalized = status.toLocaleLowerCase('ru');

  if (normalized.startsWith('заверш')) {
    return {state: 'completed', label: 'Завершён'};
  }

  if (normalized.startsWith('в работе')) {
    return {state: 'current', label: 'В работе'};
  }

  return {state: 'planned', label: 'Запланирован'};
}
