/**
 * Club DB Operations
 * Direct Dexie access - pure database CRUD
 */

import { db } from '@/data/db'
import type { DBClub, NewClub } from './club.types'
import { generateClubId } from '@/helpers/generateSlugId'

/**
 * Get all clubs, ordered by name
 */
export async function getAll(): Promise<DBClub[]> {
  return await db.clubs.orderBy('name').toArray()
}

/**
 * Get club by ID
 */
export async function getById(id: string): Promise<DBClub | undefined> {
  return await db.clubs.get(id)
}

/**
 * Get club by name (for duplicate checking)
 */
export async function getByName(name: string): Promise<DBClub | undefined> {
  return await db.clubs.where('name').equalsIgnoreCase(name).first()
}

/**
 * Create new club
 * Generates slug ID based on name and city
 */
export async function create(data: NewClub): Promise<DBClub> {
  const now = new Date().toISOString()
  const id = generateClubId(data.name, data.city || 'unknown')
  
  const club: DBClub = {
    id,
    ...data,
    created_at: now,
    updated_at: now,
  }
  
  await db.clubs.add(club)
  return club
}

/**
 * Update existing club
 */
export async function update(id: string, updates: Partial<NewClub>): Promise<DBClub> {
  const existing = await db.clubs.get(id)
  if (!existing) {
    throw new Error(`Club ${id} not found`)
  }
  
  const updated: DBClub = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  }
  
  await db.clubs.put(updated)
  return updated
}

/**
 * Delete club (with validation)
 */
export async function remove(id: string): Promise<void> {
  // Check if club is in use by players
  const playersUsingClub = await db.players.where('club_id').equals(id).count()
  if (playersUsingClub > 0) {
    throw new Error(`Cannot delete club: ${playersUsingClub} players are associated with this club`)
  }
  
  // Check if club is in use by tournaments
  const tournamentsUsingClub = await db.tournaments.where('tournament_host_club_id').equals(id).count()
  if (tournamentsUsingClub > 0) {
    throw new Error(`Cannot delete club: ${tournamentsUsingClub} tournaments are associated with this club`)
  }
  
  await db.clubs.delete(id)
}

