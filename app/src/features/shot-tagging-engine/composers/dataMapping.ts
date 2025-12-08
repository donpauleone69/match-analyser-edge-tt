/**
 * Mapping Service - Convert Prototype V2 data structures to database schema
 * 
 * This bridges the gap between the tagging UI and the database
 */

import type { 
  DBRally,
  DBShot,
  NewRally,
  NewShot,
  TablePosition,
  ShotIntent,
  ShotResult,
} from '@/data'
import type { Phase1Rally, Phase1Shot } from '@/features/shot-tagging-engine/composers/Phase1TimestampComposer'
import type { DetailedShot } from '@/features/shot-tagging-engine/composers/Phase2DetailComposer'
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
import type { ShotLabel } from '@/data'

// =============================================================================
// AUTO-CALCULATION HELPERS
// =============================================================================

/**
 * Derive shot_label from shot_index
 * 1 = 'serve', 2 = 'receive', 3 = 'third_ball', 4+ = 'rally_shot'
 */
export function deriveShotLabel(shotIndex: number): ShotLabel {
  if (shotIndex === 1) return 'serve'
  if (shotIndex === 2) return 'receive'
  if (shotIndex === 3) return 'third_ball'
  return 'rally_shot'
}

/**
 * Calculate timestamp_end for each shot in a rally
 * timestamp_end = next shot's timestamp_start, or rally end timestamp for last shot
 */
export function calculateTimestampEnd(
  shots: Array<{ shot_index: number; timestamp_start: number }>,
  rallyEndTimestamp: number
): Map<number, number> {
  const timestampEndMap = new Map<number, number>()
  
  for (let i = 0; i < shots.length; i++) {
    const currentShot = shots[i]
    const nextShot = shots[i + 1]
    
    if (nextShot) {
      timestampEndMap.set(currentShot.shot_index, nextShot.timestamp_start)
    } else {
      // Last shot - use rally end timestamp
      timestampEndMap.set(currentShot.shot_index, rallyEndTimestamp)
    }
  }
  
  return timestampEndMap
}

/**
 * Apply timestamp_end to shots based on rally groupings
 */
export function applyTimestampEnd<T extends NewShot | DBShot>(
  shots: T[],
  rallies: DBRally[]
): T[] {
  return shots.map(shot => {
    const rally = rallies.find(r => r.id === shot.rally_id)
    if (!rally) return shot
    
    // Get all shots for this rally, sorted by shot_index
    const rallyShots = shots
      .filter(s => s.rally_id === rally.id)
      .sort((a, b) => a.shot_index - b.shot_index)
    
    // Find this shot's position
    const shotPosition = rallyShots.findIndex(s => s.shot_index === shot.shot_index)
    const nextShot = rallyShots[shotPosition + 1]
    
    // Calculate timestamp_end
    const timestamp_end = nextShot 
      ? nextShot.timestamp_start 
      : rally.end_of_point_time || shot.timestamp_start + 0.5 // Fallback if no end time
    
    return {
      ...shot,
      timestamp_end,
    } as T
  })
}

/**
 * Calculate player scores before each rally
 */
export function calculateScoresBefore(
  rallies: Array<{ rally_index: number; is_scoring: boolean; winner_id: string | null }>,
  player1Id: string,
  player2Id: string
): Map<number, { player1_score_before: number; player2_score_before: number }> {
  const scoresMap = new Map<number, { player1_score_before: number; player2_score_before: number }>()
  
  let player1Score = 0
  let player2Score = 0
  
  for (const rally of rallies) {
    // Store score BEFORE this rally
    scoresMap.set(rally.rally_index, {
      player1_score_before: player1Score,
      player2_score_before: player2Score,
    })
    
    // Update score after this rally if scoring
    if (rally.is_scoring && rally.winner_id) {
      if (rally.winner_id === player1Id) {
        player1Score++
      } else if (rally.winner_id === player2Id) {
        player2Score++
      }
    }
  }
  
  return scoresMap
}

/**
 * Calculate sets before and after for each set
 */
export function calculateSetsBeforeAfter(
  sets: Array<{ set_number: number; winner_id: string | null }>,
  player1Id: string,
  player2Id: string
): Map<number, { player1_sets_before: number; player1_sets_after: number; player2_sets_before: number; player2_sets_after: number }> {
  const setsMap = new Map()
  
  let player1Sets = 0
  let player2Sets = 0
  
  for (const set of sets) {
    // Store sets before this set
    const before = {
      player1_sets_before: player1Sets,
      player2_sets_before: player2Sets,
    }
    
    // Update sets after this set
    if (set.winner_id === player1Id) {
      player1Sets++
    } else if (set.winner_id === player2Id) {
      player2Sets++
    }
    
    setsMap.set(set.set_number, {
      ...before,
      player1_sets_after: player1Sets,
      player2_sets_after: player2Sets,
    })
  }
  
  return setsMap
}

