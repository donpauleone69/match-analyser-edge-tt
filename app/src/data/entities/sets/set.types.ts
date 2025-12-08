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
  id: string // Slug format: {match_id}-s{num}
  match_id: string // FK (slug)
  set_number: number
  
  // TOP-DOWN: Entered scores (expected outcomes)
  player1_score_final: number
  player2_score_final: number
  winner_id: string | null // FK (slug)
  
  // Set counts before and after this set
  player1_sets_before: number
  player1_sets_after: number
  player2_sets_before: number
  player2_sets_after: number
  
  // Set-level first server (derived from match service order)
  set_first_server_id: string        // Who serves first point of this set (FK slug)
  
  // Video coverage (MULTI-VIDEO SUPPORT)
  has_video: boolean                 // Is this set covered by ANY video?
  video_segments: string[]           // Array of video IDs that cover this set
  video_contexts: DBSetVideoContext[] | null // Per-video context (may have multiple)
  end_of_set_timestamp: number | null // Seconds (in which video? - use video_contexts)
  
  // Tagging workflow status
  is_tagged: boolean
  tagging_started_at: string | null  // ISO timestamp
  tagging_completed_at: string | null // ISO timestamp
  
  // Enhanced tagging progress tracking (for pause/resume)
  tagging_phase: 'not_started' | 'phase1_in_progress' | 'phase1_complete' | 'phase2_in_progress' | 'phase2_complete'
  phase1_last_rally: number | null       // Last rally number saved in Phase 1
  phase1_total_rallies: number | null    // Expected total (for progress %)
  phase2_last_shot_index: number | null  // Last shot detailed in Phase 2  
  phase2_total_shots: number | null      // Total shots (for progress %)
}

export type NewSet = Omit<DBSet, 'id' | 'is_tagged' | 'tagging_started_at' | 'tagging_completed_at' | 'tagging_phase' | 'phase1_last_rally' | 'phase1_total_rallies' | 'phase2_last_shot_index' | 'phase2_total_shots'>

