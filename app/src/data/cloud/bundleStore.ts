/**
 * Read / write match bundles against the local Dexie database.
 */

import { db } from '@/data/db'
import { createMatchBundle, mergeVideoAssets, type MatchBundle } from './matchBundle'

export async function readMatchBundle(matchId: string): Promise<MatchBundle | null> {
  const match = await db.matches.get(matchId)
  if (!match) return null
  const sets = await db.sets.where('match_id').equals(matchId).toArray()
  const rallies = sets.length > 0 ? await db.rallies.where('set_id').anyOf(sets.map((s) => s.id)).toArray() : []
  const shots = rallies.length > 0 ? await db.shots.where('rally_id').anyOf(rallies.map((r) => r.id)).toArray() : []
  const playerIds = [match.player1_id, match.player2_id].filter((id): id is string => Boolean(id))
  const players = (await db.players.bulkGet(playerIds)).filter((p): p is NonNullable<typeof p> => Boolean(p))
  const tournament = match.tournament_id ? (await db.tournaments.get(match.tournament_id)) ?? null : null
  const videoAssets = await db.video_assets.where('match_id').equals(matchId).toArray()
  return createMatchBundle({ match, sets, rallies, shots, players, tournament, videoAssets })
}

/**
 * Replace this device's copy of a match with the bundle (one transaction).
 * Players and tournament are upserted; rows the bundle no longer has are removed.
 * Video files on this device are kept and re-linked by asset id.
 */
export async function writeMatchBundle(bundle: MatchBundle): Promise<void> {
  const matchId = bundle.match.id
  await db.transaction(
    'rw',
    [db.matches, db.sets, db.rallies, db.shots, db.players, db.tournaments, db.video_assets],
    async () => {
      const oldSets = await db.sets.where('match_id').equals(matchId).toArray()
      const oldSetIds = oldSets.map((s) => s.id)
      const oldRallies = oldSetIds.length > 0 ? await db.rallies.where('set_id').anyOf(oldSetIds).toArray() : []
      if (oldRallies.length > 0) await db.shots.where('rally_id').anyOf(oldRallies.map((r) => r.id)).delete()
      if (oldSetIds.length > 0) await db.rallies.where('set_id').anyOf(oldSetIds).delete()
      await db.sets.where('match_id').equals(matchId).delete()

      if (bundle.players.length > 0) await db.players.bulkPut(bundle.players)
      if (bundle.tournament) await db.tournaments.put(bundle.tournament)
      await db.matches.put(bundle.match)
      if (bundle.sets.length > 0) await db.sets.bulkPut(bundle.sets)
      if (bundle.rallies.length > 0) await db.rallies.bulkPut(bundle.rallies)
      if (bundle.shots.length > 0) await db.shots.bulkPut(bundle.shots)

      const localAssets = await db.video_assets.where('match_id').equals(matchId).toArray()
      const merged = mergeVideoAssets(bundle.videoAssets, localAssets)
      const keepIds = new Set(merged.map((a) => a.id))
      // Assets only on this device (not yet synced) stay
      const deviceOnly = localAssets.filter((a) => !keepIds.has(a.id))
      await db.video_assets.bulkPut([...merged, ...deviceOnly])
    }
  )
}
