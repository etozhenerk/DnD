import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {startCharacterDraft, useDraftSession} from '../../../entities/character-draft';
import {getRequestError} from '../../../shared/api/http';

type StartState = {status: 'idle' | 'pending'} | {status: 'error'; message: string};

export function useStartCharacter() {
  const navigate = useNavigate();
  const session = useDraftSession();
  const [state, setState] = useState<StartState>({status: 'idle'});
  const mounted = useRef(true);
  const busy = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false;};
  }, []);

  const start = async () => {
    if (busy.current) return;
    busy.current = true;
    setState({status: 'pending'});
    try {
      await startCharacterDraft();
      if (mounted.current) navigate('/characters/new/appearance');
    } catch (error) {
      if (mounted.current) setState({status: 'error', message: getRequestError(error)});
    } finally {
      busy.current = false;
      if (mounted.current) setState((current) => current.status === 'pending' ? {status: 'idle'} : current);
    }
  };

  let label = session ? 'Продолжить черновик' : 'Создать персонажа';
  if (state.status === 'pending') label = 'Открываем черновик…';
  return {state, label, start};
}
