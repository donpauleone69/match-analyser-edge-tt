/**
 * Shot DB Operations
 * Direct Dexie access - pure database CRUD
 */

import { db } from '@/data/db'
import type { DBShot, NewShot } from './shot.types'
import { generateId } from '@/helpers/generateId'

/**
 * Get shots for a rally, sorted by shot index
 */
export async function getByRallyId(rallyId: string): Promise<DBShot[]> {
  return await db.shots
    .where('rally_id')
    .equals(rallyId)
    .sortBy('shot_index')
}

/**
 * Get shot by ID
 */
export async function getById(id: string): Promise<DBShot | undefined> {
  return await db.shots.get(id)
}

/**
 * Create a new shot
 */
export async function create(data: NewShot): Promise<DBShot> {
  const shot: DBShot = {
    id: generateId(),
    ...data,
  }
  
  await db.shots.add(shot)
  return shot
}

/**
 * Bulk create shots
 */
export async function bulkCreate(shots: NewShot[]): Promise<DBShot[]> {
  const dbShots = shots.map(s => ({
    id: generateId(),
    ...s,
  }))
  
  await db.shots.bulkAdd(dbShots)
  return dbShots
}

/**
 * Update a shot
 */
export async function update(
  id: string,
  updates: Partial<Omit<DBShot, 'id'>>
): Promise<DBShot> {
  const existing = await db.shots.get(id)
  if (!existing) {
    throw new Error(`Shot ${id} not found`)
  }
  
  const updated: DBShot = {
    ...existing,
    ...updates,
  }
  
  await db.shots.put(updated)
  return updated
}

/**
 * Delete a shot
 */
export async function remove(id: string): Promise<void> {
  await db.shots.delete(id)
}

/**
 * Delete all shots for a rally
 */
export async function deleteByRallyId(rallyId: string): Promise<void> {
  await db.shots.where('rally_id').equals(rallyId).delete()
}

/**
 * Get all shots for a set (across all rallies), sorted by shot index
 */
export async function getBySetId(setId: string): Promise<DBShot[]> {
  // First get all rallies for the set
  const rallies = await db.rallies.where('set_id').equals(setId).toArray()
  const rallyIds = rallies.map(r => r.id)
  
  // Then get all shots for those rallies
  const allShots: DBShot[] = []
  for (const rallyId of rallyIds) {
    const shots = await db.shots.where('rally_id').equals(rallyId).toArray()
    allShots.push(...shots)
  }
  
  return allShots.sort((a, b) => a.shot_index - b.shot_index)
}

