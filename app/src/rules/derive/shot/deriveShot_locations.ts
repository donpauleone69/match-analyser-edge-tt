/**
 * Derive shot origin and destination (100% deterministic)
 * 
 * Logic:
 * - Shot 1 (serve): Parse serve_direction (e.g., 'left_right' → origin: left, destination: right)
 * - Shot 2+ (rally): Previous shot_destination becomes current shot_origin
 *                    Current shot_direction parsed for destination
 * 
 * Database Fields Populated:
 * - shots.shot_origin
 * - shots.shot_destination
 */

export type TablePosition = 'left' | 'mid' | 'right'
export type ShotDestination = TablePosition | 'in_net' | 'missed_long' | 'missed_wide' | null

export interface ShotLocationInput {
  shot_index: number
  serve_direction?: string | null
  shot_direction?: string | null
}

export interface PreviousShotInput {
  shot_destination?: ShotDestination
}

export interface DerivedShotLocations {
  shot_origin: TablePosition | null
  shot_destination: ShotDestination
}

/**
 * Derive shot_origin and shot_destination from direction data.
 * 
 * @param shot - Current shot with direction information
 * @param previousShot - Previous shot (for shots 2+), null for shot 1
 * @returns Object with shot_origin and shot_destination
 */
export function deriveShot_locations(
  shot: ShotLocationInput,
  previousShot: PreviousShotInput | null
): DerivedShotLocations {
  // Shot 1 (serve): Use serve_direction
  if (shot.shot_index === 1) {
    if (!shot.serve_direction) {
      return { shot_origin: null, shot_destination: null }
    }
    
    const [origin, destination] = shot.serve_direction.split('_') as [string, string]
    return {
      shot_origin: origin as TablePosition,
      shot_destination: destination as ShotDestination
    }
  }
  
  // Shots 2+: Origin from previous destination, destination from current direction
  if (!previousShot || !shot.shot_direction) {
    return { shot_origin: null, shot_destination: null }
  }
  
  // Previous shot's destination is where the ball landed
  // = Where current player is hitting from
  const shot_origin = previousShot.shot_destination as TablePosition | null
  
  // Parse current shot direction (format: "origin_destination")
  const [_ignoredOrigin, destination] = shot.shot_direction.split('_') as [string, string]
  
  return {
    shot_origin,
    shot_destination: destination as ShotDestination
  }
}

/**
 * Helper: Extract destination from direction string.
 * Used for getting the ending position from a direction.
 * 
 * @param direction - Direction string like "left_mid"
 * @returns The destination part (e.g., "mid")
 */
export function extractDestinationFromDirection(
  direction: string | null | undefined
): TablePosition | null {
  if (!direction) return null
  
  const parts = direction.split('_')
  return parts[1] as TablePosition || null
}

