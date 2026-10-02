import {readProposal} from './read-proposal';
import {ApiError} from '../../../shared/api/http';
import type {AdvisorSession, AdvisorTurn} from '../model/chat-types';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  return value as Record<string, unknown>;
}

function invalid() {
  return new ApiError('Советник принёс неполный ответ. Проверь диалог ещё раз.', 502, 'invalid_advisor_response');
}

export function readAvailability(value: unknown) {
  const data = object(value);
  const capabilities = object(data.capabilities);
  if (data.version !== 'character-advisor-v1' || typeof capabilities.chat !== 'boolean') throw invalid();
  return {chat: capabilities.chat, fillCharacter: capabilities.fillCharacter === true,
    proactiveComments: capabilities.proactiveComments === true, images: capabilities.images === true};
}

export function readCreatedSession(value: unknown) {
  const data = object(value);
  if (typeof data.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(data.token)) throw invalid();
  return {token: data.token, session: readSession(data.session)};
}

export function readSession(value: unknown): AdvisorSession {
  const data = object(value);
  if (typeof data.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(data.id)
    || typeof data.expiresAt !== 'string' || !Number.isFinite(Date.parse(data.expiresAt))
    || data.budgetMicroRub !== 200000000 || !money(data.accountedMicroRub)
    || !Array.isArray(data.turns) || data.turns.length > 100) throw invalid();
  return {id: data.id, expiresAt: data.expiresAt, budgetMicroRub: data.budgetMicroRub,
    accountedMicroRub: data.accountedMicroRub, turns: data.turns.map(readTurn)};
}

function readTurn(value: unknown): AdvisorTurn {
  const data = object(value);
  const modes = ['chat', 'comment', 'suggest', 'fill', 'portrait', 'icon'] as const;
  const mode = modes.find((item) => item === (data.mode ?? 'chat'));
  if (!mode || (data.target !== undefined && typeof data.target !== 'string')) throw invalid();
  if (typeof data.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(data.requestId)
    || typeof data.message !== 'string' || [...data.message].length > 2000
    || typeof data.reply !== 'string' || [...data.reply].length > 16000
    || (data.status !== 'reserved' && data.status !== 'succeeded' && data.status !== 'uncertain')
    || !money(data.accountedMicroRub) || typeof data.createdAt !== 'string'
    || !Number.isFinite(Date.parse(data.createdAt))) throw invalid();
  const image = data.image === undefined ? undefined : object(data.image);
  const action = data.action === undefined ? undefined : object(data.action);
  if (action && (typeof action.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(action.requestId)
    || (action.kind !== 'portrait' && action.kind !== 'icon') || typeof action.prompt !== 'string' || !action.prompt.trim() || [...action.prompt].length > 500
    || (action.target !== undefined && (typeof action.target !== 'string' || action.target.length > 80))
    || (action.kind === 'icon' && !action.target) || (action.kind === 'portrait' && action.target))) throw invalid();
  if (image && (image.requestId !== data.requestId || (image.kind !== 'portrait' && image.kind !== 'icon')
    || (image.mimeType !== 'image/jpeg' && image.mimeType !== 'image/png') || (image.target !== undefined && typeof image.target !== 'string'))) throw invalid();
  return {requestId: data.requestId, message: data.message, reply: data.reply, proposal: readProposal(data.proposal), mode,
    target: typeof data.target === 'string' ? data.target : undefined,
    image: image ? {requestId: data.requestId, kind: image.kind === 'portrait' ? 'portrait' : 'icon', mimeType: String(image.mimeType), target: typeof image.target === 'string' ? image.target : undefined} : undefined,
    action: action ? {requestId: String(action.requestId), kind: action.kind === 'portrait' ? 'portrait' : 'icon', prompt: String(action.prompt), target: typeof action.target === 'string' ? action.target : undefined} : undefined,
    status: data.status, accountedMicroRub: data.accountedMicroRub, createdAt: data.createdAt};
}

function money(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
