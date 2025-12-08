/**
 * Rally Entity Types
 */

export interface DBRally {
  id: string // Slug format: {set_id}-r{num}
  set_id: string // FK (slug)
  rally_index: number
  
  // Video reference (MULTI-VIDEO)
  video_id: string | null            // Which video segment is this rally in? (FK slug)
  has_video_data: boolean            // False if score-only (no video coverage)
  end_of_point_time: number | null   // Timestamp WITHIN the video_id video (rally end, NOT last shot)
  
  // Participants
  server_id: string // FK (slug)
  receiver_id: string // FK (slug)
  
  // Outcome
  is_scoring: boolean
  winner_id: string | null // FK (slug)
  
  // Score progression (WITHIN SET)
  player1_score_before: number
  player2_score_before: number
  player1_score_after: number
  player2_score_after: number
  
  // Rally end details
  point_end_type: 'serviceFault' | 'receiveError' | 'forcedError' | 'unforcedError' | 'winnerShot' | null
  
  // Workflow
  is_highlight: boolean
  framework_confirmed: boolean // Phase 1 complete
  detail_complete: boolean // Phase 2 complete
  
  // Manual corrections
  server_corrected: boolean
  score_corrected: boolean
  correction_notes: string | null
}

export type NewRally = Omit<DBRally, 'id'>