/**
 * Detect match detail level based on data existence
 */
export function detectMatchDetailLevel(match: {
  sets: Array<{
    rallies: Array<{ shots: Array<any> }>
  }>
}): 'result_only' | 'sets' | 'rallies' | 'shots' {
  if (match.sets.length === 0) return 'result_only'
  
  const hasRallies = match.sets.some(set => set.rallies && set.rallies.length > 0)
  if (!hasRallies) return 'sets'
  
  const hasShots = match.sets.some(set => 
    set.rallies && set.rallies.some(rally => rally.shots && rally.shots.length > 0)
  )
  if (!hasShots) return 'rallies'
  
  return 'shots'
}

// =============================================================================
// PHASE 1 MAPPING (Timestamp Capture ÔåÆ Database)
// =============================================================================

/**
 * Map Phase1Rally to NewRally (without ID - will be generated by create())
 */
export function mapPhase1RallyToDBRally(
  rally: Phase1Rally,
  setId: string,
  rallyIndex: number,
  player1Id: string,
  player2Id: string
): NewRally {
  // Determine winner based on end condition
  const isScoring = rally.endCondition === 'winner'
  
  // Map winnerId from Phase1Rally to actual player ID
  const winnerId = rally.winnerId === 'player1' ? player1Id : player2Id
  
  return {
    set_id: setId,
    rally_index: rallyIndex,
    video_id: null, // Will be set when video is added
    server_id: rally.serverId === 'player1' ? player1Id : player2Id,
    receiver_id: rally.serverId === 'player1' ? player2Id : player1Id,
    is_scoring: isScoring,
    winner_id: winnerId,
    player1_score_before: 0, // Will be calculated in batch
    player2_score_before: 0, // Will be calculated in batch
    player1_score_after: 0, // Will be calculated in batch
    player2_score_after: 0, // Will be calculated in batch
    end_of_point_time: rally.endTimestamp,
    point_end_type: rally.isError 
      ? (rally.shots.length === 1 ? 'serviceFault' : null) // Service fault if only 1 shot, otherwise determine in Phase 2
      : 'winnerShot', // Non-error rallies are winner shots
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
 * Map Phase1Shot to NewShot (without ID - will be generated by create())
 */
export function mapPhase1ShotToDBShot(
  shot: Phase1Shot,
  rallyId: string,
  playerId: string
): NewShot {
  return {
    rally_id: rallyId,
    video_id: null, // Will be set when video is added
    timestamp_start: shot.timestamp,
    timestamp_end: null, // Will be calculated in batch
    shot_index: shot.shotIndex,
    player_id: playerId,
    // RECORDED DATA - all null initially, filled in Phase 2
    serve_spin_family: null,
    serve_type: null,
    shot_length: null,
    shot_wing: null,
    intent: null,
    shot_result: null,
    // DERIVED DATA - calculated later
    shot_origin: null,
    shot_target: null,
    shot_label: deriveShotLabel(shot.shotIndex),
    is_rally_end: false, // Will be set for last shot
    rally_end_role: 'none',
    // SUBJECTIVE DATA - entered in Phase 2
    intent_quality: null,
    pressure_level: null,
    // INFERRED DATA - computed after Phase 2
    shot_type: shot.isServe ? 'serve' : null, // Serves identified immediately
    shot_contact_timing: null,
    player_position: null,
    player_distance: null,
    shot_spin: null,
    shot_speed: null,
    shot_arc: null,
    is_third_ball_attack: false,
    is_receive_attack: false,
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
  serveType?: 'serve' | 'pendulum' | 'backhand' | 'reverse_tomahawk' | 'tomahawk' | 'hook' | 'lolipop'
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
 * Map Phase 2 detailed shot data to shot updates
 */
export function mapPhase2DetailToDBShot(
  isServe: boolean,
  isReceive: boolean,
  isError: boolean,
  data: DetailedShotData
): Partial<NewShot> {
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
  
  // Serve-specific: spin and serve type
  if (isServe) {
    updates.serve_spin_family = mapServeSpinUIToDB(data.spin)
    updates.serve_type = data.serveType || 'serve' // Default to 'serve' if not specified
  }
  
  // Rally shots (non-serves): wing and intent
  if (!isServe) {
    updates.shot_wing = mapStrokeUIToDB(data.stroke)
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
 * Works with both NewShot[] and DBShot[]
 */
export function markRallyEndShots<T extends NewShot | DBShot>(
  shots: T[],
  rallies: DBRally[]
): T[] {
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
    } as T
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
    timestamp: dbShot.timestamp_start,
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
    ? rallyShots[rallyShots.length - 1].timestamp_start + 0.5
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
    timestamp: dbShot.timestamp_start,
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
    stroke: mapWingDBToUI(dbShot.shot_wing) || undefined,
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


