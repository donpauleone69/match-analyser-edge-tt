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
import type { Phase1Rally, Phase1Shot } from '@/features/shot-tagging-engine/composers/Phase1TimestampComposer'
import type { DetailedShot } from '@/features/shot-tagging-engine/composers/Phase2DetailComposer'
import { generateId } from '@/helpers/generateId'
import {
  mapDirectionToOriginTarget,
  mapShotLengthUIToDB,
  mapServeSpinUIToDB,
  mapStrokeUIToDB,
  mapShotLengthDBToUI,
  mapServeSpinDBToUI,
  mapWingDBToUI,
  mapShotResultDBToUI,
  mapRallyEndRoleDBToUI,
} from '@/rules/derive/shot/mappers_UI_to_DB'

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
  
  // Map winnerId from Phase1Rally to actual player ID
  const winnerId = rally.winnerId === 'player1' ? player1Id : player2Id
  
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
    point_end_type: rally.isError 
      ? (rally.shots.length === 1 ? 'serviceFault' : null) // Service fault if only 1 shot, otherwise determine in Phase 2
      : 'winnerShot', // Non-error rallies are winner shots
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
    shot_length: null,
    wing: null,
    intent: null,
    shot_result: null,
    // DERIVED DATA - calculated later
    shot_origin: null,
    shot_target: null,
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
 * Extract origin and target from direction
 * @deprecated Use mapDirectionToOriginTarget from mappers_UI_to_DB instead
 */
function parseDirection(direction: DetailedShotData['direction']): {
  origin: TablePosition | null
  target: TablePosition | null
} {
  // Use centralized mapper
  const { shot_origin, shot_target } = mapDirectionToOriginTarget(direction)
  return {
    origin: shot_origin,
    target: shot_target,
  }
}

/**
 * Map Phase 2 detailed shot data to DBShot updates
 */
export function mapPhase2DetailToDBShot(
  isServe: boolean,
  isReceive: boolean,
  isError: boolean,
  data: DetailedShotData
): Partial<DBShot> {
  // Safely parse direction (may be undefined)
  const { origin, target } = data.direction ? parseDirection(data.direction) : { origin: null, target: null }
  
  // Map shot quality to shot result
  let shotResult: ShotResult | null = null
  if (data.shotQuality === 'average') shotResult = 'average'
  if (data.shotQuality === 'high') shotResult = 'good'
  if (isError && data.errorType) {
    // Error shots now store target (where player was aiming), result shows what happened
    shotResult = data.intent === 'defensive' ? 'in_net' : 'missed_long'
  }
  
  const updates: Partial<DBShot> = {
    shot_origin: origin,
    shot_target: target, // Now stored even for errors!
    shot_result: shotResult,
    is_tagged: true,
  }
  
  // Serve or receive: populate shot_length
  if (isServe || isReceive) {
    updates.shot_length = mapShotLengthUIToDB(data.length)
  }
  
  // Serve-specific: spin
  if (isServe) {
    updates.serve_spin_family = mapServeSpinUIToDB(data.spin)
  }
  
  // Rally shots (non-serves): wing and intent
  if (!isServe) {
    updates.wing = mapStrokeUIToDB(data.stroke)
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

// =============================================================================
// REVERSE MAPPING (Database → UI)
// =============================================================================

/**
 * Convert DBRally back to Phase1Rally for resume functionality
 */
export function convertDBRallyToPhase1Rally(
  dbRally: DBRally,
  dbShots: DBShot[],
  player1Id: string,
  player2Id: string,
  player1Name: string = 'Player 1',
  player2Name: string = 'Player 2'
): Phase1Rally {
  // Get shots for this rally
  const rallyShots = dbShots
    .filter(s => s.rally_id === dbRally.id)
    .sort((a, b) => a.shot_index - b.shot_index) // Sort by shot index
  
  // Convert shots
  const shots: Phase1Shot[] = rallyShots.map(dbShot => ({
    id: dbShot.id,
    timestamp: dbShot.time,
    shotIndex: dbShot.shot_index,
    isServe: dbShot.shot_index === 1,
  }))
  
  // Map end condition from point_end_type
  const endCondition: EndCondition = 
    dbRally.is_scoring ? 'winner' :
    dbRally.point_end_type === 'forcedError' || dbRally.point_end_type === 'unforcedError' ? 'long' : 'innet'
  
  // Determine serverId
  const serverId: 'player1' | 'player2' = 
    dbRally.server_id === player1Id ? 'player1' : 'player2'
  
  // Determine winnerId
  const winnerId: 'player1' | 'player2' = 
    dbRally.winner_id === player1Id ? 'player1' : 
    dbRally.winner_id === player2Id ? 'player2' : 'player1'
  
  // Find ending shot timestamp - use rally end time
  const endTimestamp = dbRally.end_of_point_time || (rallyShots.length > 0 
    ? rallyShots[rallyShots.length - 1].time + 0.5
    : 0)
  
  return {
    id: dbRally.id,
    shots,
    endCondition,
    endTimestamp,
    isError: !dbRally.is_scoring,
    errorPlacement: endCondition === 'innet' ? 'innet' : endCondition === 'long' ? 'long' : undefined,
    serverId,
    winnerId,
    // Player names for UI
    player1Name,
    player2Name,
    serverName: serverId === 'player1' ? player1Name : player2Name,
    winnerName: winnerId === 'player1' ? player1Name : player2Name,
  }
}

/**
 * Convert DBShot to DetailedShot for Phase 2 resume
 */
export function convertDBShotToDetailedShot(
  dbShot: DBShot,
  rally: DBRally,
  player1Id: string,
  player2Id: string
): DetailedShot {
  const serverId: 'player1' | 'player2' = 
    rally.server_id === player1Id ? 'player1' : 'player2'
  
  const winnerId: 'player1' | 'player2' = 
    rally.winner_id === player1Id ? 'player1' :
    rally.winner_id === player2Id ? 'player2' : 'player1'
  
  const endCondition = rally.is_scoring ? 'winner' :
    rally.point_end_type === 'forcedError' || rally.point_end_type === 'unforcedError' ? 'long' : 'innet'
  
  // Map direction from DB format to UI format
  const direction = dbShot.shot_origin && dbShot.shot_target
    ? `${dbShot.shot_origin}_${dbShot.shot_target}` as Direction
    : undefined
  
  return {
    id: dbShot.id,
    timestamp: dbShot.time,
    shotIndex: dbShot.shot_index,
    isServe: dbShot.shot_index === 1,
    isReceive: dbShot.shot_index === 2,
    rallyId: rally.id,
    rallyEndCondition: endCondition,
    isLastShot: dbShot.is_rally_end || false,
    isError: !rally.is_scoring,
    serverId,
    winnerId,
    direction,
    length: mapShotLengthDBToUI(dbShot.shot_length) || undefined,
    spin: mapServeSpinDBToUI(dbShot.serve_spin_family) || undefined,
    stroke: mapWingDBToUI(dbShot.wing) || undefined,
    intent: dbShot.intent || undefined,
    errorType: mapRallyEndRoleDBToUI(dbShot.rally_end_role) || undefined,
    shotQuality: mapShotResultDBToUI(dbShot.shot_result) || 'average',
  }
}

type Direction = 
  | 'left_left' | 'left_mid' | 'left_right' 
  | 'mid_left' | 'mid_mid' | 'mid_right'
  | 'right_left' | 'right_mid' | 'right_right'

type EndCondition = 'innet' | 'long' | 'winner'

// Re-export types for convenience
export type { Direction, EndCondition }


