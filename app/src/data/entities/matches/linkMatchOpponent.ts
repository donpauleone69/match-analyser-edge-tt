/**
 * Attach a real opponent to a match that was tagged with Villain (null player ids).
 * Fills null player FKs on rallies and shots for this match.
 */

import { db } from '@/data/db'
import { isThemSideId } from '@/helpers/themSide'

export async function linkMatchOpponent(
  matchId: string,
  player2Id: string
): Promise<void> {
  const match = await db.matches.get(matchId)
  if (!match) throw new Error(`Match ${matchId} not found`)

  const opponent = await db.players.get(player2Id)
  if (!opponent) throw new Error(`Player ${player2Id} not found`)
  if (player2Id === match.player1_id) {
    throw new Error('Opponent must be different from the focal player')
  }

  const sets = await db.sets.where('match_id').equals(matchId).toArray()
  const setIds = sets.map((s) => s.id)
  const rallies =
    setIds.length > 0
      ? await db.rallies.where('set_id').anyOf(setIds).toArray()
      : []
  const rallyIds = rallies.map((r) => r.id)
  const shots =
    rallyIds.length > 0
      ? await db.shots.where('rally_id').anyOf(rallyIds).toArray()
      : []

  await db.transaction(
    'rw',
    [db.matches, db.sets, db.rallies, db.shots],
    async () => {
      await db.matches.update(matchId, { player2_id: player2Id })

      for (const set of sets) {
        const updates: Record<string, string> = {}
        if (isThemSideId(set.set_first_server_id)) {
          updates.set_first_server_id = player2Id
        }
        if (isThemSideId(set.setup_next_server_id)) {
          updates.setup_next_server_id = player2Id
        }
        // Only fill a null winner when Villain won the set (not a tie).
        if (
          set.is_tagged &&
          isThemSideId(set.winner_id) &&
          set.player2_score_final > set.player1_score_final
        ) {
          updates.winner_id = player2Id
        }
        if (Object.keys(updates).length > 0) {
          await db.sets.update(set.id, updates)
        }
      }

      for (const rally of rallies) {
        const updates: Partial<{
          server_id: string
          receiver_id: string
          winner_id: string
        }> = {}
        if (isThemSideId(rally.server_id)) updates.server_id = player2Id
        if (isThemSideId(rally.receiver_id)) updates.receiver_id = player2Id
        // Scoring rally with null winner = Villain won that point.
        if (rally.is_scoring && isThemSideId(rally.winner_id)) {
          updates.winner_id = player2Id
        }
        if (Object.keys(updates).length > 0) {
          await db.rallies.update(rally.id, updates)
        }
      }

      for (const shot of shots) {
        if (isThemSideId(shot.player_id)) {
          await db.shots.update(shot.id, { player_id: player2Id })
        }
      }
    }
  )
}
