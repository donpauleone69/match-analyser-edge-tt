/**
 * Derive rally winner_id (100% deterministic)
 * 
 * Logic:
 * - If last shot resulted in error (in_net, missed_long, missed_wide): other player wins
 * - If last shot was winner or opponent couldn't return: last shot player wins
 * - Determined from last shot's player_id and rally_end_role or shot_result
 * 
 * Database Field Populated:
 * - rallies.winner_id
 */

import type { PlayerId } from '../../types'
import type { ShotResult } from '@/data/entities/shots/shot.types'

export interface LastShotInput {
  player_id: PlayerId
  shot_result?: ShotResult | null
  rally_end_role?: 'winner' | 'unforced_error' | 'forced_error' | 'service_fault' | 'receive_error' | null
}

/**
 * Derive rally winner from the last shot.
 * 
 * @param lastShot - The final shot of the rally
 * @param opponentId - The other player's ID (optional, will be computed if not provided)
 * @returns The player_id who won the rally
 */
export function deriveRally_winner_id(
  lastShot: LastShotInput,
  opponentId?: PlayerId
): PlayerId | null {
  if (!lastShot) return null
  
  // Check if last shot was an error
  // shot_result !== 'in_play' means error occurred
  const isError = 
    (lastShot.shot_result && lastShot.shot_result !== 'in_play') ||
    lastShot.rally_end_role === 'unforced_error' ||
    lastShot.rally_end_role === 'forced_error' ||
    lastShot.rally_end_role === 'service_fault' ||
    lastShot.rally_end_role === 'receive_error'
  
  if (isError) {
    // Error shot → other player wins
    // If opponent ID provided, use it; otherwise we need it from context
    if (!opponentId) {
      // Cannot determine winner without opponent ID
      return null
    }
    return opponentId
  }
  
  // Non-error shot → last shot player wins (opponent couldn't return)
  return lastShot.player_id
}

/**
 * Helper: Determine other player ID
 * Useful when you only have one player ID and need the opponent
 * 
 * @param playerId - Current player ID (e.g., 'player1')
 * @param player1Id - Actual player 1 ID
 * @param player2Id - Actual player 2 ID
 * @returns The opponent's ID
 */
export function getOpponentId(
  playerId: PlayerId,
  player1Id: PlayerId,
  player2Id: PlayerId
): PlayerId {
  return playerId === player1Id ? player2Id : player1Id
}

