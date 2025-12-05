/**
 * MatchVideo Entity Types
 */

export type MatchId = string
export type PlayerId = string
export type SetId = string
export type MatchCoverageType = 'full_match' | 'single_set' | 'multi_set'

export interface DBMatchVideo {
  id: string
  match_id: MatchId
  player1_id: PlayerId
  player2_id: PlayerId
  set_number: number | null
  set_id: SetId | null
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
