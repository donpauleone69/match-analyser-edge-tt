/**
 * Set DB Operations
 * Direct Dexie access - pure database CRUD
 */

import { db } from '@/data/db'
import type { DBSet, NewSet } from './set.types'
import { generateSetId } from '@/helpers/generateSlugId'

/**
 * Get all sets for a match, sorted by set number
 */
export async function getByMatchId(matchId: string): Promise<DBSet[]> {
  const sets = await db.sets.where('match_id').equals(matchId).toArray()
  return sets.sort((a, b) => a.set_number - b.set_number)
}

/**
 * Get a single set by ID
 */
export async function getById(setId: string): Promise<DBSet | undefined> {
  return await db.sets.get(setId)
}

/**
 * Create a new set
 * Generates slug ID based on match ID and set number
 */
export async function create(set: NewSet): Promise<DBSet> {
  const id = generateSetId(set.match_id, set.set_number)
  
  const newSet: DBSet = {
    ...set,
    id,
    is_tagged: false,
    tagging_started_at: null,
    tagging_completed_at: null,
    tagging_phase: 'not_started',
    phase1_last_rally: null,
    phase1_total_rallies: null,
    phase2_last_shot_index: null,
    phase2_total_shots: null,
  }
  
  await db.sets.add(newSet)
  return newSet
}

/**
 * Update a set
 */
export async function update(
  setId: string,
  updates: Partial<Omit<DBSet, 'id'>>
): Promise<DBSet> {
  const existing = await db.sets.get(setId)
  if (!existing) {
    throw new Error(`Set ${setId} not found`)
  }
  
  const updated: DBSet = {
    ...existing,
    ...updates,
  }
  
  await db.sets.put(updated)
  return updated
}

/**
 * Mark set as tagging started
 */
export async function markTaggingStarted(setId: string): Promise<void> {
  await update(setId, {
    tagging_started_at: new Date().toISOString()
  })
}

/**
 * Mark set as tagging completed
 */
export async function markTaggingCompleted(setId: string): Promise<void> {
  await update(setId, {
    is_tagged: true,
    tagging_completed_at: new Date().toISOString()
  })
}

/**
 * Delete a set and all its rallies and shots
 */
export async function remove(setId: string): Promise<void> {
  // Get all rallies for this set
  const rallies = await db.rallies.where('set_id').equals(setId).toArray()
  
  // Delete all shots for these rallies
  const rallyIds = rallies.map(r => r.id)
  if (rallyIds.length > 0) {
    for (const rallyId of rallyIds) {
      await db.shots.where('rally_id').equals(rallyId).delete()
    }
  }
  
  // Delete all rallies
  await db.rallies.where('set_id').equals(setId).delete()
  
  // Delete the set
  await db.sets.delete(setId)
}

/**
 * Delete all tagging data for a set (shots and rallies) but keep the set
 */
export async function deleteTaggingData(setId: string): Promise<void> {
  // Get all rallies for this set
  const rallies = await db.rallies.where('set_id').equals(setId).toArray()
  
  // Delete all shots for these rallies
  const rallyIds = rallies.map(r => r.id)
  if (rallyIds.length > 0) {
    for (const rallyId of rallyIds) {
      await db.shots.where('rally_id').equals(rallyId).delete()
    }
  }
  
  // Delete all rallies
  await db.rallies.where('set_id').equals(setId).delete()
  
  // Reset set tagging status
  await update(setId, {
    is_tagged: false,
    tagging_started_at: null,
    tagging_completed_at: null,
    tagging_phase: 'not_started',
    phase1_last_rally: null,
    phase1_total_rallies: null,
    phase2_last_shot_index: null,
    phase2_total_shots: null,
  })
}

