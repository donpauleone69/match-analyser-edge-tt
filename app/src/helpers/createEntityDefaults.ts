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
    match_detail_level: 'result_only',
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
    player1_sets_before: 0,
    player1_sets_after: 0,
    player2_sets_before: 0,
    player2_sets_after: 0,
    set_first_server_id: setFirstServerId,
    has_video: false,
    video_segments: [],
    video_contexts: null,
    end_of_set_timestamp: null,
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
export function getRallyDefaults(_setFinalScores: {
  player1: number
  player2: number
  winnerId: string | null
}): Partial<DBRally> {
  return {
    video_id: null,
    has_video_data: false,
    end_of_point_time: null,
    player1_score_before: 0,
    player2_score_before: 0,
    player1_score_after: 0,
    player2_score_after: 0,
    is_scoring: true,
    point_end_type: null,
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
    timestamp_end: null,
    // Serve-only fields
    serve_spin_family: null,
    serve_type: null,
    // Serve/Receive fields
    shot_length: null,
    // Rally shot fields
    shot_wing: null,
    intent: null,
    // All shots
    shot_result: null,
    // Subjective data
    intent_quality: null,
    pressure_level: null,
    // Derived data
    shot_origin: null,
    shot_target: null,
    shot_label: 'rally_shot', // Default, should be overridden
    is_rally_end: false,
    rally_end_role: 'none',
    // Inferred data (may be auto-calculated or manual)
    shot_type: null,
    shot_contact_timing: null,
    player_position: null,
    player_distance: null,
    shot_spin: null,
    shot_speed: null,
    shot_arc: null,
    is_third_ball_attack: false,
    is_receive_attack: false,
    // Workflow
    is_tagged: false,
  }
}

