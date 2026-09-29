export const PROP_ROOM_SCEPTER_CHECK_IDS = [
  'recover-pussy-scepter-with-tiny-linda',
  'recover-pussy-scepter-with-engineering',
  'recover-pussy-scepter',
] as const;

export type PropRoomScepterCheckId = (typeof PROP_ROOM_SCEPTER_CHECK_IDS)[number];

export type PropRoomScepterResolution =
  | {kind: 'blocked'}
  | {kind: 'recovered'; methodFlag: string}
  | {kind: 'force-only'; failedFlag: string}
  | {kind: 'combat'; failedFlag: 'prop-room-strength-failed'};

export function isPropRoomScepterCheckId(checkId: string): checkId is PropRoomScepterCheckId {
  return PROP_ROOM_SCEPTER_CHECK_IDS.includes(checkId as PropRoomScepterCheckId);
}

export function canAttemptPropRoomScepterCheck(
  flags: Record<string, boolean>,
  checkId: PropRoomScepterCheckId,
): boolean {
  if (flags['scepter-recovered'] || flags['prop-room-carriers-awakened']) return false;
  if (flags['prop-room-strength-failed'] && checkId === 'recover-pussy-scepter') return false;
  if (
    flags['prop-room-force-only']
    && checkId !== 'recover-pussy-scepter'
  ) return false;
  if (
    flags['prop-room-engineering-failed']
    && checkId === 'recover-pussy-scepter-with-engineering'
  ) return false;
  if (
    flags['prop-room-linda-failed']
    && checkId === 'recover-pussy-scepter-with-tiny-linda'
  ) return false;
  return true;
}

export function resolvePropRoomScepterCheck(
  flags: Record<string, boolean>,
  checkId: PropRoomScepterCheckId,
  success: boolean,
): PropRoomScepterResolution {
  if (!canAttemptPropRoomScepterCheck(flags, checkId)) return {kind: 'blocked'};
  if (success) {
    return {
      kind: 'recovered',
      methodFlag: checkId === 'recover-pussy-scepter'
        ? 'prop-room-scepter-recovered-by-strength'
        : checkId === 'recover-pussy-scepter-with-engineering'
          ? 'prop-room-scepter-recovered-by-lambert'
          : 'prop-room-scepter-recovered-by-linda',
    };
  }
  if (checkId === 'recover-pussy-scepter') {
    return {kind: 'combat', failedFlag: 'prop-room-strength-failed'};
  }
  return {
    kind: 'force-only',
    failedFlag: checkId === 'recover-pussy-scepter-with-engineering'
      ? 'prop-room-engineering-failed'
      : 'prop-room-linda-failed',
  };
}
