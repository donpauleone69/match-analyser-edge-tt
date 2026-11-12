/**
 * Unnamed opponent side ("Villain") until a real player is linked.
 * Stored as null on rally/shot player FK fields.
 * Runtime id may be 'villain' (current) or legacy 'them'.
 */

export const THEM_SIDE_ID = 'villain'
export const THEM_SIDE_LABEL = 'Villain'

const LEGACY_THEM_IDS = new Set(['villain', 'them'])

export function isThemSideId(id: string | null | undefined): boolean {
  return id == null || LEGACY_THEM_IDS.has(id)
}

/** Runtime / UI id → stored FK (null means Villain). */
export function toStoredPlayerId(id: string): string | null {
  return isThemSideId(id) ? null : id
}

/** Stored FK → runtime id used while tagging. */
export function fromStoredPlayerId(id: string | null | undefined): string {
  return id == null ? THEM_SIDE_ID : id
}

export function resolveOpponentId(player2Id: string | null | undefined): string {
  return player2Id ?? THEM_SIDE_ID
}

export function resolveOpponentName(
  player2Id: string | null | undefined,
  player2Name: string | null | undefined
): string {
  if (!player2Id) return THEM_SIDE_LABEL
  return player2Name?.trim() || THEM_SIDE_LABEL
}
