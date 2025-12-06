/**
 * Derive rally is_scoring (100% deterministic)
 * 
 * Logic:
 * - Let rally (net serve) → NOT scoring (is_scoring = false)
 * - All other rallies → scoring (is_scoring = true)
 * 
 * Database Field Populated:
 * - rallies.is_scoring
 */

export interface ServeInput {
  shot_index: number
  is_net_serve?: boolean
}

/**
 * Derive whether rally is scoring or a let.
 * 
 * @param firstShot - The serve (shot 1) of the rally
 * @returns true if rally awards a point, false if it's a let
 */
export function deriveRally_is_scoring(
  firstShot: ServeInput
): boolean {
  // Only shot 1 can be a net serve (let)
  if (firstShot.shot_index === 1 && firstShot.is_net_serve) {
    return false // Let - no point awarded
  }
  
  // All other rallies are scoring
  return true
}

/**
 * Check if a rally is a let (non-scoring).
 * Inverse of deriveRally_is_scoring for clarity in some contexts.
 * 
 * @param firstShot - The serve (shot 1) of the rally
 * @returns true if rally is a let, false if scoring
 */
export function isLet(firstShot: ServeInput): boolean {
  return !deriveRally_is_scoring(firstShot)
}

