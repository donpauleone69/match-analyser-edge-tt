/**
 * Derive shot phase from first-attack index (100% deterministic)
 *
 * Phases:
 * - serve: shot 1
 * - pre_offensive: after serve, before first attack (or all remaining if no attack)
 * - first_offensive: shot_index === first_attack_index
 * - fos_plus_1 / fos_plus_2: the two shots after the first attack
 * - continuation: anything after fos_plus_2
 */

export type ShotPhase =
  | 'serve'
  | 'pre_offensive'
  | 'first_offensive'
  | 'fos_plus_1'
  | 'fos_plus_2'
  | 'continuation'

/**
 * Derive the coaching phase for a shot within a rally.
 *
 * @param shotIndex - 1-based shot index
 * @param firstAttackIndex - Rally Focus FOS stamp, or null when nobody attacked
 */
export function deriveShotPhase(
  shotIndex: number,
  firstAttackIndex: number | null
): ShotPhase {
  if (shotIndex <= 1) return 'serve'

  if (firstAttackIndex === null || firstAttackIndex < 2) {
    return 'pre_offensive'
  }

  if (shotIndex < firstAttackIndex) return 'pre_offensive'
  if (shotIndex === firstAttackIndex) return 'first_offensive'
  if (shotIndex === firstAttackIndex + 1) return 'fos_plus_1'
  if (shotIndex === firstAttackIndex + 2) return 'fos_plus_2'
  return 'continuation'
}

/**
 * Human-readable label for viewers and cards.
 */
export function describeShotPhase(phase: ShotPhase): string {
  switch (phase) {
    case 'serve':
      return 'Serve'
    case 'pre_offensive':
      return 'Pre-offensive'
    case 'first_offensive':
      return 'First offensive'
    case 'fos_plus_1':
      return 'FOS+1'
    case 'fos_plus_2':
      return 'FOS+2'
    case 'continuation':
      return 'Continuation'
  }
}
