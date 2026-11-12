/**
 * Derive which Pass 1 Focus tags a shot may carry from its role in the rally.
 *
 * ONE source of truth: the same allow-list drives the UI pills and the DB
 * save strip, so a shot can never store a tag the UI would not offer.
 *
 * Pure — no React, no IO.
 *
 * Pass 1 only captures: wing, pivot, stroke, initiative (reply "standing"),
 * high (ball before the attack) and safe (first attack).
 * Previous-shot placement is inferred from wing + pivot on save — not a UI tag.
 * Spin / depth / contact / quality / weak / heavy are never allowed in Pass 1.
 */

export type Pass1ShotTagRole =
  | 'serve'
  /** Shot 2..fos-2 (or any non-serve shot before the end when nobody attacked). */
  | 'before_attack'
  /** shotIndex === firstAttackIndex - 1 (includes the serve when FOS = 2). */
  | 'ball_before_attack'
  | 'first_attack'
  /** firstAttackIndex + 1 */
  | 'reply'
  | 'later'
  /**
   * Last shot of the rally (endIndex > 1). Takes precedence over every role
   * except `first_attack`, because wing + stroke are always captured on an end
   * shot. When the end is also the reply, initiative stays allowed via the
   * allow-list (role may still read as `end_shot` for the stroke menu).
   */
  | 'end_shot'

export interface Pass1ShotTagAllowList {
  shot_wing: boolean
  /** Shown with wing; encodes crossed-side play (previous placement inferred). */
  shot_is_pivot: boolean
  shot_stroke: boolean
  shot_initiative: boolean
  shot_is_high: boolean
  shot_is_safe: boolean
}

/**
 * Normalise first-attack index: must be a real contact after the serve and,
 * when the end is known, not beyond it. Otherwise treated as "no attack".
 */
function normaliseFirstAttack(
  firstAttackIndex: number | null,
  endIndex: number | null
): number | null {
  if (typeof firstAttackIndex !== 'number') return null
  if (!Number.isFinite(firstAttackIndex) || firstAttackIndex < 2) return null
  if (typeof endIndex === 'number' && firstAttackIndex > endIndex) return null
  return firstAttackIndex
}

/** True when this shot is the last of the rally and is not the serve. */
function isNonServeEndShot(shotIndex: number, endIndex: number | null): boolean {
  return typeof endIndex === 'number' && endIndex > 1 && shotIndex === endIndex
}

/**
 * Role of shotIndex within a Pass 1 rally.
 *
 * @param shotIndex - 1-based
 * @param firstAttackIndex - FOS stamp, or null when nobody attacked
 * @param endIndex - last shot of the rally, or null while unmarked
 */
export function derivePass1ShotTagRole(
  shotIndex: number,
  firstAttackIndex: number | null,
  endIndex: number | null = null
): Pass1ShotTagRole {
  const fos = normaliseFirstAttack(firstAttackIndex, endIndex)

  if (fos !== null && shotIndex === fos) return 'first_attack'
  if (isNonServeEndShot(shotIndex, endIndex)) return 'end_shot'
  if (fos !== null && shotIndex === fos + 1) return 'reply'
  if (fos !== null && shotIndex === fos - 1) return 'ball_before_attack'
  if (shotIndex <= 1) return 'serve'
  if (fos === null || shotIndex < fos) return 'before_attack'
  return 'later'
}

const NONE_ALLOW: Pass1ShotTagAllowList = {
  shot_wing: false,
  shot_is_pivot: false,
  shot_stroke: false,
  shot_initiative: false,
  shot_is_high: false,
  shot_is_safe: false,
}

/**
 * Allow-list for a shot in a Pass 1 rally.
 *
 * - High: only on the ball immediately before the attack (fos - 1).
 * - Safe: only on the first attack.
 * - Wing + Pivot + stroke: first attack, reply (fos + 1), and any end shot that
 *   is not the serve (includes end shots before an attack, e.g. push rallies).
 * - Initiative: on the reply (fos + 1), including when that reply is also the end.
 * - Everything else: false.
 *
 * @param shotIndex - 1-based
 * @param firstAttackIndex - FOS stamp, or null when nobody attacked
 * @param endIndex - last shot of the rally, or null while unmarked
 */
export function derivePass1ShotTagAllowList(
  shotIndex: number,
  firstAttackIndex: number | null,
  endIndex: number | null
): Pass1ShotTagAllowList {
  if (!Number.isFinite(shotIndex) || shotIndex < 1) return { ...NONE_ALLOW }

  const fos = normaliseFirstAttack(firstAttackIndex, endIndex)
  const isFirstAttack = fos !== null && shotIndex === fos
  const isReply = fos !== null && shotIndex === fos + 1
  const isBallBeforeAttack = fos !== null && shotIndex === fos - 1
  const isEnd = isNonServeEndShot(shotIndex, endIndex)

  const hasWing = isFirstAttack || isReply || isEnd
  return {
    shot_wing: hasWing,
    shot_is_pivot: hasWing,
    shot_stroke: hasWing,
    shot_initiative: isReply,
    shot_is_high: isBallBeforeAttack,
    shot_is_safe: isFirstAttack,
  }
}
