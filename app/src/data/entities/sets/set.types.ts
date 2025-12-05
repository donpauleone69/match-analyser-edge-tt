/**
 * Set Entity Types
 */

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

export type NewSet = Omit<DBSet, 'id' | 'is_tagged' | 'tagging_started_at' | 'tagging_completed_at' | 'derived_player1_final_score' | 'derived_player2_final_score' | 'derived_winner_id' | 'scores_validated' | 'validation_errors'>

