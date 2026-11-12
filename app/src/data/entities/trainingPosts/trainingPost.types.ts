/**
 * Training posts — practice clips over time, not matches.
 * Open-ended shot_type / combination labels (no seeded enum of every stroke).
 */

export type TrainingPostKind = 'shot_type' | 'combination'

export interface DBTrainingPost {
  id: string // tp_{random}
  player_id: string // focal player
  kind: TrainingPostKind
  /** e.g. "forehand_loop" or "serve-open-drive" — free string, not a closed enum */
  label: string
  /** Calendar month of the post, YYYY-MM */
  month: string
  /** Ordered clip video_asset ids (~10); assets use source-time timestamps */
  clip_asset_ids: string[]
  created_at: string
  updated_at: string
}

export type NewTrainingPost = Omit<DBTrainingPost, 'id' | 'created_at' | 'updated_at'>
