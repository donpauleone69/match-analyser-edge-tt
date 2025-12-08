/**
 * MatchVideo Entity Types
 */

export type MatchId = string
export type PlayerId = string
export type SetId = string
export type MatchCoverageType = 'full_match' | 'single_set' | 'multi_set'

export interface DBMatchVideo {
  id: string // Slug format: {match_id}-v{num}
  match_id: MatchId // FK (slug)
  player1_id: PlayerId // FK (slug)
  player2_id: PlayerId // FK (slug)
  set_number: number | null
  set_id: SetId | null // FK (slug)
  coverage_type: MatchCoverageType
  video_url: string
  created_at: Date
  updated_at: Date
}

export interface NewMatchVideo {
  match_id: MatchId
  player1_id: PlayerId
  player2_id: PlayerId
  set_number?: number | null
  set_id?: SetId | null
  coverage_type: MatchCoverageType
  video_url: string
}
