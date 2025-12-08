/**
 * Match Entity Types
 */

export type MatchRound = 'groups' | 'last_32' | 'last_16' | 'quarter_final' | 'semi_final' | 'final' | 'other'
export type TaggingMode = 'essential' | 'full'
export type BestOf = 1 | 3 | 5 | 7
export type MatchDetailLevel = 'result_only' | 'sets' | 'rallies' | 'shots'

export interface DBMatch {
  id: string // Slug format: {p1}-vs-{p2}-{yyyymmdd}-{id4}
  
  // Tournament context (nullable)
  tournament_id: string | null // FK (slug)
  round: MatchRound | null
  
  // Players
  player1_id: string // FK (slug)
  player2_id: string // FK (slug)
  first_server_id: string // FK (slug)
  
  // Match result (TOP-DOWN ENTRY)
  winner_id: string | null // FK (slug)
  player1_sets_final: number
  player2_sets_final: number
  
  // Match parameters
  best_of: BestOf                    // 1, 3, 5, or 7 sets
  match_date: string                 // ISO date
  
  // Tagging configuration
  tagging_mode: TaggingMode | null
  match_detail_level: MatchDetailLevel // Auto-detected based on data
  
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

