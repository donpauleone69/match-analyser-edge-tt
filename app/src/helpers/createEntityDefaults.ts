/**
 * Entity Default Values
 * 
 * Provides default values for creating new database entities with multi-video support.
 * Used when creating new matches, sets, rallies, and shots.
 */

import type { DBMatch, DBSet, DBRally, DBShot } from '@/data'

// =============================================================================
// MATCH DEFAULTS
// =============================================================================

/**
 * Get default values for new match fields
 */
export function getMatchDefaults(): Partial<DBMatch> {
  return {
    best_of: 5,
    set_score_summary: '0-0',
    has_video: false,
    video_count: 0,
    total_coverage: 'partial',
    step1_complete: false,
    step2_complete: false,
  }
}

// =============================================================================
// SET DEFAULTS
// =============================================================================

/**
 * Get default values for new set fields
 * 
 * @param matchFirstServerId - Who serves first in the entire match
 * @param setNumber - Set number (1-based)
 * @returns Default values for creating a new set
 */
export function getSetDefaults(matchFirstServerId: string, setNumber: number): Partial<DBSet> {
  // Service alternation: odd sets = match first server, even sets = other player
  const setFirstServerId = setNumber % 2 === 1 
    ? matchFirstServerId 
    : (matchFirstServerId === 'player1' ? 'player2' : 'player1')
  
  return {
    set_first_server_id: setFirstServerId,
    has_video: false,
    video_segments: [],
    video_contexts: null,
    end_of_set_timestamp: null,
    derived_player1_final_score: null,
    derived_player2_final_score: null,
    derived_winner_id: null,
    scores_validated: false,
    validation_errors: null,
    is_tagged: false,
    tagging_started_at: null,
    tagging_completed_at: null,
  }
}

// =============================================================================
// RALLY DEFAULTS
// =============================================================================

/**
 * Get default values for new rally fields
 * 
 * @param setFinalScores - The final scores for the set (for validation context)
 * @returns Default values for creating a new rally
 */
export function getRallyDefaults(setFinalScores: {
  player1: number
  player2: number
  winnerId: string | null
}): Partial<DBRally> {
  return {
    video_id: null,
    has_video_data: false,
    end_of_point_time: null,
    set_player1_final_score: setFinalScores.player1,
    set_player2_final_score: setFinalScores.player2,
    set_winner_id: setFinalScores.winnerId,
    is_scoring: true,
    point_end_type: null,
    luck_type: 'none',
    opponent_luck_overcome: null,
    is_highlight: false,
    framework_confirmed: false,
    detail_complete: false,
    server_corrected: false,
    score_corrected: false,
    correction_notes: null,
  }
}

// =============================================================================
// SHOT DEFAULTS
// =============================================================================

/**
 * Get default values for new shot fields
 * 
 * @returns Default values for creating a new shot
 */
export function getShotDefaults(): Partial<DBShot> {
  return {
    video_id: null,
    // Serve-only fields
    serve_spin_family: null,
    serve_length: null,
    // Rally shot fields
    wing: null,
    intent: null,
    // All shots
    shot_result: null,
    // Derived data
    shot_origin: null,
    shot_destination: null,
    is_rally_end: false,
    rally_end_role: 'none',
    // Inferred data
    inferred_pressure_level: null,
    inferred_intent_quality: null,
    inferred_player_position: null,
    inferred_distance_from_table: null,
    inferred_shot_type: null,
    inferred_shot_confidence: null,
    inferred_spin: null,
    inferred_spin_confidence: null,
    inferred_is_third_ball_attack: false,
    inferred_is_receive_attack: false,
    // Workflow
    is_tagged: false,
  }
}

