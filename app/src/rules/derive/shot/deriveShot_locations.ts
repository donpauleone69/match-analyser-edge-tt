/**
 * Derive shot origin and target (100% deterministic)
 * 
 * Logic:
 * - Shot 1 (serve): Parse serve_direction (e.g., 'left_right' → origin: left, target: right)
 * - Shot 2+ (rally): Previous shot_target becomes current shot_origin
 *                    Current shot_direction parsed for target
 * 
 * Database Fields Populated:
 * - shots.shot_origin
 * - shots.shot_target
 */

export type TablePosition = 'left' | 'mid' | 'right'
export type ShotTarget = TablePosition | null

export interface ShotLocationInput {
  shot_index: number
  serve_direction?: string | null
  shot_direction?: string | null
}

export interface PreviousShotInput {
  shot_target?: ShotTarget
}

export interface DerivedShotLocations {
  shot_origin: TablePosition | null
  shot_target: ShotTarget
}

/**
 * Derive shot_origin and shot_target from direction data.
 * 
 * @param shot - Current shot with direction information
 * @param previousShot - Previous shot (for shots 2+), null for shot 1
 * @returns Object with shot_origin and shot_target
 */
export function deriveShot_locations(
  shot: ShotLocationInput,
  previousShot: PreviousShotInput | null
): DerivedShotLocations {
  // Shot 1 (serve): Use serve_direction
  if (shot.shot_index === 1) {
    if (!shot.serve_direction) {
      return { shot_origin: null, shot_target: null }
    }
    
    const [origin, target] = shot.serve_direction.split('_') as [string, string]
    return {
      shot_origin: origin as TablePosition,
      shot_target: target as ShotTarget
    }
  }
  
  // Shots 2+: Origin from previous target, target from current direction
  if (!previousShot || !shot.shot_direction) {
    return { shot_origin: null, shot_target: null }
  }
  
  // Previous shot's target is where the ball landed
  // = Where current player is hitting from
  const shot_origin = previousShot.shot_target as TablePosition | null
  
  // Parse current shot direction (format: "origin_target")
  const [_ignoredOrigin, target] = shot.shot_direction.split('_') as [string, string]
  
  return {
    shot_origin,
    shot_target: target as ShotTarget
  }
}

/**
 * Helper: Extract target from direction string.
 * Used for getting the ending position from a direction.
 * 
 * @param direction - Direction string like "left_mid"
 * @returns The target part (e.g., "mid")
 */
export function extractTargetFromDirection(
  direction: string | null | undefined
): TablePosition | null {
  if (!direction) return null
  
  const parts = direction.split('_')
  return parts[1] as TablePosition || null
}

/**
 * @deprecated Use extractTargetFromDirection instead
 */
export function extractDestinationFromDirection(
  direction: string | null | undefined
): TablePosition | null {
  return extractTargetFromDirection(direction)
}

