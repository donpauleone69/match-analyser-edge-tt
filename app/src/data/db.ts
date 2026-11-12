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
import type { DBVideoAsset } from './entities/videoAssets/videoAsset.types'
import type { DBTrainingPost } from './entities/trainingPosts/trainingPost.types'

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
  video_assets!: EntityTable<DBVideoAsset, 'id'>
  training_posts!: EntityTable<DBTrainingPost, 'id'>
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
      clubs: 'id, name, location',
      tournaments: 'id, name, tournament_type, tournament_host_club_id, start_date',
      players: 'id, last_name, first_name, club_id, playstyle, is_archived',
      matches: 'id, tournament_id, player1_id, player2_id, winner_id, match_date, best_of, match_detail_level, has_video, video_count, step1_complete, step2_complete',
      match_videos: 'id, match_id, sequence_number, start_set_number, end_set_number',
      sets: 'id, match_id, set_number, winner_id, has_video, set_first_server_id, player1_sets_before, player2_sets_before',
      rallies: 'id, set_id, rally_index, video_id, server_id, winner_id, player1_score_before, player2_score_before, framework_confirmed, detail_complete',
      shots: 'id, rally_id, video_id, shot_index, player_id, timestamp_start, shot_label, is_tagged',
      player_profiles: 'id, player_id',
      player_skill_metrics: 'id, player_id, match_id, skill_key, period_type',
    })

    // Version 3: Add shot_inferences table, rename club.location→city, slug-based IDs
    this.version(3).stores({
      clubs: 'id, name, city',
      tournaments: 'id, name, tournament_type, tournament_host_club_id, start_date',
      players: 'id, last_name, first_name, club_id, playstyle, is_archived',
      matches: 'id, tournament_id, player1_id, player2_id, winner_id, match_date, best_of, match_detail_level, has_video, video_count, step1_complete, step2_complete',
      match_videos: 'id, match_id, sequence_number, start_set_number, end_set_number',
      sets: 'id, match_id, set_number, winner_id, has_video, set_first_server_id, player1_sets_before, player2_sets_before',
      rallies: 'id, set_id, rally_index, video_id, server_id, winner_id, player1_score_before, player2_score_before, framework_confirmed, detail_complete',
      shots: 'id, rally_id, video_id, shot_index, player_id, timestamp_start, shot_label, is_tagged',
      shot_inferences: 'id, shot_id, [shot_id+field_name], field_name, inferred',
      player_profiles: 'id, player_id',
      player_skill_metrics: 'id, player_id, match_id, skill_key, period_type',
    })

    // Version 4: Rally Focus schema — new shot tags, rally first_attack_index / point_ending,
    // drop shot_inferences. Old point rows cannot be mapped; clear them on upgrade.
    this.version(4).stores({
      clubs: 'id, name, city',
      tournaments: 'id, name, tournament_type, tournament_host_club_id, start_date',
      players: 'id, last_name, first_name, club_id, playstyle, is_archived',
      matches: 'id, tournament_id, player1_id, player2_id, winner_id, match_date, best_of, match_detail_level, has_video, video_count, step1_complete, step2_complete',
      match_videos: 'id, match_id, sequence_number, start_set_number, end_set_number',
      sets: 'id, match_id, set_number, winner_id, has_video, set_first_server_id, player1_sets_before, player2_sets_before',
      rallies: 'id, set_id, rally_index, video_id, server_id, winner_id, player1_score_before, player2_score_before, framework_confirmed, detail_complete, first_attack_index, point_ending',
      shots: 'id, rally_id, video_id, shot_index, player_id, timestamp_start',
      shot_inferences: null,
      player_profiles: 'id, player_id',
      player_skill_metrics: 'id, player_id, match_id, skill_key, period_type',
    }).upgrade(async (tx) => {
      await tx.table('shots').clear()
      await tx.table('rallies').clear()
      // shot_inferences is deleted by stores: null above; clear if still present mid-upgrade
      try {
        await tx.table('shot_inferences').clear()
      } catch {
        // Table already removed
      }

      const sets = await tx.table('sets').toArray()
      for (const set of sets) {
        await tx.table('sets').update(set.id, {
          is_tagged: false,
          tagging_started_at: null,
          tagging_completed_at: null,
          tagging_phase: 'not_started',
          phase1_last_rally: null,
          phase1_total_rallies: null,
          phase2_last_shot_index: null,
          phase2_total_shots: null,
          inference_complete: null,
          inference_completed_at: null,
        })
      }

      const matches = await tx.table('matches').toArray()
      for (const match of matches) {
        await tx.table('matches').update(match.id, {
          step1_complete: false,
          step2_complete: false,
          match_detail_level: match.has_video ? 'sets' : 'result_only',
        })
      }
    })

    // Version 5: shot_* renamed tags, quality + is_* attribute switches.
    // Old strength/attackable/length/table_contact rows cannot be mapped; clear them.
    this.version(5).stores({
      clubs: 'id, name, city',
      tournaments: 'id, name, tournament_type, tournament_host_club_id, start_date',
      players: 'id, last_name, first_name, club_id, playstyle, is_archived',
      matches: 'id, tournament_id, player1_id, player2_id, winner_id, match_date, best_of, match_detail_level, has_video, video_count, step1_complete, step2_complete',
      match_videos: 'id, match_id, sequence_number, start_set_number, end_set_number',
      sets: 'id, match_id, set_number, winner_id, has_video, set_first_server_id, player1_sets_before, player2_sets_before',
      rallies: 'id, set_id, rally_index, video_id, server_id, winner_id, player1_score_before, player2_score_before, framework_confirmed, detail_complete, first_attack_index, point_ending',
      shots: 'id, rally_id, video_id, shot_index, player_id, timestamp_start',
      player_profiles: 'id, player_id',
      player_skill_metrics: 'id, player_id, match_id, skill_key, period_type',
    }).upgrade(async (tx) => {
      await tx.table('shots').clear()
      await tx.table('rallies').clear()

      const sets = await tx.table('sets').toArray()
      for (const set of sets) {
        await tx.table('sets').update(set.id, {
          is_tagged: false,
          tagging_started_at: null,
          tagging_completed_at: null,
          tagging_phase: 'not_started',
          phase1_last_rally: null,
          phase1_total_rallies: null,
          phase2_last_shot_index: null,
          phase2_total_shots: null,
          inference_complete: null,
          inference_completed_at: null,
        })
      }

      const matches = await tx.table('matches').toArray()
      for (const match of matches) {
        await tx.table('matches').update(match.id, {
          step1_complete: false,
          step2_complete: false,
          match_detail_level: match.has_video ? 'sets' : 'result_only',
        })
      }
    })

    // Version 6: video_assets — stable ids for source videos and exported reels.
    // Additive; legacy per-set files are registered lazily on first read.
    this.version(6).stores({
      clubs: 'id, name, city',
      tournaments: 'id, name, tournament_type, tournament_host_club_id, start_date',
      players: 'id, last_name, first_name, club_id, playstyle, is_archived',
      matches: 'id, tournament_id, player1_id, player2_id, winner_id, match_date, best_of, match_detail_level, has_video, video_count, step1_complete, step2_complete',
      match_videos: 'id, match_id, sequence_number, start_set_number, end_set_number',
      sets: 'id, match_id, set_number, winner_id, has_video, set_first_server_id, player1_sets_before, player2_sets_before',
      rallies: 'id, set_id, rally_index, video_id, server_id, winner_id, player1_score_before, player2_score_before, framework_confirmed, detail_complete, first_attack_index, point_ending',
      shots: 'id, rally_id, video_id, shot_index, player_id, timestamp_start',
      video_assets: 'id, match_id, [match_id+set_number], kind',
      player_profiles: 'id, player_id',
      player_skill_metrics: 'id, player_id, match_id, skill_key, period_type',
    })

    // Version 7: training_posts — practice clips over time (not matches).
    this.version(7).stores({
      clubs: 'id, name, city',
      tournaments: 'id, name, tournament_type, tournament_host_club_id, start_date',
      players: 'id, last_name, first_name, club_id, playstyle, is_archived',
      matches: 'id, tournament_id, player1_id, player2_id, winner_id, match_date, best_of, match_detail_level, has_video, video_count, step1_complete, step2_complete',
      match_videos: 'id, match_id, sequence_number, start_set_number, end_set_number',
      sets: 'id, match_id, set_number, winner_id, has_video, set_first_server_id, player1_sets_before, player2_sets_before',
      rallies: 'id, set_id, rally_index, video_id, server_id, winner_id, player1_score_before, player2_score_before, framework_confirmed, detail_complete, first_attack_index, point_ending',
      shots: 'id, rally_id, video_id, shot_index, player_id, timestamp_start',
      video_assets: 'id, match_id, [match_id+set_number], kind',
      training_posts: 'id, player_id, kind, label, month, [player_id+kind+label]',
      player_profiles: 'id, player_id',
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
    db.video_assets,
    db.training_posts,
    db.player_profiles,
    db.player_skill_metrics,
  ], async () => {
    await db.video_assets.clear()
    await db.training_posts.clear()
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
