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
    setup_starting_score_p1: null,
    setup_starting_score_p2: null,
    setup_next_server_id: null,
    setup_completed_at: null,
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
 * @param setId - The set ID to clear
 * @param mode - Deletion mode:
 *   - 'all': Delete Phase 1 & 2 data (rallies + shots), reset to 'not_started'
 *   - 'phase2_only': Delete Phase 2 data only (reset shots to Phase 1 state), keep Phase 1 rallies
 */
export async function deleteTaggingData(
  setId: string,
  mode: 'all' | 'phase2_only' = 'all'
): Promise<void> {
  if (mode === 'phase2_only') {
    // PHASE 2 ONLY DELETION - Reset shots to Phase 1 state, keep rallies intact
    console.log(`[deleteTaggingData] Phase 2 only deletion for set ${setId}`)
    
    // Get all rallies for this set
    const rallies = await db.rallies.where('set_id').equals(setId).toArray()
    const rallyIds = rallies.map(r => r.id)
    
    if (rallyIds.length > 0) {
      // Reset each shot to Phase 1 state (clear Phase 2 detailed fields)
      for (const rallyId of rallyIds) {
        const shots = await db.shots.where('rally_id').equals(rallyId).toArray()
        
        for (const shot of shots) {
          // Reset Phase 2 fields to null/false, keeping Phase 1 structure intact
          await db.shots.update(shot.id, {
            // Clear Phase 2 detailed data
            shot_origin: null,
            shot_target: null,
            shot_wing: null,
            shot_length: shot.shot_index === 1 || shot.shot_index === 2 ? shot.shot_length : null, // Keep length for serve/receive from Phase 1 if any
            serve_spin_family: null,
            serve_type: null,
            intent: null,
            shot_quality: null,
            intent_quality: null,
            pressure_level: null,
            // Reset tagging flag
            is_tagged: false,
          })
        }
        
        // Reset rally detail_complete flag
        await db.rallies.update(rallyId, {
          detail_complete: false,
        })
      }
    }
    
    // Update set status to phase1_complete (NOT not_started)
    await update(setId, {
      tagging_phase: 'phase1_complete',
      phase2_last_shot_index: null,
      phase2_total_shots: null,
    })
    
    console.log(`[deleteTaggingData] ✓ Phase 2 data cleared, Phase 1 data preserved`)
  } else {
    // FULL DELETION - Delete everything (Phase 1 + Phase 2)
    console.log(`[deleteTaggingData] Full deletion for set ${setId}`)
    
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
    
    // Reset set tagging status to not_started
    await update(setId, {
      is_tagged: false,
      tagging_started_at: null,
      tagging_completed_at: null,
      tagging_phase: 'not_started',
      phase1_last_rally: null,
      phase1_total_rallies: null,
      phase2_last_shot_index: null,
      phase2_total_shots: null,
      setup_starting_score_p1: null,
      setup_starting_score_p2: null,
      setup_next_server_id: null,
      setup_completed_at: null,
    })
    
    console.log(`[deleteTaggingData] ✓ All tagging data deleted`)
  }
}

