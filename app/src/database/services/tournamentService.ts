/**
 * Tournament Service - CRUD operations for tournaments
 */

import { db } from '../db'
import type { DBTournament, NewTournament, TournamentType } from '../types'
import { generateId } from '@/helpers/generateId'

/**
 * Get all tournaments, sorted by start date (newest first)
 */
export async function getAllTournaments(): Promise<DBTournament[]> {
  return await db.tournaments
    .orderBy('start_date')
    .reverse()
    .toArray()
}

/**
 * Get tournament by ID
 */
export async function getTournamentById(id: string): Promise<DBTournament | undefined> {
  return await db.tournaments.get(id)
}

/**
 * Get tournaments by type
 */
export async function getTournamentsByType(type: TournamentType): Promise<DBTournament[]> {
  return await db.tournaments
    .where('tournament_type')
    .equals(type)
    .sortBy('start_date')
}

/**
 * Search tournaments by name
 */
export async function searchTournamentsByName(searchTerm: string): Promise<DBTournament[]> {
  const allTournaments = await db.tournaments.toArray()
  const lowerSearch = searchTerm.toLowerCase()
  return allTournaments.filter(t => 
    t.name.toLowerCase().includes(lowerSearch)
  )
}

/**
 * Create a new tournament
 */
export async function createTournament(data: NewTournament): Promise<DBTournament> {
  const now = new Date().toISOString()
  const tournament: DBTournament = {
    id: generateId(),
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
export async function updateTournament(
  id: string,
  updates: Partial<Omit<DBTournament, 'id' | 'created_at'>>
): Promise<DBTournament | undefined> {
  const existing = await db.tournaments.get(id)
  if (!existing) return undefined
  
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
export async function deleteTournament(id: string): Promise<void> {
  await db.tournaments.delete(id)
}

/**
 * Get matches for a tournament
 */
export async function getMatchesForTournament(tournamentId: string) {
  return await db.matches
    .where('tournament_id')
    .equals(tournamentId)
    .toArray()
}

