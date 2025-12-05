/**
 * Dexie Database Schema
 * 
 * IndexedDB database for Edge TT Match Analyser
 * Local-first with future Supabase sync capability
 */

import Dexie, { type EntityTable } from 'dexie'
import type { DBClub } from './entities/clubs/club.types'
import type { DBTournament } from './entities/tournaments/tournament.types'
import type { DBPlayer } from './entities/players/player.types'
import type { DBMatch } from './entities/matches/match.types'
import type { DBMatchVideo } from './entities/matchVideos/matchVideo.types'
import type { DBSet } from './entities/sets/set.types'
import type { DBRally } from './entities/rallies/rally.types'
import type { DBShot } from './entities/shots/shot.types'

// TODO: Add player profiles when needed
type DBPlayerProfile = any
type DBPlayerSkillMetrics = any

// =============================================================================
// DATABASE CLASS
// =============================================================================

export class EdgeTTDatabase extends Dexie {
  // Tables
  clubs!: EntityTable<DBClub, 'id'>
  tournaments!: EntityTable<DBTournament, 'id'>
  players!: EntityTable<DBPlayer, 'id'>
  matches!: EntityTable<DBMatch, 'id'>
  match_videos!: EntityTable<DBMatchVideo, 'id'>
  sets!: EntityTable<DBSet, 'id'>
  rallies!: EntityTable<DBRally, 'id'>
  shots!: EntityTable<DBShot, 'id'>
  player_profiles!: EntityTable<DBPlayerProfile, 'id'>
  player_skill_metrics!: EntityTable<DBPlayerSkillMetrics, 'id'>

  constructor() {
    super('EdgeTTMatchAnalyser')
    
    // Version 1: Final schema with multi-video support (fresh start, no migration)
    this.version(1).stores({
      // Clubs
      clubs: 'id, name, location',
      
      // Tournaments
      tournaments: 'id, name, tournament_type, tournament_host_club_id, start_date',
      
      // Players
      players: 'id, last_name, first_name, club_id, playstyle, is_archived',
      
      // Matches (multi-video support, best_of enum)
      matches: 'id, tournament_id, player1_id, player2_id, winner_id, match_date, best_of, has_video, video_count, step1_complete, step2_complete',
      
      // Match Videos (NEW - multi-video segments)
      match_videos: 'id, match_id, sequence_number, start_set_number, end_set_number',
      
      // Sets (validation and derived fields)
      sets: 'id, match_id, set_number, winner_id, has_video, set_first_server_id, scores_validated',
      
      // Rallies (video_id reference, set context)
      rallies: 'id, set_id, rally_index, video_id, server_id, winner_id, framework_confirmed, detail_complete',
      
      // Shots (video_id reference)
      shots: 'id, rally_id, video_id, shot_index, player_id, time, is_tagged',
      
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
    db.clubs,
    db.tournaments,
    db.players,
    db.matches,
    db.match_videos,
    db.sets,
    db.rallies,
    db.shots,
    db.player_profiles,
    db.player_skill_metrics,
  ], async () => {
    await db.clubs.clear()
    await db.tournaments.clear()
    await db.players.clear()
    await db.matches.clear()
    await db.match_videos.clear()
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
    clubCount,
    tournamentCount,
    playerCount,
    matchCount,
    matchVideoCount,
    setCount,
    rallyCount,
    shotCount,
  ] = await Promise.all([
    db.clubs.count(),
    db.tournaments.count(),
    db.players.count(),
    db.matches.count(),
    db.match_videos.count(),
    db.sets.count(),
    db.rallies.count(),
    db.shots.count(),
  ])
  
  return {
    clubs: clubCount,
    tournaments: tournamentCount,
    players: playerCount,
    matches: matchCount,
    matchVideos: matchVideoCount,
    sets: setCount,
    rallies: rallyCount,
    shots: shotCount,
  }
}

