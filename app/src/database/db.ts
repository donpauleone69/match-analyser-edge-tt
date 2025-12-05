/**
 * Dexie Database Schema
 * 
 * IndexedDB database for Edge TT Match Analyser
 * Local-first with future Supabase sync capability
 */

import Dexie, { type EntityTable } from 'dexie'
import type {
  DBTournament,
  DBPlayer,
  DBMatch,
  DBSet,
  DBRally,
  DBShot,
  DBPlayerProfile,
  DBPlayerSkillMetrics,
} from './types'

// =============================================================================
// DATABASE CLASS
// =============================================================================

export class EdgeTTDatabase extends Dexie {
  // Tables
  tournaments!: EntityTable<DBTournament, 'id'>
  players!: EntityTable<DBPlayer, 'id'>
  matches!: EntityTable<DBMatch, 'id'>
  sets!: EntityTable<DBSet, 'id'>
  rallies!: EntityTable<DBRally, 'id'>
  shots!: EntityTable<DBShot, 'id'>
  player_profiles!: EntityTable<DBPlayerProfile, 'id'>
  player_skill_metrics!: EntityTable<DBPlayerSkillMetrics, 'id'>

  constructor() {
    super('EdgeTTMatchAnalyser')
    
    this.version(1).stores({
      // Tournaments
      tournaments: 'id, name, tournament_type, start_date',
      
      // Players
      players: 'id, last_name, first_name, club_id, is_archived',
      
      // Matches
      matches: 'id, tournament_id, player1_id, player2_id, winner_id, match_date, step1_complete, step2_complete',
      
      // Sets
      sets: 'id, match_id, set_number, winner_id',
      
      // Rallies
      rallies: 'id, set_id, rally_index, server_id, winner_id, framework_confirmed, detail_complete',
      
      // Shots
      shots: 'id, rally_id, shot_index, player_id, time, is_tagged',
      
      // Player Profiles (deferred, but schema ready)
      player_profiles: 'id, player_id',
      
      // Player Skill Metrics (deferred, but schema ready)
      player_skill_metrics: 'id, player_id, match_id, skill_key, period_type',
    })
  }
}

// =============================================================================
// DATABASE INSTANCE
// =============================================================================

export const db = new EdgeTTDatabase()

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize database and handle migrations
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Open the database
    await db.open()
    console.log('✅ EdgeTT Database initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize database:', error)
    throw error
  }
}

/**
 * Clear all data (for testing/development)
 */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [
    db.tournaments,
    db.players,
    db.matches,
    db.sets,
    db.rallies,
    db.shots,
    db.player_profiles,
    db.player_skill_metrics,
  ], async () => {
    await db.tournaments.clear()
    await db.players.clear()
    await db.matches.clear()
    await db.sets.clear()
    await db.rallies.clear()
    await db.shots.clear()
    await db.player_profiles.clear()
    await db.player_skill_metrics.clear()
  })
  console.log('✅ All database data cleared')
}

/**
 * Get database stats
 */
export async function getDatabaseStats() {
  const [
    tournamentCount,
    playerCount,
    matchCount,
    setCount,
    rallyCount,
    shotCount,
  ] = await Promise.all([
    db.tournaments.count(),
    db.players.count(),
    db.matches.count(),
    db.sets.count(),
    db.rallies.count(),
    db.shots.count(),
  ])
  
  return {
    tournaments: tournamentCount,
    players: playerCount,
    matches: matchCount,
    sets: setCount,
    rallies: rallyCount,
    shots: shotCount,
  }
}

