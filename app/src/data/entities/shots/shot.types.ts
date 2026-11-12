/**
 * Shot Entity Types — Rally Focus schema
 *
 * Stores what the Rally Focus tagger enters per contact.
 * Phase is derived, not stored.
 * Choices stay null until selected. Attribute switches default false.
 */

export type ShotSpin = 'under' | 'top' | 'side'
export type ShotWing = 'FH' | 'BH'
export type ShotStroke = 'flick' | 'loop' | 'drive' | 'smash' | 'lob' | 'block' | 'push' | 'chop'
export type ShotDepth = 'short' | 'half' | 'long'
export type ShotPlacement = 'BH' | 'middle' | 'FH'
export type ShotContact = 'over_table' | 'off_table'
export type ShotInitiative = 'behind' | 'level' | 'ahead'
export type ShotQuality = 'good' | 'normal' | 'poor'
/** Pass 1 Focus: flag a contact for later review. Technical also requires wing + stroke. */
export type ShotReviewKind = 'technical' | 'tactical'

export interface DBShot {
  // Identity & references
  id: string // Slug format: {rally_id}-sh{num}
  rally_id: string // FK (slug)
  video_id: string | null
  player_id: string | null // FK (slug); null = Villain (unnamed opponent)

  // Position & timing
  shot_index: number // 1-based within rally
  timestamp_start: number // Contact time in video seconds

  // Rally Focus tags (null when that pill is not shown / not selected for the role)
  shot_spin: ShotSpin | null // Serve only
  shot_wing: ShotWing | null
  shot_stroke: ShotStroke | null // Attack and shots after it
  shot_placement: ShotPlacement | null // Serve and balls before the attack
  shot_depth: ShotDepth | null // Serve and balls before the attack
  shot_contact: ShotContact | null // First attack only
  shot_initiative: ShotInitiative | null // Reply / FOS+1 and FOS+2 while point continues
  shot_quality: ShotQuality | null // First attack only

  // Attribute toggles (default false; never null)
  shot_is_weak: boolean
  shot_is_high: boolean
  shot_is_heavy: boolean
  shot_is_safe: boolean // first attack only
  /** Crossed wing: FH from BH side / BH from FH side. Pass 1 Focus. */
  shot_is_pivot: boolean
  /** null = not flagged; technical requires wing + stroke on save. */
  shot_review_kind: ShotReviewKind | null
}

export type NewShot = Omit<DBShot, 'id'>
