export type RemoteResource<T> =
  | {status: 'loading'}
  | {status: 'error'; message: string}
  | {status: 'ready'; data: T};
