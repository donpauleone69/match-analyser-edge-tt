/**
 * Match Service - CRUD operations for matches and related entities (sets, rallies, shots)
 */

import { db } from '../db'
import type { 
  DBMatch, 
  DBSet, 
  DBRally, 
  DBShot,
  NewMatch,
  NewSet,
  NewRally,
  NewShot 
} from '../types'
import { generateId } from '@/helpers/generateId'

// =============================================================================
// MATCH CRUD
// =============================================================================

/**
 * Get all matches, sorted by date (newest first)
 */
export async function getAllMatches(): Promise<DBMatch[]> {
  return await db.matches
    .orderBy('match_date')
    .reverse()
    .toArray()
}

/**
 * Get match by ID
 */
export async function getMatchById(id: string): Promise<DBMatch | undefined> {
  return await db.matches.get(id)
}

/**
 * Get incomplete matches (for resuming tagging)
 */
export async function getIncompleteMatches(): Promise<DBMatch[]> {
  const allMatches = await db.matches.toArray()
  return allMatches.filter(m => 
    m.tagging_mode !== null && (!m.step1_complete || !m.step2_complete)
  )
}

/**
 * Create a new match
 */
export async function createMatch(data: NewMatch): Promise<DBMatch> {
  const match: DBMatch = {
    id: generateId(),
    ...data,
    created_at: new Date().toISOString(),
  }
  
  await db.matches.add(match)
  
  // Create placeholder set records based on match score
  const totalSets = data.player1_sets_won + data.player2_sets_won
  if (totalSets > 0) {
    const sets: DBSet[] = []
    
    // Determine which player won each set (alternating pattern for placeholder)
    let player1Wins = 0
    let player2Wins = 0
    
    for (let i = 0; i < totalSets; i++) {
      const setNumber = i + 1
      let winnerId: string
      
      // Alternate winners until we reach the actual counts
      // This is a placeholder - user can tag to get real scores
      if (player1Wins < data.player1_sets_won && (player2Wins >= data.player2_sets_won || i % 2 === 0)) {
        winnerId = data.player1_id
        player1Wins++
      } else {
        winnerId = data.player2_id
        player2Wins++
      }
      
      const set: DBSet = {
        id: generateId(),
        match_id: match.id,
        set_number: setNumber,
        first_server_id: data.first_server_id,
        player1_final_score: 0, // Placeholder - will be filled during tagging
        player2_final_score: 0, // Placeholder - will be filled during tagging
        winner_id: winnerId,
        has_video: false, // Default to no video - user can tag specific sets
        video_start_player1_score: null,
        video_start_player2_score: null,
        end_of_set_timestamp: null,
        is_tagged: false,
        tagging_started_at: null,
        tagging_completed_at: null,
      }
      
      sets.push(set)
    }
    
    // Add all sets to database
    await db.sets.bulkAdd(sets)
  }
  
  return match
}

/**
 * Update an existing match
 */
export async function updateMatch(
  id: string,
  updates: Partial<Omit<DBMatch, 'id' | 'created_at'>>
): Promise<DBMatch | undefined> {
  const existing = await db.matches.get(id)
  if (!existing) return undefined
  
  const updated: DBMatch = {
    ...existing,
    ...updates,
  }
  
  await db.matches.put(updated)
  return updated
}

/**
 * Delete a match and all related data (sets, rallies, shots)
 */
export async function deleteMatch(id: string): Promise<void> {
  await db.transaction('rw', [db.matches, db.sets, db.rallies, db.shots], async () => {
    // Get all sets for this match
    const sets = await db.sets.where('match_id').equals(id).toArray()
    const setIds = sets.map(s => s.id)
    
    // Get all rallies for these sets
    const rallies = await db.rallies.where('set_id').anyOf(setIds).toArray()
    const rallyIds = rallies.map(r => r.id)
    
    // Delete all shots for these rallies
    await db.shots.where('rally_id').anyOf(rallyIds).delete()
    
    // Delete all rallies
    await db.rallies.where('set_id').anyOf(setIds).delete()
    
    // Delete all sets
    await db.sets.where('match_id').equals(id).delete()
    
    // Delete the match
    await db.matches.delete(id)
  })
}

// =============================================================================
// SET CRUD
// =============================================================================

/**
 * Get sets for a match
 */
export async function getSetsForMatch(matchId: string): Promise<DBSet[]> {
  return await db.sets
    .where('match_id')
    .equals(matchId)
    .sortBy('set_number')
}

/**
 * Get set by ID
 */
export async function getSetById(id: string): Promise<DBSet | undefined> {
  return await db.sets.get(id)
}

/**
 * Create a new set
 */
export async function createSet(data: NewSet): Promise<DBSet> {
  const set: DBSet = {
    id: generateId(),
    ...data,
    is_tagged: false,
    tagging_started_at: null,
    tagging_completed_at: null,
  }
  
  await db.sets.add(set)
  return set
}

