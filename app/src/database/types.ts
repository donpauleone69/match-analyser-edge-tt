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
export type VideoCoverage = 'full' | 'truncatedStart' | 'truncatedEnd' | 'truncatedBoth'
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

export interface DBMatch {
  id: string
  // Tournament context (nullable)
  tournament_id: string | null
  round: MatchRound | null
  // Players
  player1_id: string
  player2_id: string
  first_server_id: string
  // Match result
  winner_id: string | null
  player1_sets_won: number
  player2_sets_won: number
  // Match details
  match_format: string // e.g. "Best of 5"
  match_date: string // ISO date
  // Tagging configuration (NULL if no video)
  tagging_mode: TaggingMode | null
  video_coverage: VideoCoverage | null
  // Starting scores (for partial video)
  player1_start_sets: number
  player2_start_sets: number
  player1_start_points: number
  player2_start_points: number
  // Video
  first_serve_timestamp: number | null // seconds
  video_blob_url: string | null // blob URL (session only, not persisted)
  // Workflow state
  step1_complete: boolean
  step2_complete: boolean
  created_at: string
}

export interface DBSet {
  id: string
  match_id: string
  set_number: number
  // Server tracking
  first_server_id: string
  // Final scores
  player1_final_score: number
  player2_final_score: number
  winner_id: string | null
  // Video coverage
  has_video: boolean
  video_start_player1_score: number | null
  video_start_player2_score: number | null
  end_of_set_timestamp: number | null // seconds
}

export interface DBRally {
  id: string
  set_id: string
  rally_index: number
  // Participants
  server_id: string
  receiver_id: string
  // Outcome
  is_scoring: boolean
  winner_id: string | null
  // Score tracking
  player1_score_after: number
  player2_score_after: number
  // Rally end details
  end_of_point_time: number | null // seconds into video
  point_end_type: 'serviceFault' | 'receiveError' | 'forcedError' | 'unforcedError' | 'winnerShot' | null
  luck_type: 'none' | 'luckyNet' | 'luckyEdgeTable' | 'luckyEdgeBat' | null
  opponent_luck_overcome: boolean | null
  // Video and workflow
  has_video_data: boolean
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
  time: number // seconds into video
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
export type NewMatch = Omit<DBMatch, 'id' | 'created_at'>
export type NewSet = Omit<DBSet, 'id'>
export type NewRally = Omit<DBRally, 'id'>
export type NewShot = Omit<DBShot, 'id'>

