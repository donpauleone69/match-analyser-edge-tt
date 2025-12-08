/**
 * Shot Inference Tracking Entity
 * 
 * Tracks which shot fields were inferred (AI/ML) vs manually entered.
 * 
 * SPARSE STRATEGY: Only create rows for fields that were inferred.
 * Absence of a row = manually entered = 100% confidence.
 */

export interface DBShotInference {
  id: string // Slug format: {shot_id}-{field_name}-{id4}
  shot_id: string // FK to shots (slug)
  field_name: string // e.g., 'player_position', 'shot_speed', 'shot_type'
  inferred: boolean // true = AI inferred, false = manually verified
  confidence: number | null // NULL for now, populate later with ML (0.0 - 1.0)
  created_at: string // ISO timestamp
}

export type NewShotInference = Omit<DBShotInference, 'id' | 'created_at'>

/**
 * Trackable inference fields (from DBShot)
 */
export const INFERENCE_FIELDS = [
  'shot_type',
  'shot_contact_timing',
  'player_position',
  'player_distance',
  'shot_spin',
  'shot_speed',
  'shot_arc',
  'is_third_ball_attack',
  'is_receive_attack',
  // Note: Subjective fields (intent, intent_quality, pressure_level) 
  // are not typically inferred, but could be tracked if needed
] as const

export type InferenceFieldName = typeof INFERENCE_FIELDS[number]

