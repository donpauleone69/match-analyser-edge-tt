/**
 * Shot Entity Types
 */

export type ShotIntent = 'defensive' | 'neutral' | 'aggressive'
export type ShotResult = 'good' | 'average' | 'in_net' | 'missed_long'
export type TablePosition = 'left' | 'mid' | 'right'
export type RallyEndRole = 'winner' | 'forced_error' | 'unforced_error' | 'none'
export type PressureLevel = 'low' | 'medium' | 'high'
export type IntentQuality = 'correct' | 'over_aggressive' | 'over_passive' | 'misread'
export type InferredConfidence = 'low' | 'medium' | 'high'
export type ServeSpinFamily = 'under' | 'top' | 'no_spin' | 'side'
export type ServeLength = 'short' | 'half_long' | 'long'

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

export type NewShot = Omit<DBShot, 'id'>

