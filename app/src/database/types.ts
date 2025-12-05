/**
 * Database Types - Generated from DatabaseSchema_PrototypeV2.md
 * 
 * These types represent the PostgreSQL schema adapted for IndexedDB
 */

// =============================================================================
// ENUMS
// =============================================================================

export type TournamentType = 'friendly' | 'club' | 'local' | 'regional' | 'national' | 'international'
export type MatchRound = 'final' | 'semi_final' | 'quarter_final' | 'round_16' | 'round_32' | 'groups' | 'other'
export type TaggingMode = 'essential' | 'full'
export type Handedness = 'right' | 'left'
export type TablePosition = 'left' | 'mid' | 'right'
export type ShotIntent = 'defensive' | 'neutral' | 'aggressive'
export type ShotResult = 'good' | 'average' | 'in_net' | 'missed_long'
export type PressureLevel = 'low' | 'medium' | 'high'
export type IntentQuality = 'correct' | 'over_aggressive' | 'over_passive' | 'misread'
export type RallyEndRole = 'winner' | 'forced_error' | 'unforced_error' | 'none'
export type InferredConfidence = 'low' | 'medium' | 'high'
export type ServeSpinFamily = 'under' | 'top' | 'no_spin' | 'side'
export type ServeLength = 'short' | 'half_long' | 'long'

// Multi-video support
export type BestOf = 1 | 3 | 5 | 7
export type MatchCoverageType = 'full' | 'partial_start' | 'partial_end' | 'partial_middle'

// =============================================================================
// MAIN ENTITIES
// =============================================================================

export interface DBTournament {
  id: string
  name: string
  location: string | null
  start_date: string // ISO date string
  end_date: string | null // ISO date string
  tournament_type: TournamentType
  notes: string | null
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

export interface DBPlayer {
  id: string
  first_name: string
  last_name: string
  handedness: Handedness
  club_id: string | null
  club_name: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface DBMatchVideo {
  id: string
  match_id: string
  
  // Video file
  video_blob_url: string | null      // Session-only blob URL (not persisted)
  video_file_name: string            // Original filename for reference
  video_duration: number | null      // Duration in seconds
  
  // Sequence
  sequence_number: number            // 1, 2, 3... order of videos in match
  
  // Coverage context (TOP-DOWN ENTRY)
  start_set_number: number           // Which set does this video start on?
  start_set_score: string            // Set score when video starts ("0-0", "1-1", "2-1")
  start_points_score: string         // Point score when video starts ("0-0", "5-3")
  
  end_set_number: number | null      // Which set does video end on?
  end_set_score: string | null       // Set score when video ends
  end_points_score: string | null    // Point score when video ends
  
  // First serve in THIS video
  first_serve_timestamp: number      // Seconds into THIS video
  first_server_id: string            // Who serves first in THIS video segment
  
  // Coverage type
  coverage_type: MatchCoverageType
  
  // Tagging status
  tagging_started_at: string | null
  tagging_completed_at: string | null
  
  created_at: string
}

export interface DBMatch {
  id: string
  
  // Tournament context (nullable)
  tournament_id: string | null
  round: MatchRound | null
  
  // Players
  player1_id: string
  player2_id: string
  first_server_id: string
  
  // Match result (TOP-DOWN ENTRY)
  winner_id: string | null
  player1_sets_won: number
  player2_sets_won: number
  
  // Match parameters
  best_of: BestOf                    // 1, 3, 5, or 7 sets
  set_score_summary: string | null   // "3-2", "3-1", etc. (entered, not derived)
  match_date: string                 // ISO date
  
  // Tagging configuration
  tagging_mode: TaggingMode | null
  
  // Video tracking (MULTI-VIDEO SUPPORT)
  has_video: boolean                 // True if ANY video exists
  video_count: number                // Number of video segments
  total_coverage: 'full' | 'partial' // Are all sets/rallies covered?
  
  // Workflow state
  step1_complete: boolean            // Match framework tagging done
  step2_complete: boolean            // Rally detail tagging done
  
  created_at: string
}

export interface DBSetVideoContext {
  video_id: string
  video_start_player1_score: number | null
  video_start_player2_score: number | null
  first_server_in_video: string
}

export interface DBSet {
  id: string
  match_id: string
  set_number: number
  
  // TOP-DOWN: Entered scores (expected outcomes)
  player1_final_score: number
  player2_final_score: number
  winner_id: string | null
  
  // Set-level first server (derived from match service order)
  set_first_server_id: string        // Who serves first point of this set
  
  // Video coverage (MULTI-VIDEO SUPPORT)
  has_video: boolean                 // Is this set covered by ANY video?
  video_segments: string[]           // Array of video IDs that cover this set
  video_contexts: DBSetVideoContext[] | null // Per-video context (may have multiple)
  end_of_set_timestamp: number | null // Seconds (in which video? - use video_contexts)
  
  // BOTTOM-UP: Derived from rallies (for validation)
  derived_player1_final_score: number | null
  derived_player2_final_score: number | null
  derived_winner_id: string | null
  
  // Validation
  scores_validated: boolean          // True if derived matches entered
  validation_errors: string | null   // JSON string of errors
  
  // Tagging workflow status
  is_tagged: boolean
  tagging_started_at: string | null  // ISO timestamp
  tagging_completed_at: string | null // ISO timestamp
}

export interface DBRally {
  id: string
  set_id: string
  rally_index: number
  
