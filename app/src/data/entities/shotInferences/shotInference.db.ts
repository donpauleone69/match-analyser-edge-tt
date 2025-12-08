/**
 * Shot Inference Database Operations
 */

import { db } from '../../db'
import type { DBShotInference, NewShotInference } from './shotInference.types'
import { generateShotInferenceId } from '@/helpers/generateSlugId'

/**
 * Create a new shot inference record
 * Generates slug ID based on shot ID and field name
 */
export async function create(inference: NewShotInference): Promise<DBShotInference> {
  const now = new Date().toISOString()
  const id = generateShotInferenceId(inference.shot_id, inference.field_name)
  
  const dbInference: DBShotInference = {
    ...inference,
    id,
    created_at: now,
  }
  
  await db.shot_inferences.add(dbInference)
  return dbInference
}

/**
 * Get all inferences for a specific shot
 */
export async function getByShotId(shotId: string): Promise<DBShotInference[]> {
  return await db.shot_inferences
    .where('shot_id')
    .equals(shotId)
    .toArray()
}

/**
 * Get a specific inference by shot and field name
 */
export async function getByField(
  shotId: string,
  fieldName: string
): Promise<DBShotInference | undefined> {
  return await db.shot_inferences
    .where('[shot_id+field_name]')
    .equals([shotId, fieldName])
    .first()
}

/**
 * Delete a specific inference record
 */
export async function deleteByField(shotId: string, fieldName: string): Promise<void> {
  await db.shot_inferences
    .where('[shot_id+field_name]')
    .equals([shotId, fieldName])
    .delete()
}

/**
 * Delete all inferences for a shot
 */
export async function deleteByShotId(shotId: string): Promise<void> {
  await db.shot_inferences
    .where('shot_id')
    .equals(shotId)
    .delete()
}

/**
 * Bulk create multiple inferences (for batch import/inference)
 */
export async function bulkCreate(inferences: NewShotInference[]): Promise<void> {
  const now = new Date().toISOString()
  
  const dbInferences: DBShotInference[] = inferences.map(inf => ({
    ...inf,
    id: generateShotInferenceId(inf.shot_id, inf.field_name),
    created_at: now,
  }))
  
  await db.shot_inferences.bulkAdd(dbInferences)
}

/**
 * Update confidence for an existing inference
 */
export async function updateConfidence(
  shotId: string,
  fieldName: string,
  confidence: number
): Promise<void> {
  const existing = await getByField(shotId, fieldName)
  if (existing) {
    await db.shot_inferences.update(existing.id, { confidence })
  }
}

