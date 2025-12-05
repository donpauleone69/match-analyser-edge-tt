/**
 * Mapping Service - Convert Prototype V2 data structures to database schema
 * 
 * This bridges the gap between the tagging UI and the database
 */

import type { 
  DBRally,
  DBShot,
  TablePosition,
  ShotIntent,
  ShotResult,
} from '@/data'
import type { Phase1Rally, Phase1Shot } from '@/features/tagging-ui-prototype-v2/composers/Phase1TimestampComposer'
import { generateId } from '@/helpers/generateId'

// =============================================================================
// PHASE 1 MAPPING (Timestamp Capture ÔåÆ Database)
// =============================================================================

/**
 * Map Phase1Rally to DBRally
 */
export function mapPhase1RallyToDBRally(
  rally: Phase1Rally,
  setId: string,
  rallyIndex: number,
  player1Id: string,
  player2Id: string
): DBRally {
  // Determine winner based on end condition
  const isScoring = rally.endCondition === 'winner'
  
  // For now, winner determination will be done in Phase 2 or can be inferred
  // from the error - the player who didn't make the error wins
  let winnerId: string | null = null
  if (isScoring) {
    // Will be determined in Phase 2 or can be inferred from shot player
    winnerId = null // Placeholder
  }
  
  return {
    id: generateId(),
    set_id: setId,
    rally_index: rallyIndex,
    video_id: null, // Will be set when video is added
    server_id: rally.serverId === 'player1' ? player1Id : player2Id,
    receiver_id: rally.serverId === 'player1' ? player2Id : player1Id,
    is_scoring: isScoring,
    winner_id: winnerId,
    player1_score_after: 0, // Will be calculated
    player2_score_after: 0, // Will be calculated
    set_player1_final_score: 0, // Will be calculated
    set_player2_final_score: 0, // Will be calculated
    set_winner_id: null, // Will be calculated
    end_of_point_time: rally.endTimestamp,
    point_end_type: null, // Tagged in Phase 2
    luck_type: null,
    opponent_luck_overcome: null,
    has_video_data: true,
    is_highlight: false,
    framework_confirmed: true, // Phase 1 complete
    detail_complete: false, // Phase 2 pending
    server_corrected: false,
    score_corrected: false,
    correction_notes: null,
  }
}

/**
 * Map Phase1Shot to DBShot (initial structure, Phase 2 will add details)
 */
export function mapPhase1ShotToDBShot(
  shot: Phase1Shot,
  rallyId: string,
  playerId: string
): DBShot {
  return {
    id: generateId(),
    rally_id: rallyId,
    video_id: null, // Will be set when video is added
    time: shot.timestamp,
    shot_index: shot.shotIndex,
    player_id: playerId,
    // RECORDED DATA - all null initially, filled in Phase 2
    serve_spin_family: null,
    serve_length: null,
    wing: null,
    intent: null,
    shot_result: null,
    // DERIVED DATA - calculated later
    shot_origin: null,
    shot_destination: null,
    is_rally_end: false, // Will be set for last shot
    rally_end_role: 'none',
    // INFERRED DATA - computed after Phase 2
    inferred_pressure_level: null,
    inferred_intent_quality: null,
    inferred_player_position: null,
    inferred_distance_from_table: null,
    inferred_shot_type: shot.isServe ? 'serve' : null, // Serves identified immediately
    inferred_shot_confidence: shot.isServe ? 'high' : null,
    inferred_spin: null,
    inferred_spin_confidence: null,
    inferred_is_third_ball_attack: false,
    inferred_is_receive_attack: false,
    is_tagged: false, // Phase 2 not yet complete
  }
}

// =============================================================================
// PHASE 2 MAPPING (Detailed Shot Data ÔåÆ Database)
// =============================================================================

export interface DetailedShotData {
  direction?: 'left_left' | 'left_mid' | 'left_right' | 'mid_left' | 'mid_mid' | 'mid_right' | 'right_left' | 'right_mid' | 'right_right'
  length?: 'short' | 'halflong' | 'deep'
  spin?: 'underspin' | 'nospin' | 'topspin'
  stroke?: 'backhand' | 'forehand'
  intent?: 'defensive' | 'neutral' | 'aggressive'
  errorType?: 'forced' | 'unforced'
  shotQuality?: 'average' | 'high'
}

