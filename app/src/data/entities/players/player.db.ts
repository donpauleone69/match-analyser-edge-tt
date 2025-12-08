/**
 * Player DB Operations
 * Direct Dexie access - pure database CRUD
 */

import { db } from '@/data/db'
import type { DBPlayer, NewPlayer } from './player.types'
import { generatePlayerId } from '@/helpers/generateSlugId'

/**
 * Get all players (non-archived), sorted by last name
 */
export async function getAll(): Promise<DBPlayer[]> {
  const all = await db.players.toArray()
  return all
    .filter(p => !p.is_archived)
    .sort((a, b) => a.last_name.localeCompare(b.last_name))
}

/**
 * Get all players including archived
 */
export async function getAllIncludingArchived(): Promise<DBPlayer[]> {
  return await db.players
    .orderBy('last_name')
    .toArray()
}

/**
 * Get player by ID
 */
export async function getById(id: string): Promise<DBPlayer | undefined> {
  return await db.players.get(id)
}

/**
 * Search players by name
 */
export async function searchByName(searchTerm: string): Promise<DBPlayer[]> {
  const all = await getAll()
  const lowerSearch = searchTerm.toLowerCase()
  return all.filter(p => 
    p.first_name.toLowerCase().includes(lowerSearch) ||
    p.last_name.toLowerCase().includes(lowerSearch)
  )
}

/**
 * Get players by club
 */
export async function getByClub(clubId: string): Promise<DBPlayer[]> {
  return await db.players
    .where('club_id')
    .equals(clubId)
    .sortBy('last_name')
}

/**
 * Create a new player
 * Generates slug ID based on first and last name
 */
export async function create(data: NewPlayer): Promise<DBPlayer> {
  const now = new Date().toISOString()
  const id = generatePlayerId(data.first_name, data.last_name)
  
  const player: DBPlayer = {
    id,
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
export async function update(
  id: string,
  updates: Partial<Omit<DBPlayer, 'id' | 'created_at'>>
): Promise<DBPlayer> {
  const existing = await db.players.get(id)
  if (!existing) {
    throw new Error(`Player ${id} not found`)
  }
  
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
export async function archive(id: string): Promise<void> {
  await update(id, { is_archived: true })
}

/**
 * Unarchive a player
 */
export async function unarchive(id: string): Promise<void> {
  await update(id, { is_archived: false })
}

/**
 * Delete a player (hard delete)
 */
export async function remove(id: string): Promise<void> {
  await db.players.delete(id)
}

