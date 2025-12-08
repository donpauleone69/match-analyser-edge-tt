/**
 * Tournament DB Operations
 * Direct Dexie access - pure database CRUD
 */

import { db } from '@/data/db'
import type { DBTournament, NewTournament, TournamentType } from './tournament.types'
import { generateTournamentId } from '@/helpers/generateSlugId'

/**
 * Get all tournaments, sorted by start date (newest first)
 */
export async function getAll(): Promise<DBTournament[]> {
  return await db.tournaments
    .orderBy('start_date')
    .reverse()
    .toArray()
}

/**
 * Get tournament by ID
 */
export async function getById(id: string): Promise<DBTournament | undefined> {
  return await db.tournaments.get(id)
}

/**
 * Get tournaments by type
 */
export async function getByType(type: TournamentType): Promise<DBTournament[]> {
  return await db.tournaments
    .where('tournament_type')
    .equals(type)
    .sortBy('start_date')
}

/**
 * Search tournaments by name
 */
export async function searchByName(searchTerm: string): Promise<DBTournament[]> {
  const all = await db.tournaments.toArray()
  const lowerSearch = searchTerm.toLowerCase()
  return all.filter(t => t.name.toLowerCase().includes(lowerSearch))
}

/**
 * Create a new tournament
 * Generates slug ID based on name and start date
 */
export async function create(data: NewTournament): Promise<DBTournament> {
  const now = new Date().toISOString()
  const startDate = new Date(data.start_date)
  const id = generateTournamentId(data.name, startDate)
  
  const tournament: DBTournament = {
    id,
    ...data,
    created_at: now,
    updated_at: now,
  }
  
  await db.tournaments.add(tournament)
  return tournament
}

/**
 * Update an existing tournament
 */
export async function update(
  id: string,
  updates: Partial<Omit<DBTournament, 'id' | 'created_at'>>
): Promise<DBTournament> {
  const existing = await db.tournaments.get(id)
  if (!existing) {
    throw new Error(`Tournament ${id} not found`)
  }
  
  const updated: DBTournament = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  }
  
  await db.tournaments.put(updated)
  return updated
}

/**
 * Delete a tournament
 */
export async function remove(id: string): Promise<void> {
  await db.tournaments.delete(id)
}

