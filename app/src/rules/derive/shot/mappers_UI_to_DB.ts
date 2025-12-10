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
  ServeSpinFamily,
  ShotLength,
  RallyEndRole,
} from '@/data/entities/shots/shot.types'

// =============================================================================
// DIRECTION TRANSFORMATIONS
// =============================================================================

/**
 * Parse UI direction string into origin and target.
 * 
 * UI Format: "left_mid", "mid_right", etc.
 * DB Format: separate shot_origin and shot_target fields
 * 
 * @param direction - Combined direction string from UI
 * @returns Object with separate origin and target
 */
export function mapDirectionToOriginTarget(
  direction: string | null | undefined
): {
  shot_origin: TablePosition | null
  shot_target: TablePosition | null
} {
  if (!direction) return { shot_origin: null, shot_target: null }
  
  const parts = direction.split('_') as [string, string]
  
  const toPosition = (str: string): TablePosition | null => {
    if (str === 'left') return 'left'
    if (str === 'right') return 'right'
    if (str === 'mid') return 'mid'
    return null
  }
  
  return {
    shot_origin: toPosition(parts[0]),
    shot_target: toPosition(parts[1]),
  }
}

/**
 * @deprecated Use mapDirectionToOriginTarget instead
 */
export function mapDirectionToOriginDestination(
  direction: string | null | undefined
): {
  shot_origin: TablePosition | null
  shot_destination: TablePosition | null
} {
  const result = mapDirectionToOriginTarget(direction)
  return {
    shot_origin: result.shot_origin,
    shot_destination: result.shot_target,
  }
}

/**
 * Extract target from direction string.
 * Helper for getting ending position only.
 * 
 * @param direction - Direction string like "left_mid"
 * @returns The target part (e.g., "mid")
 */
export function extractTargetFromDirection(
  direction: string | null | undefined
): TablePosition | null {
  if (!direction) return null
  
  const parts = direction.split('_')
  const target = parts[1]
  
  if (target === 'left') return 'left'
  if (target === 'right') return 'right'
  if (target === 'mid') return 'mid'
  return null
}

/**
 * @deprecated Use extractTargetFromDirection instead
 */
export function extractDestinationFromDirection(
  direction: string | null | undefined
): TablePosition | null {
  return extractTargetFromDirection(direction)
}

/**
 * Combine origin and target into UI direction string.
 * Reverse of mapDirectionToOriginTarget.
 * 
 * @param origin - Shot origin position
 * @param target - Shot target position
 * @returns Combined direction string for UI
 */
export function mapOriginTargetToDirection(
  origin: TablePosition | null,
  target: TablePosition | null
): string | null {
  if (!origin || !target) return null
  return `${origin}_${target}`
}

/**
 * @deprecated Use mapOriginTargetToDirection instead
 */
export function mapOriginDestinationToDirection(
  origin: TablePosition | null,
  destination: TablePosition | null
): string | null {
  return mapOriginTargetToDirection(origin, destination)
}

// =============================================================================
// SHOT LENGTH TRANSFORMATIONS (SERVE & RECEIVE)
// =============================================================================

/**
 * Map UI shot length to DB shot_length.
 * Used for both serve (shot #1) and receive (shot #2).
 * 
 * UI: 'short' | 'halflong' | 'deep'
 * DB: 'short' | 'half_long' | 'long'
 */
export function mapShotLengthUIToDB(
  uiLength: 'short' | 'halflong' | 'deep' | null | undefined
): ShotLength | null {
  if (!uiLength) return null
  
  if (uiLength === 'short') return 'short'
  if (uiLength === 'halflong') return 'half_long'
  if (uiLength === 'deep') return 'long'
  
  return null
}

/**
 * Map DB shot_length to UI length.
 * Reverse of mapShotLengthUIToDB.
 */
export function mapShotLengthDBToUI(
  dbLength: ShotLength | null | undefined
): 'short' | 'halflong' | 'deep' | null {
  if (!dbLength) return null
  
  if (dbLength === 'short') return 'short'
  if (dbLength === 'half_long') return 'halflong'
  if (dbLength === 'long') return 'deep'
  
  return null
}

/**
 * @deprecated Use mapShotLengthUIToDB instead (field renamed from serve_length to shot_length)
 */
export function mapServeLengthUIToDB(
  uiLength: 'short' | 'halflong' | 'deep' | null | undefined
): ShotLength | null {
  return mapShotLengthUIToDB(uiLength)
}

/**
 * @deprecated Use mapShotLengthDBToUI instead (field renamed from serve_length to shot_length)
 */
export function mapServeLengthDBToUI(
  dbLength: ShotLength | null | undefined
): 'short' | 'halflong' | 'deep' | null {
  return mapShotLengthDBToUI(dbLength)
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
 * Map DB shot_quality to UI shot quality (for resume/edit).
 * NOTE: This function was incorrectly named - it maps shot_quality, not shot_result.
 * shot_result = in_net | missed_long | missed_wide | in_play (outcome of shot)
 * shot_quality = high | average (quality rating for in_play shots only)
 */
export function mapShotResultDBToUI(
  dbQuality: 'high' | 'average' | null | undefined
): 'average' | 'high' | null {
  if (!dbQuality) return null
  return dbQuality // Direct pass-through since types match
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

