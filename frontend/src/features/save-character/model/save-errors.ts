import {ApiError, getRequestError} from '../../../shared/api/http';

export type SaveIssue = {path: string; message: string; step: string};

export function getSaveIssues(error: unknown): SaveIssue[] {
  if (!(error instanceof ApiError) || error.status !== 422) return [];
  const value = error.details;
  if (!value || typeof value !== 'object' || !('issues' in value) || !Array.isArray(value.issues)) return [];
  return value.issues.flatMap((issue: unknown) => {
    if (!issue || typeof issue !== 'object' || !('path' in issue) || !('message' in issue)
      || typeof issue.path !== 'string' || typeof issue.message !== 'string') return [];
    const section = issue.path.split('.')[0];
    const step = ['appearance', 'race', 'class', 'attributes', 'abilities', 'equipment'].includes(section)
      ? section : 'review';
    return [{path: issue.path, message: issue.message, step}];
  });
}

export function getSaveMessage(error: unknown): string {
  if (error instanceof Error && !(error instanceof ApiError) && ['Заполните', 'Изображение', 'Не удалось подготовить'].some((prefix) => error.message.startsWith(prefix))) return error.message;
  return getRequestError(error);
}