/**
 * Extract origin and destination from direction
 */
function parseDirection(direction: DetailedShotData['direction']): {
  origin: TablePosition | null
  destination: TablePosition | null
} {
  if (!direction) return { origin: null, destination: null }
  
  // Format: "{origin}_{destination}"
  // e.g. "left_mid" ÔåÆ origin: left, destination: mid
  const parts = direction.split('_') as [string, string]
  
  const toPosition = (str: string): TablePosition => {
    if (str === 'left') return 'left'
    if (str === 'right') return 'right'
    return 'mid'
  }
  
  return {
    origin: toPosition(parts[0]),
    destination: toPosition(parts[1]),
  }
}

/**
 * Map Phase 2 detailed shot data to DBShot updates
 */
export function mapPhase2DetailToDBShot(
  isServe: boolean,
  isError: boolean,
  data: DetailedShotData
): Partial<DBShot> {
  const { origin, destination } = parseDirection(data.direction)
  
  // Map shot quality to shot result
  let shotResult: ShotResult | null = null
  if (data.shotQuality === 'average') shotResult = 'average'
  if (data.shotQuality === 'high') shotResult = 'good'
  if (isError && data.errorType) {
    // Error shots don't have destination (ball didn't land in play)
    shotResult = data.intent === 'defensive' ? 'in_net' : 'missed_long'
  }
  
  const updates: Partial<DBShot> = {
    shot_origin: origin,
    shot_destination: isError ? null : destination, // No destination for errors
    shot_result: shotResult,
    is_tagged: true,
  }
  
  // Serve-specific fields
  if (isServe) {
    updates.serve_length = data.length === 'short' ? 'short' : 
                          data.length === 'halflong' ? 'half_long' :
                          data.length === 'deep' ? 'long' : null
    
    updates.serve_spin_family = data.spin === 'underspin' ? 'under' :
                                data.spin === 'topspin' ? 'top' :
                                data.spin === 'nospin' ? 'no_spin' : null
  } else {
    // Rally shot fields
    updates.wing = data.stroke === 'forehand' ? 'FH' : 
                   data.stroke === 'backhand' ? 'BH' : null
    
    updates.intent = data.intent as ShotIntent | null
  }
  
  return updates
}

/**
 * Calculate player scores after rallies
 */
export function calculateScoresForRallies(
  rallies: DBRally[],
  player1Id: string,
  player2Id: string
): DBRally[] {
  let player1Score = 0
  let player2Score = 0
  
  return rallies.map(rally => {
    // Update score if this rally is scoring and has a winner
    if (rally.is_scoring && rally.winner_id) {
      if (rally.winner_id === player1Id) player1Score++
      if (rally.winner_id === player2Id) player2Score++
    }
    
    return {
      ...rally,
      player1_score_after: player1Score,
      player2_score_after: player2Score,
    }
  })
}

/**
 * Mark last shot in each rally
 */
export function markRallyEndShots(shots: DBShot[], rallies: DBRally[]): DBShot[] {
  const rallyLastShotMap = new Map<string, number>()
  
  // Find last shot index for each rally
  shots.forEach(shot => {
    const currentMax = rallyLastShotMap.get(shot.rally_id) || 0
    if (shot.shot_index > currentMax) {
      rallyLastShotMap.set(shot.rally_id, shot.shot_index)
    }
  })
  
  // Mark shots that are rally-ending
  return shots.map(shot => {
    const isLastInRally = shot.shot_index === rallyLastShotMap.get(shot.rally_id)
    if (!isLastInRally) return shot
    
    // Find the rally
    const rally = rallies.find(r => r.id === shot.rally_id)
    if (!rally) return shot
    
    // Determine rally end role
    let rallyEndRole: DBShot['rally_end_role'] = 'none'
    if (rally.winner_id === shot.player_id) {
      rallyEndRole = 'winner'
    } else if (rally.winner_id && rally.is_scoring) {
      // Shot player is not the winner, so they made an error
      // TODO: Differentiate forced vs unforced in Phase 2
      rallyEndRole = 'unforced_error'
    }
    
    return {
      ...shot,
      is_rally_end: true,
      rally_end_role: rallyEndRole,
    }
  })
}

