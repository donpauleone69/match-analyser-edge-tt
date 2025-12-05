/**
 * Match Entity Types
 */

export type MatchRound = 'groups' | 'last_32' | 'last_16' | 'quarter_final' | 'semi_final' | 'final' | 'other'
export type TaggingMode = 'essential' | 'full'
export type BestOf = 1 | 3 | 5 | 7

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

export type NewMatch = Omit<DBMatch, 'id' | 'created_at'>

