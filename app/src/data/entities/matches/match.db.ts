/**
 * Match DB Operations
 * Direct Dexie access - pure database CRUD
 */

import { db } from '@/data/db'
import type { DBMatch, NewMatch } from './match.types'
import type { DBSet } from '../sets/set.types'
import type { DBRally } from '../rallies/rally.types'
import type { DBShot } from '../shots/shot.types'
import { generateMatchId } from '@/helpers/generateSlugId'

// Named export for consistency with other entities
export const matchDb = {
  getAll,
  getById,
  getIncomplete,
  create,
  update,
  remove,
  getCompleteMatchData,
  saveCompleteMatch,
}

/**
 * Get all matches, sorted by date (newest first)
 */
export async function getAll(): Promise<DBMatch[]> {
  return await db.matches
    .orderBy('match_date')
    .reverse()
    .toArray()
}

/**
 * Get match by ID
 */
export async function getById(id: string): Promise<DBMatch | undefined> {
  return await db.matches.get(id)
}

/**
 * Get incomplete matches (for resuming tagging)
 */
export async function getIncomplete(): Promise<DBMatch[]> {
  const allMatches = await db.matches.toArray()
  return allMatches.filter(m => 
    m.tagging_mode !== null && (!m.step1_complete || !m.step2_complete)
  )
}

/**
 * Create a new match
 * Generates slug ID based on player names and match date
 */
export async function create(data: NewMatch): Promise<DBMatch> {
  // Look up player names to generate slug
  const player1 = await db.players.get(data.player1_id)
  const player2 = await db.players.get(data.player2_id)
  
  if (!player1 || !player2) {
    throw new Error('Cannot create match: player not found')
  }
  
  // Generate slug ID: {p1short}-vs-{p2short}-{yyyymmdd}-{id4}
  const matchDate = new Date(data.match_date)
  const id = generateMatchId(
    player1.first_name,
    player1.last_name,
    player2.first_name,
    player2.last_name,
    matchDate
  )
  
  const match: DBMatch = {
    id,
    ...data,
    created_at: new Date().toISOString(),
  }
  
  await db.matches.add(match)
  return match
}

/**
 * Update an existing match
 */
export async function update(
  id: string,
  updates: Partial<Omit<DBMatch, 'id' | 'created_at'>>
): Promise<DBMatch> {
  const existing = await db.matches.get(id)
  if (!existing) {
    throw new Error(`Match ${id} not found`)
  }
  
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
export async function remove(id: string): Promise<void> {
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
// COMPLETE MATCH DATA
// =============================================================================

export interface CompleteMatchData {
  match: DBMatch
  sets: DBSet[]
  rallies: DBRally[]
  shots: DBShot[]
}

/**
 * Get complete match data (match + sets + rallies + shots)
 */
export async function getCompleteMatchData(matchId: string): Promise<CompleteMatchData | null> {
  const match = await getById(matchId)
  if (!match) return null

  const sets = await db.sets.where('match_id').equals(matchId).toArray()
  const setIds = sets.map(s => s.id)
  
  const rallies = setIds.length > 0 
    ? await db.rallies.where('set_id').anyOf(setIds).toArray()
    : []
  
  const rallyIds = rallies.map(r => r.id)
  const shots = rallyIds.length > 0
    ? await db.shots.where('rally_id').anyOf(rallyIds).toArray()
    : []

  return {
    match,
    sets,
    rallies,
    shots,
  }
}

/**
 * Save complete match with all sets, rallies, and shots in a single transaction
 */
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

