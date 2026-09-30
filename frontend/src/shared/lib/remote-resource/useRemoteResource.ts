import {useEffect, useState} from 'react';
import {getRequestError} from '../../api/http';
import type {RemoteResource} from './types';

export function useRemoteResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<{load: typeof load; state: RemoteResource<T>}>(
    {load, state: {status: 'loading'}},
  );

  useEffect(() => {
    const controller = new AbortController();
    setSnapshot({load, state: {status: 'loading'}});
    load(controller.signal).then(
      (data) => {if (!controller.signal.aborted) setSnapshot({load, state: {status: 'ready', data}});},
      (error: unknown) => {
        if (!controller.signal.aborted) setSnapshot({load, state: {status: 'error', message: getRequestError(error)}});
      },
    );
    return () => controller.abort();
  }, [load, attempt]);

  const state: RemoteResource<T> = snapshot.load === load ? snapshot.state : {status: 'loading'};
  return {state, retry: () => setAttempt((value) => value + 1)};
}
