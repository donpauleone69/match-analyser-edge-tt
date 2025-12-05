/**
 * Edge TT Match Analyser — Shot Player Calculation
 * 
 * Pure function to determine which player hits a specific shot in a rally.
 * 
 * Table tennis rules:
 * - Server hits shot 1 (serve)
 * - Receiver hits shot 2 (return)
 * - Players alternate every shot thereafter
 */

import type { PlayerId } from './types'
import { otherPlayer } from './calculateServer'

/**
 * Calculate which player hits a specific shot in a rally.
 * 
 * @param serverId - Who served this rally
 * @param shotIndex - 1-based index (1 = serve, 2 = return, 3 = 3rd shot, etc.)
 * @returns PlayerId of the shot player
 * 
 * @example
 * // Server hits odd-indexed shots
 * calculateShotPlayer('player1', 1) // => 'player1' (serve)
 * calculateShotPlayer('player1', 3) // => 'player1' (3rd shot)
 * 
 * // Receiver hits even-indexed shots
 * calculateShotPlayer('player1', 2) // => 'player2' (return)
 * calculateShotPlayer('player1', 4) // => 'player2' (4th shot)
 */
export function calculateShotPlayer(
  serverId: PlayerId,
  shotIndex: number
): PlayerId {
  // Server hits odd-indexed shots (1, 3, 5...)
  // Receiver hits even-indexed shots (2, 4, 6...)
  return shotIndex % 2 === 1 ? serverId : otherPlayer(serverId)
}



