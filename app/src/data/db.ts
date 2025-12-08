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
import type { DBShotInference } from './entities/shotInferences/shotInference.types'

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
  shot_inferences!: EntityTable<DBShotInference, 'id'>
  player_profiles!: EntityTable<DBPlayerProfile, 'id'>
  player_skill_metrics!: EntityTable<DBPlayerSkillMetrics, 'id'>

  constructor() {
    super('EdgeTTMatchAnalyser')
    
    // Version 1: Final schema with multi-video support (DEPRECATED)
    this.version(1).stores({
      clubs: 'id, name, location',
      tournaments: 'id, name, tournament_type, tournament_host_club_id, start_date',
      players: 'id, last_name, first_name, club_id, playstyle, is_archived',
      matches: 'id, tournament_id, player1_id, player2_id, winner_id, match_date, best_of, has_video, video_count, step1_complete, step2_complete',
      match_videos: 'id, match_id, sequence_number, start_set_number, end_set_number',
      sets: 'id, match_id, set_number, winner_id, has_video, set_first_server_id, scores_validated',
      rallies: 'id, set_id, rally_index, video_id, server_id, winner_id, framework_confirmed, detail_complete',
      shots: 'id, rally_id, video_id, shot_index, player_id, time, is_tagged',
      player_profiles: 'id, player_id',
      player_skill_metrics: 'id, player_id, match_id, skill_key, period_type',
    })
    
    // Version 2: Schema refactor - field renames, additions, removals (fresh start)
    this.version(2).stores({
      // Clubs
      clubs: 'id, name, location',
      
      // Tournaments
      tournaments: 'id, name, tournament_type, tournament_host_club_id, start_date',
      
      // Players
      players: 'id, last_name, first_name, club_id, playstyle, is_archived',
      
      // Matches (renamed player1_sets_won→player1_sets_final, added match_detail_level, removed set_score_summary)
      matches: 'id, tournament_id, player1_id, player2_id, winner_id, match_date, best_of, match_detail_level, has_video, video_count, step1_complete, step2_complete',
      
      // Match Videos
      match_videos: 'id, match_id, sequence_number, start_set_number, end_set_number',
      
      // Sets (renamed player1_final_score→player1_score_final, added sets_before/after, removed derived fields and validation)
      sets: 'id, match_id, set_number, winner_id, has_video, set_first_server_id, player1_sets_before, player2_sets_before',
      
      // Rallies (added player1_score_before/player2_score_before, removed set context and luck fields)
      rallies: 'id, set_id, rally_index, video_id, server_id, winner_id, player1_score_before, player2_score_before, framework_confirmed, detail_complete',
      
      // Shots (renamed time→timestamp_start, wing→shot_wing, added timestamp_end, serve_type, shot_label, renamed inferred fields)
      shots: 'id, rally_id, video_id, shot_index, player_id, timestamp_start, shot_label, is_tagged',
      
      // Player Profiles (deferred, but schema ready)
      player_profiles: 'id, player_id',
      
      // Player Skill Metrics (deferred, but schema ready)
      player_skill_metrics: 'id, player_id, match_id, skill_key, period_type',
    })
    
    // Version 3: Add shot_inferences table, rename club.location→city, slug-based IDs
    this.version(3).stores({
      // Clubs (renamed location→city, slug-based IDs)
      clubs: 'id, name, city',
      
      // Tournaments (slug-based IDs)
      tournaments: 'id, name, tournament_type, tournament_host_club_id, start_date',
      
      // Players (slug-based IDs)
      players: 'id, last_name, first_name, club_id, playstyle, is_archived',
      
      // Matches (slug-based IDs)
      matches: 'id, tournament_id, player1_id, player2_id, winner_id, match_date, best_of, match_detail_level, has_video, video_count, step1_complete, step2_complete',
      
      // Match Videos (slug-based IDs)
      match_videos: 'id, match_id, sequence_number, start_set_number, end_set_number',
      
      // Sets (slug-based IDs)
      sets: 'id, match_id, set_number, winner_id, has_video, set_first_server_id, player1_sets_before, player2_sets_before',
      
      // Rallies (slug-based IDs)
      rallies: 'id, set_id, rally_index, video_id, server_id, winner_id, player1_score_before, player2_score_before, framework_confirmed, detail_complete',
      
      // Shots (slug-based IDs, removed inferred_ prefixes from field names)
      shots: 'id, rally_id, video_id, shot_index, player_id, timestamp_start, shot_label, is_tagged',
      
      // Shot Inferences (NEW TABLE - tracks which fields were AI inferred vs manual)
      shot_inferences: 'id, shot_id, [shot_id+field_name], field_name, inferred',
      
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
    db.shot_inferences,
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
    await db.shot_inferences.clear()
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
    shotInferenceCount,
  ] = await Promise.all([
    db.clubs.count(),
    db.tournaments.count(),
    db.players.count(),
    db.matches.count(),
    db.match_videos.count(),
    db.sets.count(),
    db.rallies.count(),
    db.shots.count(),
    db.shot_inferences.count(),
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
    shotInferences: shotInferenceCount,
  }
}