  // Video reference (MULTI-VIDEO)
  video_id: string | null            // Which video segment is this rally in?
  has_video_data: boolean            // False if score-only (no video coverage)
  end_of_point_time: number | null   // Timestamp WITHIN the video_id video (rally end, NOT last shot)
  
  // Participants
  server_id: string
  receiver_id: string
  
  // Outcome
  is_scoring: boolean
  winner_id: string | null
  
  // Score progression (WITHIN SET)
  player1_score_after: number
  player2_score_after: number
  
  // Set context (for validation - from Set table)
  set_player1_final_score: number
  set_player2_final_score: number
  set_winner_id: string | null
  
  // Rally end details
  point_end_type: 'serviceFault' | 'receiveError' | 'forcedError' | 'unforcedError' | 'winnerShot' | null
  luck_type: 'none' | 'luckyNet' | 'luckyEdgeTable' | 'luckyEdgeBat' | null
  opponent_luck_overcome: boolean | null
  
  // Workflow
  is_highlight: boolean
  framework_confirmed: boolean // Phase 1 complete
  detail_complete: boolean // Phase 2 complete
  
  // Manual corrections
  server_corrected: boolean
  score_corrected: boolean
  correction_notes: string | null
}

export interface DBShot {
  id: string
  rally_id: string
  
  // Video reference (MULTI-VIDEO)
  video_id: string | null            // Which video segment is this shot in?
  time: number                       // Seconds into video_id video (SHOT CONTACT, not rally end)
  
  shot_index: number // 1-based
  player_id: string
  
  // ============================================================================
  // RECORDED DATA (direct user input)
  // ============================================================================
  
  // Serve-only fields (NULL for rally shots)
  serve_spin_family: ServeSpinFamily | null
  serve_length: ServeLength | null
  
  // Rally shot fields (NULL for serves)
  wing: 'FH' | 'BH' | null
  intent: ShotIntent | null
  
  // All shots
  shot_result: ShotResult | null
  
  // ============================================================================
  // DERIVED DATA (deterministic computation)
  // ============================================================================
  
  shot_origin: TablePosition | null // where player hits from
  shot_destination: TablePosition | null // where ball lands (NULL for errors)
  is_rally_end: boolean
  rally_end_role: RallyEndRole
  
  // ============================================================================
  // INFERRED DATA (AI/ML/heuristics - all prefixed with inferred_)
  // ============================================================================
  
  inferred_pressure_level: PressureLevel | null
  inferred_intent_quality: IntentQuality | null
  inferred_player_position: 'wide_fh' | 'normal' | 'wide_bh' | 'very_wide_fh' | 'very_wide_bh' | null
  inferred_distance_from_table: 'close' | 'mid' | 'far' | null
  inferred_shot_type: string | null // 'serve', 'fh_loop_vs_under', 'bh_flick', etc.
  inferred_shot_confidence: InferredConfidence | null
  inferred_spin: string | null // 'heavy_topspin', 'topspin', 'no_spin', 'backspin', 'heavy_backspin'
  inferred_spin_confidence: InferredConfidence | null
  inferred_is_third_ball_attack: boolean
  inferred_is_receive_attack: boolean
  
  // WORKFLOW
  is_tagged: boolean
}

// Player Profile (deferred for Phase 2 - included for completeness)
export interface DBPlayerProfile {
  id: string
  player_id: string
  // Technical skills (0-10 scale)
  fh_loop_vs_under: number | null
  bh_loop_vs_under: number | null
  fh_flick: number | null
  bh_flick: number | null
  fh_counter_topspin: number | null
  bh_counter_topspin: number | null
  // Consistency
  fh_consistency: number | null
  bh_consistency: number | null
  receive_consistency: number | null
  push_consistency: number | null
  // Spin handling
  vs_under_strength: number | null
  vs_top_strength: number | null
  vs_nospin_strength: number | null
  // Positional comfort
  close_table_fh: number | null
  close_table_bh: number | null
  mid_distance_fh: number | null
  mid_distance_bh: number | null
  far_from_table_fh: number | null
  far_from_table_bh: number | null
  created_at: string
  updated_at: string
}

// Player Skill Metrics (deferred for Phase 2)
export interface DBPlayerSkillMetrics {
  id: string
  player_id: string
  skill_key: string
  period_type: 'match' | 'range'
  match_id: string | null
  date_range_start: string | null
  date_range_end: string | null
  attempts: number
  good_count: number
  error_count: number
  skill_score: number
  created_at: string
  updated_at: string
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

// For creating new records (omit generated fields)
export type NewTournament = Omit<DBTournament, 'id' | 'created_at' | 'updated_at'>
export type NewPlayer = Omit<DBPlayer, 'id' | 'created_at' | 'updated_at'>
export type NewMatchVideo = Omit<DBMatchVideo, 'id' | 'created_at'>
export type NewMatch = Omit<DBMatch, 'id' | 'created_at'>
export type NewSet = Omit<DBSet, 'id' | 'is_tagged' | 'tagging_started_at' | 'tagging_completed_at' | 'derived_player1_final_score' | 'derived_player2_final_score' | 'derived_winner_id' | 'scores_validated' | 'validation_errors'>
export type NewRally = Omit<DBRally, 'id'>
export type NewShot = Omit<DBShot, 'id'>

