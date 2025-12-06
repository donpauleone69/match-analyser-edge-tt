/**
 * UI to Database Mappers
 * 
 * Functions that transform UI model data to database model data.
 * These are NOT business logic derivations - they are data format conversions
 * between the presentation layer (UI) and persistence layer (DB).
 * 
 * All functions are deterministic transformations with no business logic.
 */

import type { 
  TablePosition,
  ShotIntent,
  ShotResult,
  ServeSpinFamily,
  ServeLength,
  RallyEndRole,
} from '../../types'

// =============================================================================
// DIRECTION TRANSFORMATIONS
// =============================================================================

/**
 * Parse UI direction string into origin and destination.
 * 
 * UI Format: "left_mid", "mid_right", etc.
 * DB Format: separate shot_origin and shot_destination fields
 * 
 * @param direction - Combined direction string from UI
 * @returns Object with separate origin and destination
 */
export function mapDirectionToOriginDestination(
  direction: string | null | undefined
): {
  shot_origin: TablePosition | null
  shot_destination: TablePosition | null
} {
  if (!direction) return { shot_origin: null, shot_destination: null }
  
  const parts = direction.split('_') as [string, string]
  
  const toPosition = (str: string): TablePosition | null => {
    if (str === 'left') return 'left'
    if (str === 'right') return 'right'
    if (str === 'mid') return 'mid'
    return null
  }
  
  return {
    shot_origin: toPosition(parts[0]),
    shot_destination: toPosition(parts[1]),
  }
}

/**
 * Extract destination from direction string.
 * Helper for getting ending position only.
 * 
 * @param direction - Direction string like "left_mid"
 * @returns The destination part (e.g., "mid")
 */
export function extractDestinationFromDirection(
  direction: string | null | undefined
): TablePosition | null {
  if (!direction) return null
  
  const parts = direction.split('_')
  const dest = parts[1]
  
  if (dest === 'left') return 'left'
  if (dest === 'right') return 'right'
  if (dest === 'mid') return 'mid'
  return null
}

/**
 * Combine origin and destination into UI direction string.
 * Reverse of mapDirectionToOriginDestination.
 * 
 * @param origin - Shot origin position
 * @param destination - Shot destination position
 * @returns Combined direction string for UI
 */
export function mapOriginDestinationToDirection(
  origin: TablePosition | null,
  destination: TablePosition | null
): string | null {
  if (!origin || !destination) return null
  return `${origin}_${destination}`
}

// =============================================================================
// SERVE TRANSFORMATIONS
// =============================================================================

/**
 * Map UI serve length to DB serve_length.
 * 
 * UI: 'short' | 'halflong' | 'deep'
 * DB: 'short' | 'half_long' | 'long'
 */
export function mapServeLengthUIToDB(
  uiLength: 'short' | 'halflong' | 'deep' | null | undefined
): ServeLength | null {
  if (!uiLength) return null
  
  if (uiLength === 'short') return 'short'
  if (uiLength === 'halflong') return 'half_long'
  if (uiLength === 'deep') return 'long'
  
  return null
}

/**
 * Map DB serve_length to UI length.
 * Reverse of mapServeLengthUIToDB.
 */
export function mapServeLengthDBToUI(
  dbLength: ServeLength | null | undefined
): 'short' | 'halflong' | 'deep' | null {
  if (!dbLength) return null
  
  if (dbLength === 'short') return 'short'
  if (dbLength === 'half_long') return 'halflong'
  if (dbLength === 'long') return 'deep'
  
  return null
}

/**
 * Map UI serve spin to DB serve_spin_family.
 * 
 * UI: 'underspin' | 'nospin' | 'topspin'
 * DB: 'under' | 'no_spin' | 'top' | 'side'
 */
export function mapServeSpinUIToDB(
  uiSpin: 'underspin' | 'nospin' | 'topspin' | null | undefined
): ServeSpinFamily | null {
  if (!uiSpin) return null
  
  if (uiSpin === 'underspin') return 'under'
  if (uiSpin === 'nospin') return 'no_spin'
  if (uiSpin === 'topspin') return 'top'
  
  return null
}

/**
 * Map DB serve_spin_family to UI spin.
 * Reverse of mapServeSpinUIToDB.
 */
