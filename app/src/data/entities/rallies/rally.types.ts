/**
 * Rally Entity Types
 */

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

export type NewRally = Omit<DBRally, 'id'>

