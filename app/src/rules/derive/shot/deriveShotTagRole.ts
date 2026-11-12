/**
 * Derive which Rally Focus tags a shot may carry from its role in the rally.
 *
 * The same allow-list drives UI pills and the DB save strip, so a shot
 * cannot store both easy-ball switches and a quality grade.
 */

export type ShotTagRole = 'serve' | 'pre_offensive' | 'first_attack' | 'later'

export interface ShotTagAllowList {
  shot_spin: boolean
  shot_wing: boolean
  shot_stroke: boolean
  shot_placement: boolean
  shot_depth: boolean
  shot_contact: boolean
  shot_initiative: boolean
  shot_quality: boolean
  /** Weak / High / Heavy toggles */
  attributes: boolean
}

const SERVE_ALLOW: ShotTagAllowList = {
  shot_spin: true,
  shot_wing: false,
  shot_stroke: false,
  shot_placement: true,
  shot_depth: true,
  shot_contact: false,
  shot_initiative: false,
  shot_quality: false,
  attributes: true,
}

const PRE_OFFENSIVE_ALLOW: ShotTagAllowList = {
  shot_spin: false,
  shot_wing: true,
  shot_stroke: false,
  shot_placement: true,
  shot_depth: true,
  shot_contact: false,
  shot_initiative: false,
  shot_quality: false,
  attributes: true,
}

const FIRST_ATTACK_ALLOW: ShotTagAllowList = {
  shot_spin: false,
  shot_wing: true,
  shot_stroke: true,
  shot_placement: false,
  shot_depth: false,
  shot_contact: true,
  shot_initiative: false,
  shot_quality: true,
  attributes: false,
}

const LATER_ALLOW: ShotTagAllowList = {
  shot_spin: false,
  shot_wing: true,
  shot_stroke: true,
  shot_placement: false,
  shot_depth: false,
  shot_contact: false,
  shot_initiative: true, // reply / next while point continues; caller may suppress on end
  shot_quality: false,
  attributes: false,
}

/**
 * Role of shotIndex within a rally given the first-attack stamp.
 *
 * @param shotIndex - 1-based
 * @param firstAttackIndex - FOS stamp, or null when nobody attacked
 */
export function deriveShotTagRole(
  shotIndex: number,
  firstAttackIndex: number | null
): ShotTagRole {
  if (shotIndex <= 1) return 'serve'

  if (firstAttackIndex === null || firstAttackIndex < 2) {
    return 'pre_offensive'
  }

  if (shotIndex < firstAttackIndex) return 'pre_offensive'
  if (shotIndex === firstAttackIndex) return 'first_attack'
  return 'later'
}

export function allowListForRole(role: ShotTagRole): ShotTagAllowList {
  switch (role) {
    case 'serve':
      return SERVE_ALLOW
    case 'pre_offensive':
      return PRE_OFFENSIVE_ALLOW
    case 'first_attack':
      return FIRST_ATTACK_ALLOW
    case 'later':
      return LATER_ALLOW
  }
}

/**
 * Whether initiative pills apply for a later shot (reply / next, point still going).
 * First two shots after the attack while the point continues.
 */
export function allowInitiativeForLaterShot(
  shotIndex: number,
  firstAttackIndex: number,
  endIndex: number | null
): boolean {
  if (shotIndex !== firstAttackIndex + 1 && shotIndex !== firstAttackIndex + 2) {
    return false
  }
  if (typeof endIndex === 'number' && shotIndex === endIndex) {
    return false
  }
  return true
}