export function mapServeSpinDBToUI(
  dbSpin: ServeSpinFamily | null | undefined
): 'underspin' | 'nospin' | 'topspin' | null {
  if (!dbSpin) return null
  
  if (dbSpin === 'under') return 'underspin'
  if (dbSpin === 'no_spin') return 'nospin'
  if (dbSpin === 'top') return 'topspin'
  // 'side' has no UI equivalent in current system
  
  return null
}

// =============================================================================
// STROKE/WING TRANSFORMATIONS
// =============================================================================

/**
 * Map UI stroke to DB wing.
 * 
 * UI: 'forehand' | 'backhand'
 * DB: 'FH' | 'BH'
 */
export function mapStrokeUIToDB(
  uiStroke: 'forehand' | 'backhand' | null | undefined
): 'FH' | 'BH' | null {
  if (!uiStroke) return null
  
  return uiStroke === 'forehand' ? 'FH' : 'BH'
}

/**
 * Map DB wing to UI stroke.
 * Reverse of mapStrokeUIToDB.
 */
export function mapWingDBToUI(
  dbWing: 'FH' | 'BH' | null | undefined
): 'forehand' | 'backhand' | null {
  if (!dbWing) return null
  
  return dbWing === 'FH' ? 'forehand' : 'backhand'
}

// =============================================================================
// SHOT QUALITY TRANSFORMATIONS
// =============================================================================

/**
 * Map UI shot quality to DB shot_result.
 * 
 * UI: 'average' | 'high'
 * DB: 'average' | 'good'
 */
export function mapShotQualityUIToDB(
  uiQuality: 'average' | 'high' | null | undefined
): 'average' | 'good' | null {
  if (!uiQuality) return null
  
  return uiQuality === 'high' ? 'good' : 'average'
}

/**
 * Map DB shot_result to UI shot quality.
 * Reverse of mapShotQualityUIToDB.
 * Only handles quality results, not errors.
 */
export function mapShotResultDBToUI(
  dbResult: ShotResult | null | undefined
): 'average' | 'high' | null {
  if (!dbResult) return null
  
  // Only map quality results
  if (dbResult === 'good') return 'high'
  if (dbResult === 'average') return 'average'
  
  // Error results (in_net, missed_long) don't have UI quality equivalent
  return null
}

// =============================================================================
// ERROR TYPE TRANSFORMATIONS
// =============================================================================

/**
 * Map UI error type to DB rally_end_role.
 * 
 * UI: 'forced' | 'unforced'
 * DB: 'forced_error' | 'unforced_error'
 */
export function mapErrorTypeUIToDB(
  uiErrorType: 'forced' | 'unforced' | null | undefined
): 'forced_error' | 'unforced_error' | null {
  if (!uiErrorType) return null
  
  return uiErrorType === 'forced' ? 'forced_error' : 'unforced_error'
}

/**
 * Map DB rally_end_role to UI error type.
 * Reverse of mapErrorTypeUIToDB.
 */
export function mapRallyEndRoleDBToUI(
  dbRole: RallyEndRole | null | undefined
): 'forced' | 'unforced' | null {
  if (!dbRole) return null
  
  if (dbRole === 'forced_error') return 'forced'
  if (dbRole === 'unforced_error') return 'unforced'
  
  // Other roles (winner, service_fault, receive_error, none) don't map to error types
  return null
}

// =============================================================================
// INTENT TRANSFORMATIONS
// =============================================================================

/**
 * Map UI intent to DB intent (pass-through, but explicit for consistency).
 * 
 * UI and DB use same values: 'defensive' | 'neutral' | 'aggressive'
 */
export function mapIntentUIToDB(
  uiIntent: ShotIntent | null | undefined
): ShotIntent | null {
  if (!uiIntent) return null
  return uiIntent
}

// =============================================================================
// PLAYER ID TRANSFORMATIONS
// =============================================================================

/**
 * Map UI player identifier to DB player_id.
 * 
 * UI: 'player1' | 'player2' (generic)
 * DB: Actual player UUID/ID from match context
 */
export function mapPlayerUIToDB(
  uiPlayerId: 'player1' | 'player2',
  player1Id: string,
  player2Id: string
): string {
  return uiPlayerId === 'player1' ? player1Id : player2Id
}

/**
 * Map DB player_id to UI player identifier.
 * Reverse of mapPlayerUIToDB.
 */
export function mapPlayerDBToUI(
  dbPlayerId: string,
  player1Id: string,
  player2Id: string
): 'player1' | 'player2' | null {
  if (dbPlayerId === player1Id) return 'player1'
  if (dbPlayerId === player2Id) return 'player2'
  return null
}

