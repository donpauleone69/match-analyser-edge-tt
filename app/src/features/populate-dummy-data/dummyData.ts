/**
 * Dummy Data for Testing
 * 
 * This file contains the dummy data that will be populated when the user
 * clicks "Populate Dummy Data" in Settings.
 * 
 * Add more test data here as needed for future testing scenarios.
 */

import type { NewPlayer } from '@/data/entities/players/player.types'
import type { NewMatch } from '@/data/entities/matches/match.types'

/**
 * Dummy Players
 */
export const DUMMY_PLAYERS: NewPlayer[] = [
  {
    first_name: 'Paul',
    last_name: 'Overton',
    handedness: 'right',
    playstyle: 'attacker',
    club_id: null,
    is_archived: false,
  },
  {
    first_name: 'Ethan',
    last_name: 'Overton',
    handedness: 'right',
    playstyle: 'attacker',
    club_id: null,
    is_archived: false,
  },
  {
    first_name: 'Ricardo',
    last_name: 'Santos',
    handedness: 'right',
    playstyle: 'attacker',
    club_id: null,
    is_archived: false,
  },
  {
    first_name: 'Paulo',
    last_name: 'Rocha',
    handedness: 'right',
    playstyle: 'attacker',
    club_id: null,
    is_archived: false,
  },
]

/**
 * Generate dummy matches
 * Note: This function returns a generator function because we need player IDs first
 */
export function generateDummyMatches(playerMap: Map<string, string>): Omit<NewMatch, 'id' | 'created_at'>[] {
  const matchDate = '2025-12-10' // Today's date
  
  const paulId = playerMap.get('Paul Overton')
  const ethanId = playerMap.get('Ethan Overton')
  const ricardoId = playerMap.get('Ricardo Santos')
  const pauloId = playerMap.get('Paulo Rocha')
  
  if (!paulId || !ethanId || !ricardoId || !pauloId) {
    throw new Error('Failed to find all required player IDs')
  }

  return [
    {
      tournament_id: null,
      round: null,
      player1_id: paulId,
      player2_id: ricardoId,
      first_server_id: paulId,
      winner_id: null,
      player1_sets_final: 0,
      player2_sets_final: 0,
      best_of: 3,
      match_date: matchDate,
      tagging_mode: null,
      match_detail_level: 'result_only',
      has_video: false,
      video_count: 0,
      total_coverage: 'partial',
      step1_complete: false,
      step2_complete: false,
    },
    {
      tournament_id: null,
      round: null,
      player1_id: ethanId,
      player2_id: pauloId,
      first_server_id: ethanId,
      winner_id: null,
      player1_sets_final: 0,
      player2_sets_final: 0,
      best_of: 3,
      match_date: matchDate,
      tagging_mode: null,
      match_detail_level: 'result_only',
      has_video: false,
      video_count: 0,
      total_coverage: 'partial',
      step1_complete: false,
      step2_complete: false,
    },
  ]
}




