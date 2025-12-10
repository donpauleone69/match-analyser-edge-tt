/**
 * Derive shot rally_end_role (100% deterministic)
 * 
 * Logic:
 * - If shot doesn't end rally → 'none'
 * - Shot 1 (serve) + error → 'service_fault'
 * - Shot 2 (receive) + error → 'receive_error' (always unforced)
 * - Shot 3+ + error + errorType provided → 'forced_error' or 'unforced_error'
 * - No error (opponent couldn't return) → 'winner'
 * 
 * Database Field Populated:
 * - shots.rally_end_role
 */

import type { RallyEndRole } from '@/data'

export interface ShotForRallyEndRole {
  shot_index: number
  shot_result?: string | null
  is_rally_end: boolean
}

/**
 * Derive rally_end_role for a shot.
 * 
 * @param shot - Shot information
 * @param errorType - For shot 3+, whether error was 'forced' or 'unforced' (user input)
 * @returns The rally_end_role value
 */
export function deriveShot_rally_end_role(
  shot: ShotForRallyEndRole,
  errorType?: 'forced' | 'unforced' | null
): RallyEndRole {
  // If shot doesn't end rally, role is 'none'
  if (!shot.is_rally_end) {
    return 'none'
  }
  
  // Check if shot is an error: shot_result !== 'in_play' means error occurred
  const isError = shot.shot_result && shot.shot_result !== 'in_play'
  
  if (isError) {
    // Shot 1: Service fault (unforced error)
    if (shot.shot_index === 1) {
      return 'unforced_error'
    }
    
    // Shot 2: Receive error (always unforced)
    if (shot.shot_index === 2) {
      return 'unforced_error'
    }
    
    // Shot 3+: Use provided errorType
    if (errorType === 'forced') {
      return 'forced_error'
    } else if (errorType === 'unforced') {
      return 'unforced_error'
    }
    
    // If no errorType provided for shot 3+ error, default to unforced
    // (This shouldn't happen in normal flow, user should specify)
    return 'unforced_error'
  }
  
  // No error: Shot was a winner (opponent couldn't return)
  return 'winner'
}

/**
 * Simple helper to map UI error type strings to rally_end_role.
 * Used when converting from UI model to DB model.
 * 
 * @param errorType - 'forced' or 'unforced' from UI
 * @returns The corresponding RallyEndRole
 */
export function mapErrorTypeToRallyEndRole(
  errorType: 'forced' | 'unforced'
): 'forced_error' | 'unforced_error' {
  return errorType === 'forced' ? 'forced_error' : 'unforced_error'
}