/**
 * Update a set
 */
export async function updateSet(
  id: string,
  updates: Partial<Omit<DBSet, 'id'>>
): Promise<DBSet | undefined> {
  const existing = await db.sets.get(id)
  if (!existing) return undefined
  
  const updated: DBSet = {
    ...existing,
    ...updates,
  }
  
  await db.sets.put(updated)
  return updated
}

// =============================================================================
// RALLY CRUD
// =============================================================================

/**
 * Get rallies for a set
 */
export async function getRalliesForSet(setId: string): Promise<DBRally[]> {
  return await db.rallies
    .where('set_id')
    .equals(setId)
    .sortBy('rally_index')
}

/**
 * Get rally by ID
 */
export async function getRallyById(id: string): Promise<DBRally | undefined> {
  return await db.rallies.get(id)
}

/**
 * Create a new rally
 */
export async function createRally(data: NewRally): Promise<DBRally> {
  const rally: DBRally = {
    id: generateId(),
    ...data,
  }
  
  await db.rallies.add(rally)
  return rally
}

/**
 * Update a rally
 */
export async function updateRally(
  id: string,
  updates: Partial<Omit<DBRally, 'id'>>
): Promise<DBRally | undefined> {
  const existing = await db.rallies.get(id)
  if (!existing) return undefined
  
  const updated: DBRally = {
    ...existing,
    ...updates,
  }
  
  await db.rallies.put(updated)
  return updated
}

/**
 * Bulk create rallies
 */
export async function bulkCreateRallies(rallies: NewRally[]): Promise<DBRally[]> {
  const dbRallies = rallies.map(r => ({
    id: generateId(),
    ...r,
  }))
  
  await db.rallies.bulkAdd(dbRallies)
  return dbRallies
}

// =============================================================================
// SHOT CRUD
// =============================================================================

/**
 * Get shots for a rally
 */
export async function getShotsForRally(rallyId: string): Promise<DBShot[]> {
  return await db.shots
    .where('rally_id')
    .equals(rallyId)
    .sortBy('shot_index')
}

/**
 * Get shot by ID
 */
export async function getShotById(id: string): Promise<DBShot | undefined> {
  return await db.shots.get(id)
}

/**
 * Create a new shot
 */
export async function createShot(data: NewShot): Promise<DBShot> {
  const shot: DBShot = {
    id: generateId(),
    ...data,
  }
  
  await db.shots.add(shot)
  return shot
}

/**
 * Update a shot
 */
export async function updateShot(
  id: string,
  updates: Partial<Omit<DBShot, 'id'>>
): Promise<DBShot | undefined> {
  const existing = await db.shots.get(id)
  if (!existing) return undefined
  
  const updated: DBShot = {
    ...existing,
    ...updates,
  }
  
  await db.shots.put(updated)
  return updated
}

/**
 * Bulk create shots
 */
export async function bulkCreateShots(shots: NewShot[]): Promise<DBShot[]> {
  const dbShots = shots.map(s => ({
    id: generateId(),
    ...s,
  }))
  
  await db.shots.bulkAdd(dbShots)
  return dbShots
}

// =============================================================================
// COMPLETE MATCH SAVE (with all related data)
// =============================================================================

/**
 * Save complete match with all sets, rallies, and shots in a single transaction
 */
export interface CompleteMatchData {
  match: DBMatch
  sets: DBSet[]
  rallies: DBRally[]
  shots: DBShot[]
}

export async function saveCompleteMatch(data: CompleteMatchData): Promise<void> {
  await db.transaction('rw', [db.matches, db.sets, db.rallies, db.shots], async () => {
    // Save match
    await db.matches.put(data.match)
    
    // Save sets
    if (data.sets.length > 0) {
      await db.sets.bulkPut(data.sets)
    }
    
    // Save rallies
    if (data.rallies.length > 0) {
      await db.rallies.bulkPut(data.rallies)
    }
    
    // Save shots
    if (data.shots.length > 0) {
      await db.shots.bulkPut(data.shots)
    }
  })
}

/**
 * Get complete match data (match + sets + rallies + shots)
 */
export async function getCompleteMatchData(matchId: string): Promise<CompleteMatchData | null> {
  const match = await getMatchById(matchId)
  if (!match) return null
  
  const sets = await getSetsForMatch(matchId)
  const setIds = sets.map(s => s.id)
  
  const rallies = await db.rallies
    .where('set_id')
    .anyOf(setIds)
    .toArray()
  
  const rallyIds = rallies.map(r => r.id)
  
  const shots = await db.shots
    .where('rally_id')
    .anyOf(rallyIds)
    .toArray()
  
  return {
    match,
    sets,
    rallies,
    shots,
  }
}

