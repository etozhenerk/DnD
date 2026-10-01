import {useEffect, useRef, useState} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import type {CharacterFormData, FormValidation} from '../../../entities/character-form';
import {createdCharacterQuery, characterListQuery, listCreatedCharacters} from '../../../entities/character';
import {createCharacter} from '../api/create-character';
import {getSaveAttempt} from './submission';
import type {SaveAttempt} from './submission';
import {getSaveIssues, getSaveMessage} from './save-errors';

export function useSaveCharacter(formData: CharacterFormData, validation: FormValidation) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const attempt = useRef<SaveAttempt | null>(null);
  const locked = useRef(false);
  const active = useRef(true);
  const [preparationError, setPreparationError] = useState<unknown>(null);
  const mutation = useMutation({mutationFn: createCharacter, retry: false});
  const {reset} = mutation;
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  useEffect(() => {
    if (!locked.current) { reset(); setPreparationError(null); }
  }, [formData, reset]);

  async function save() {
    if (locked.current || !validation.valid) return;
    locked.current = true;
    setPreparationError(null);
    try {
      try {
        attempt.current = getSaveAttempt(formData, attempt.current);
      } catch (error) {
        setPreparationError(error);
        return;
      }
      const character = await mutation.mutateAsync(attempt.current.submission);
      queryClient.setQueryData(createdCharacterQuery(character.id).queryKey, character);
      await queryClient.invalidateQueries({queryKey: ['characters', 'list'], refetchType: 'none'});
      // Read through any other container's list cache after the committed write.
      void queryClient.fetchQuery({
        ...characterListQuery(0, 21), staleTime: 0,
        queryFn: ({signal}) => listCreatedCharacters(0, 21, signal, true),
      }).catch(() => { /* A list failure cannot turn a committed save into a failed save. */ });
      if (active.current) navigate('/characters/' + character.id);
    } catch {
      // Mutation keeps the public error; the same unchanged form reuses its request ID.
    } finally {
      locked.current = false;
    }
  }

  const error = preparationError ?? mutation.error;
  return {
    save, isPending: mutation.isPending, canSave: validation.valid,
    error: error ? getSaveMessage(error) : null,
    issues: getSaveIssues(mutation.error),
  };
}

export type SaveCharacterController = ReturnType<typeof useSaveCharacter>;
