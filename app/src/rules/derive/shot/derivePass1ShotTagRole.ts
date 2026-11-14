/**
 * Derive which Pass 1 Focus tags a shot may carry from its role in the rally.
 *
 * ONE source of truth: the same allow-list drives the UI pills and the DB
 * save strip, so a shot can never store a tag the UI would not offer.
 *
 * Pure — no React, no IO.
 *
 * Pass 1 compulsory: wing / pivot / stroke on FA, reply, and non-serve end;
 * High on ball-before; Safe on first attack; Initiative on reply.
 * MA-74 optional Rally Focus fields (by RF role): spin / placement / depth /
 * Weak·Heavy on serve & pre-offensive; contact / quality on first attack;
 * wing / stroke / initiative on later shots as RF allows.
 */

import {
  allowInitiativeForLaterShot,
  allowListForRole,
  deriveShotTagRole,
} from './deriveShotTagRole'

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
  /** Rally Focus optionals (MA-74) — optional stage only. */
  shot_spin: boolean
  shot_placement: boolean
  shot_depth: boolean
  shot_contact: boolean
  shot_quality: boolean
  shot_is_weak: boolean
  shot_is_heavy: boolean
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
  shot_spin: false,
  shot_placement: false,
  shot_depth: false,
  shot_contact: false,
  shot_quality: false,
  shot_is_weak: false,
  shot_is_heavy: false,
}

/**
 * Allow-list for a shot in a Pass 1 rally (compulsory + MA-74 RF optionals).
 *
 * Pass 1 base:
 * - High: ball immediately before the attack (fos - 1), also via RF attributes.
 * - Safe: first attack only.
 * - Wing + Pivot + stroke: first attack, reply, non-serve end.
 * - Initiative: reply (including when reply is end).
 *
 * Rally Focus merge (optional stage):
 * - Serve: spin, placement, depth, Weak/High/Heavy
 * - Pre-offensive: wing, placement, depth, Weak/High/Heavy
 * - First attack: contact, quality
 * - Later: wing, stroke; initiative when RF allows (fos+1/+2, not end)
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

  const rfRole = deriveShotTagRole(shotIndex, fos)
  const rf = allowListForRole(rfRole)
  const rfInitiative =
    rf.shot_initiative &&
    fos !== null &&
    allowInitiativeForLaterShot(shotIndex, fos, endIndex)

  return {
    shot_wing: hasWing || rf.shot_wing,
    shot_is_pivot: hasWing,
    shot_stroke: hasWing || rf.shot_stroke,
    shot_initiative: isReply || rfInitiative,
    shot_is_high: isBallBeforeAttack || rf.attributes,
    shot_is_safe: isFirstAttack,
    shot_spin: rf.shot_spin,
    shot_placement: rf.shot_placement,
    shot_depth: rf.shot_depth,
    shot_contact: rf.shot_contact,
    shot_quality: rf.shot_quality,
    shot_is_weak: rf.attributes,
    shot_is_heavy: rf.attributes,
  }
}
