/**
 * Rally Entity Types — Rally Focus schema
 *
 * first_attack_index and point_ending are the rally-level tags.
 * Service fault / receive error are derived from point_ending + last shot_index.
 */

export type PointEnding =
  | 'winner'
  | 'lucky'
  | 'error_net'
  | 'error_long'
  | 'error_wide'
  /** Swung and missed the ball */
  | 'error_air'
export type PointMissReason =
  | 'technical'
  | 'timing'
  | 'footwork'
  | 'positioning'
  | 'misread'
  | 'forced'

export interface DBRally {
  id: string // Slug format: {set_id}-r{num}
  set_id: string // FK (slug)
  rally_index: number

  // Video reference (MULTI-VIDEO)
  video_id: string | null
  has_video_data: boolean

  // Rally timing
  timestamp_start: number | null
  timestamp_end: number | null
  end_of_point_time: number | null // Legacy alias of timestamp_end

  // Participants (null = Villain / unnamed opponent)
  server_id: string | null // FK (slug)
  receiver_id: string | null // FK (slug)

  // Outcome
  is_scoring: boolean
  winner_id: string | null // FK (slug); null on a scoring rally = Villain won

  // Score progression (WITHIN SET)
  player1_score_before: number
  player2_score_before: number
  player1_score_after: number
  player2_score_after: number

  // Rally Focus end tags
  first_attack_index: number | null // null = no attack in this rally
  point_ending: PointEnding
  point_miss_reason: PointMissReason | null

  // Workflow
  is_highlight: boolean
  framework_confirmed: boolean
  detail_complete: boolean

  // Manual corrections
  server_corrected: boolean
  score_corrected: boolean
  correction_notes: string | null

  // Stub rally flag (for pre-populated rallies from setup)
  is_stub_rally: boolean
}

export type NewRally = Omit<DBRally, 'id'>
