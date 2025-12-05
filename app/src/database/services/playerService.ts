/**
 * Player Service - CRUD operations for players
 */

import { db } from '../db'
import type { DBPlayer, NewPlayer } from '../types'
import { generateId } from '@/helpers/generateId'

/**
 * Get all players (non-archived), sorted by last name
 */
export async function getAllPlayers(): Promise<DBPlayer[]> {
  const allPlayers = await db.players.toArray()
  return allPlayers
    .filter(p => !p.is_archived)
    .sort((a, b) => a.last_name.localeCompare(b.last_name))
}

/**
 * Get all players including archived
 */
export async function getAllPlayersIncludingArchived(): Promise<DBPlayer[]> {
  return await db.players
    .orderBy('last_name')
    .toArray()
}

/**
 * Get player by ID
 */
export async function getPlayerById(id: string): Promise<DBPlayer | undefined> {
  return await db.players.get(id)
}

/**
 * Search players by name
 */
export async function searchPlayersByName(searchTerm: string): Promise<DBPlayer[]> {
  const allPlayers = await getAllPlayers()
  const lowerSearch = searchTerm.toLowerCase()
  return allPlayers.filter(p => 
    p.first_name.toLowerCase().includes(lowerSearch) ||
    p.last_name.toLowerCase().includes(lowerSearch)
  )
}

/**
 * Get players by club
 */
export async function getPlayersByClub(clubId: string): Promise<DBPlayer[]> {
  return await db.players
    .where('club_id')
    .equals(clubId)
    .sortBy('last_name')
}

/**
 * Create a new player
 */
export async function createPlayer(data: NewPlayer): Promise<DBPlayer> {
  const now = new Date().toISOString()
  const player: DBPlayer = {
    id: generateId(),
    ...data,
    created_at: now,
    updated_at: now,
  }
  
  await db.players.add(player)
  return player
}

/**
 * Update an existing player
 */
export async function updatePlayer(
  id: string,
  updates: Partial<Omit<DBPlayer, 'id' | 'created_at'>>
): Promise<DBPlayer | undefined> {
  const existing = await db.players.get(id)
  if (!existing) return undefined
  
  const updated: DBPlayer = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  }
  
  await db.players.put(updated)
  return updated
}

/**
 * Archive a player (soft delete)
 */
export async function archivePlayer(id: string): Promise<void> {
  await updatePlayer(id, { is_archived: 1 as any })
}

/**
 * Unarchive a player
 */
export async function unarchivePlayer(id: string): Promise<void> {
  await updatePlayer(id, { is_archived: 0 as any })
}

/**
 * Delete a player (hard delete - use with caution)
 */
export async function deletePlayer(id: string): Promise<void> {
  await db.players.delete(id)
}

/**
 * Get matches for a player
 */
export async function getMatchesForPlayer(playerId: string) {
  const matches1 = await db.matches
    .where('player1_id')
    .equals(playerId)
    .toArray()
  
  const matches2 = await db.matches
    .where('player2_id')
    .equals(playerId)
    .toArray()
  
  // Combine and deduplicate
  const allMatches = [...matches1, ...matches2]
  const uniqueMatches = Array.from(
    new Map(allMatches.map(m => [m.id, m])).values()
  )
  
  // Sort by date
  return uniqueMatches.sort((a, b) => 
    new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
  )
}

