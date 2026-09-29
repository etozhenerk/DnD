import {penisuelaGalleryGameplay} from './data';

export const PUSSY_TRUST_CHECK_ID = 'earn-pussy-trust' as const;
export const PUSSY_INTIMIDATION_CHECK_ID = 'intimidate-pussy' as const;
export const PUSSY_BAR_PASSES_ITEM_ID = 'pussy-sultan-bar-passes';
export const PUSSY_BAR_PASSES_QUANTITY = 3;
export const PUSSY_INTIMIDATION_DC = penisuelaGalleryGameplay.checks
  .find((check) => check.id === PUSSY_INTIMIDATION_CHECK_ID)!.dc;

const trustCheck = penisuelaGalleryGameplay.checks.find((check) => check.id === PUSSY_TRUST_CHECK_ID)!;
export const PUSSY_TRUST_EASY_HERO_IDS = trustCheck.dcOverrides?.flatMap((override) => override.heroIds) ?? [];

export type PussyAudienceCheckId =
  | typeof PUSSY_TRUST_CHECK_ID
  | typeof PUSSY_INTIMIDATION_CHECK_ID;

export function getPussyTrustDc(heroId: string): number {
  return trustCheck.dcOverrides?.find((override) => override.heroIds.includes(heroId))?.dc ?? trustCheck.dc;
}

export function canAttemptPussyAudienceCheck(
  flags: Record<string, boolean>,
  checkId: PussyAudienceCheckId,
): boolean {
  if (
    flags['pussy-path-resolved']
    || flags['pussy-guards-summoned']
    || flags['pussy-quest-accepted']
  ) return false;

  if (checkId === PUSSY_TRUST_CHECK_ID) {
    return !flags['pussy-trust-max'] && !flags['pussy-trust-refused'];
  }

  return Boolean(flags['pussy-trust-refused'])
    && !flags['pussy-intimidated'];
}

export function isPussyHostileRoute(flags: Record<string, boolean>): boolean {
  return Boolean(
    flags['pussy-hostile-route']
    || flags['pussy-quest-blocked']
    || flags['pussy-intimidated']
    || flags['pussy-guards-summoned']
    || flags['pussy-guards-defeated'],
  );
}

export function getPussyAudienceViewId(flags: Record<string, boolean>): 'intimidated' | undefined {
  return flags['pussy-intimidated']
    && !flags['pussy-guards-summoned']
    && !flags['pussy-guards-defeated']
    ? 'intimidated'
    : undefined;
}
