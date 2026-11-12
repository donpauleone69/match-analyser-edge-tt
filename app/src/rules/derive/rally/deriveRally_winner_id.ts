/**
 * Derive rally winner_id (100% deterministic)
 *
 * Rally Focus endings:
 * - winner / lucky → last-shot player wins
 * - error_net / error_long / error_wide → opponent wins
 */

import type { PointEnding } from '@/data'

type PlayerId = string

export interface LastShotForWinner {
  player_id: PlayerId
  point_ending: PointEnding
}

/**
 * Derive rally winner from the last shot player and the point ending.
 */
export function deriveRally_winner_id(
  lastShot: LastShotForWinner,
  opponentId: PlayerId
): PlayerId {
  if (lastShot.point_ending === 'winner' || lastShot.point_ending === 'lucky') {
    return lastShot.player_id
  }
  return opponentId
}

/**
 * Helper: Determine other player ID
 */
export function getOpponentId(
  playerId: PlayerId,
  player1Id: PlayerId,
  player2Id: PlayerId
): PlayerId {
  return playerId === player1Id ? player2Id : player1Id
}

/**
 * Player who hit shot N when players alternate from the server.
 * Shot 1 = server.
 */
export function playerIdForShotIndex(
  shotIndex: number,
  serverId: PlayerId,
  player1Id: PlayerId,
  player2Id: PlayerId
): PlayerId {
  const other = getOpponentId(serverId, player1Id, player2Id)
  return shotIndex % 2 === 1 ? serverId : other
}
