export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getRequestError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Не удалось связаться с сервисом персонажей. Попробуйте ещё раз.';
}
