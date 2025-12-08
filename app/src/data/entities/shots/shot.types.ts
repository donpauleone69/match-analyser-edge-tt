/**
 * Shot Entity Types
 */

export type ShotIntent = 'defensive' | 'neutral' | 'aggressive'
export type ShotResult = 'good' | 'average' | 'in_net' | 'missed_long' | 'missed_wide'
export type TablePosition = 'left' | 'mid' | 'right'
export type RallyEndRole = 'winner' | 'forced_error' | 'unforced_error' | 'none'
export type PressureLevel = 'low' | 'medium' | 'high'
export type IntentQuality = 'correct' | 'over_aggressive' | 'over_passive' | 'misread'
export type ServeSpinFamily = 'under' | 'top' | 'no_spin' | 'side'
export type ShotLength = 'short' | 'half_long' | 'long'
export type ServeType = 'serve' | 'pendulum' | 'backhand' | 'reverse_tomahawk' | 'tomahawk' | 'hook' | 'lolipop'
export type ShotLabel = 'serve' | 'receive' | 'third_ball' | 'rally_shot'
export type ShotContactTiming = 'early' | 'peak' | 'late'
export type PlayerPosition = 'left' | 'middle' | 'right'
export type PlayerDistance = 'close' | 'mid' | 'far'
export type ShotSpeed = 'slow' | 'medium' | 'fast'
export type ShotArc = 'low' | 'medium' | 'high'

export interface DBShot {
  // ============================================================================
  // IDENTITY & REFERENCES
  // ============================================================================
  
  id: string // Slug format: {rally_id}-sh{num}
  rally_id: string // FK (slug)
  video_id: string | null // Which video segment is this shot in? (FK slug)
  player_id: string // FK (slug)
  
  // ============================================================================
  // POSITION & TIMING
  // ============================================================================
  
  shot_index: number // 1-based within rally
  timestamp_start: number // Seconds into video_id video (SHOT CONTACT, not rally end)
  timestamp_end: number | null // Timestamp of next shot or rally end
  
  // ============================================================================
  // SUBJECTIVE DATA (human judgment / interpretation)
  // ============================================================================
  
  intent: ShotIntent | null
  intent_quality: IntentQuality | null
  pressure_level: PressureLevel | null
  
  // ============================================================================
  // OBJECTIVE DATA (observable facts / deterministic derivation)
  // ============================================================================
  
  // Serve-only fields (NULL for rally shots)
  serve_spin_family: ServeSpinFamily | null
  serve_type: ServeType | null // Type of serve technique
  
  // Serve/Receive fields (shot #1 and #2 only, NULL for other rally shots)
  shot_length: ShotLength | null
  
  // Rally shot fields (NULL for serves)
  shot_wing: 'FH' | 'BH' | null
  
  // All shots
  shot_result: ShotResult | null
  
  // Derived placement (extracted from user input)
  shot_origin: TablePosition | null // Where player hits from
  shot_target: TablePosition | null // Intended target (even for errors)
  
  // Derived labels (computed from context)
  shot_label: ShotLabel // serve, receive, third_ball, rally_shot
  is_rally_end: boolean
  rally_end_role: RallyEndRole
  
  // ============================================================================
  // INFERRED DATA (AI/ML/heuristics - may be auto-calculated or manually entered)
  // Note: Use shot_inferences table to track which fields were inferred vs manual
  // ============================================================================
  
  shot_type: string | null // 'serve', 'fh_loop_vs_under', 'bh_flick', etc.
  shot_contact_timing: ShotContactTiming | null
  player_position: PlayerPosition | null
  player_distance: PlayerDistance | null
  shot_spin: string | null // 'heavy_topspin', 'topspin', 'no_spin', 'backspin', 'heavy_backspin'
  shot_speed: ShotSpeed | null
  shot_arc: ShotArc | null
  is_third_ball_attack: boolean
  is_receive_attack: boolean
  
  // ============================================================================
  // WORKFLOW
  // ============================================================================
  
  is_tagged: boolean
}

export type NewShot = Omit<DBShot, 'id'>
