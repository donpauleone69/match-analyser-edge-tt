/**
 * Rally DB Operations
 * Direct Dexie access - pure database CRUD
 */

import { db } from '@/data/db'
import type { DBRally, NewRally } from './rally.types'
import { generateRallyId } from '@/helpers/generateSlugId'

/**
 * Get rallies for a set, sorted by rally index
 */
export async function getBySetId(setId: string): Promise<DBRally[]> {
  return await db.rallies
    .where('set_id')
    .equals(setId)
    .sortBy('rally_index')
}

/**
 * Get rally by ID
 */
export async function getById(id: string): Promise<DBRally | undefined> {
  return await db.rallies.get(id)
}

/**
 * Create a new rally
 * Generates slug ID: {set_id}-r{rally_index}
 */
export async function create(data: NewRally): Promise<DBRally> {
  const rally: DBRally = {
    id: generateRallyId(data.set_id, data.rally_index),
    ...data,
  }
  
  await db.rallies.add(rally)
  return rally
}

/**
 * Bulk create rallies
 * Generates slug IDs: {set_id}-r{rally_index}
 */
export async function bulkCreate(rallies: NewRally[]): Promise<DBRally[]> {
  const dbRallies = rallies.map(r => ({
    id: generateRallyId(r.set_id, r.rally_index),
    ...r,
  }))
  
  await db.rallies.bulkAdd(dbRallies)
  return dbRallies
}

/**
 * Update a rally
 */
export async function update(
  id: string,
  updates: Partial<Omit<DBRally, 'id'>>
): Promise<DBRally> {
  const existing = await db.rallies.get(id)
  if (!existing) {
    throw new Error(`Rally ${id} not found`)
  }
  
  const updated: DBRally = {
    ...existing,
    ...updates,
  }
  
  await db.rallies.put(updated)
  return updated
}

/**
 * Delete a rally and all its shots
 */
export async function remove(id: string): Promise<void> {
  // Delete all shots for this rally
  await db.shots.where('rally_id').equals(id).delete()
  
  // Delete the rally
  await db.rallies.delete(id)
}

/**
 * Delete all rallies for a set (and their shots)
 */
export async function deleteBySetId(setId: string): Promise<void> {
  const rallies = await getBySetId(setId)
  
  for (const rally of rallies) {
    await remove(rally.id)
  }
}

