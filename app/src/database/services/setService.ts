/**
 * Set Service - CRUD operations for sets
 */

import { db } from '../db'
import type { DBSet, NewSet } from '../types'

/**
 * Get all sets for a match
 */
export async function getSetsByMatchId(matchId: string): Promise<DBSet[]> {
  const sets = await db.sets.where('match_id').equals(matchId).toArray()
  
  // Sort by set_number
  return sets.sort((a: DBSet, b: DBSet) => a.set_number - b.set_number)
}

/**
 * Get a single set by ID
 */
export async function getSetById(setId: string): Promise<DBSet | undefined> {
  return await db.sets.get(setId)
}

/**
 * Create a new set
 */
export async function createSet(set: NewSet): Promise<DBSet> {
  const id = crypto.randomUUID()
  
  const newSet: DBSet = {
    ...set,
    id,
    is_tagged: false,
    tagging_started_at: null,
    tagging_completed_at: null,
  }
  
  await db.sets.add(newSet)
  return newSet
}

/**
 * Update a set
 */
export async function updateSet(
  setId: string,
  updates: Partial<Omit<DBSet, 'id'>>
): Promise<DBSet | undefined> {
  const existing = await db.sets.get(setId)
  
  if (!existing) {
    return undefined
  }
  
  const updated: DBSet = {
    ...existing,
    ...updates,
  }
  
  await db.sets.put(updated)
  return updated
}

/**
 * Delete a set and all its rallies and shots
 */
export async function deleteSet(setId: string): Promise<void> {
  // Get all rallies for this set
  const rallies = await db.rallies.where('set_id').equals(setId).toArray()
  
  // Delete all shots for these rallies
  const rallyIds = rallies.map((r: { id: string }) => r.id)
  if (rallyIds.length > 0) {
    for (const rallyId of rallyIds) {
      await db.shots.where('rally_id').equals(rallyId).delete()
    }
  }
  
  // Delete all rallies for this set
  if (rallies.length > 0) {
    await db.rallies.where('set_id').equals(setId).delete()
  }
  
  // Delete the set
  await db.sets.delete(setId)
}

/**
 * Delete all tagging data for a set (rallies and shots), but keep the set record
 * Used for "redo tagging" workflow
 */
export async function deleteSetTaggingData(setId: string): Promise<void> {
  // Get all rallies for this set
  const rallies = await db.rallies.where('set_id').equals(setId).toArray()
  
  // Delete all shots for these rallies
  const rallyIds = rallies.map((r: { id: string }) => r.id)
  if (rallyIds.length > 0) {
    for (const rallyId of rallyIds) {
      await db.shots.where('rally_id').equals(rallyId).delete()
    }
  }
  
  // Delete all rallies for this set
  if (rallies.length > 0) {
    await db.rallies.where('set_id').equals(setId).delete()
  }
  
  // Update set to reset tagging status
  await updateSet(setId, {
    is_tagged: false,
    tagging_started_at: null,
    tagging_completed_at: null,
  })
}

/**
 * Mark set as tagging started
 */
export async function markSetTaggingStarted(setId: string): Promise<void> {
  await updateSet(setId, {
    tagging_started_at: new Date().toISOString(),
  })
}

/**
 * Mark set as tagging completed
 */
export async function markSetTaggingCompleted(setId: string): Promise<void> {
  await updateSet(setId, {
    is_tagged: true,
    tagging_completed_at: new Date().toISOString(),
  })
}

