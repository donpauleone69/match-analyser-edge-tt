/**
 * Match Review IO actions — the only place Match Review writes data.
 */

import { rallyDb, setDb, type DBMatch, type DBSet } from '@/data'
import { resolveSetVideo, storeSetVideo } from '@/data/services/videoAssetService'
import { resolveOpponentId } from '@/helpers/themSide'
import { downloadMatchBundle, pullMatch, pushMatch, uploadVideoAsset, type PushResult } from '@/data/cloud'

export async function backUpMatch(matchId: string, force = false): Promise<PushResult> {
  return pushMatch(matchId, { force })
}

export async function replaceWithCloudCopy(matchId: string): Promise<void> {
  await pullMatch(matchId)
}

export async function backUpSetVideo(
  assetId: string,
  onProgress?: (sent: number, total: number) => void,
): Promise<void> {
  await uploadVideoAsset(assetId, onProgress)
}

export async function saveMatchFile(matchId: string): Promise<void> {
  await downloadMatchBundle(matchId)
}

/** Device copy first, then the cloud copy. */
export async function loadSetVideoUrl(matchId: string, setNumber: number): Promise<string | null> {
  return (await resolveSetVideo(matchId, setNumber))?.url ?? null
}

/**
 * Persist a video picked in the review player so it is there next time.
 * Returns a fresh object URL (the picker's own URL is revoked on close).
 */
export async function saveSetVideoFromUrl(
  matchId: string,
  setNumber: number,
  pickedUrl: string
): Promise<string> {
  const blob = await (await fetch(pickedUrl)).blob()
  const file = new File([blob], `${matchId}-${setNumber}.mp4`, { type: blob.type || 'video/mp4' })
  await storeSetVideo(matchId, setNumber, file)
  return URL.createObjectURL(file)
}

/**
 * Delete rally `fromIndex` and every later rally in the set, so tagging resumes
 * there. Earlier rallies (and their detail tags) are kept.
 */
export async function retagFromRally(setId: string, fromIndex: number): Promise<void> {
  const set = await setDb.getById(setId)
  if (!set) throw new Error('Set not found')
  const rallies = (await rallyDb.getBySetId(setId)).sort((a, b) => a.rally_index - b.rally_index)
  for (const r of rallies.filter((r) => r.rally_index >= fromIndex)) await rallyDb.remove(r.id)
  const kept = rallies.filter((r) => r.rally_index < fromIndex)
  const last = kept[kept.length - 1]
  await setDb.update(setId, {
    tagging_phase: kept.length > 0 ? 'phase2_in_progress' : 'not_started',
    phase1_last_rally: last?.rally_index ?? null,
    player1_score_final: last?.player1_score_after ?? set.setup_starting_score_p1 ?? 0,
    player2_score_final: last?.player2_score_after ?? set.setup_starting_score_p2 ?? 0,
    winner_id: null,
    is_tagged: false,
    tagging_completed_at: null,
  })
}

/** Delete every rally + shot in the set and reset it to not started. */
export async function startSetOver(setId: string): Promise<void> {
  await setDb.deleteTaggingData(setId, 'all')
}

/** Add the next set. First server alternates by set (odd = match first server). */
export async function addNextSet(match: DBMatch, sets: DBSet[]): Promise<DBSet> {
  const setNumber = sets.reduce((max, s) => Math.max(max, s.set_number), 0) + 1
  const opponentId = resolveOpponentId(match.player2_id)
  const firstServer = match.first_server_id || match.player1_id
  const otherServer = firstServer === match.player1_id ? opponentId : match.player1_id
  const setFirstServer = setNumber % 2 === 1 ? firstServer : otherServer
  const created = await setDb.create({
    match_id: match.id,
    set_number: setNumber,
    set_first_server_id: setFirstServer,
    player1_score_final: 0,
    player2_score_final: 0,
    winner_id: null,
    player1_sets_before: 0,
    player1_sets_after: 0,
    player2_sets_before: 0,
    player2_sets_after: 0,
    has_video: false,
    video_segments: [],
    video_contexts: null,
    end_of_set_timestamp: null,
    setup_starting_score_p1: 0,
    setup_starting_score_p2: 0,
    setup_next_server_id: setFirstServer,
    setup_completed_at: null,
    score_confirmed: null,
  })
  // create() resets setup fields; the tagger reads the first server from here.
  return setDb.update(created.id, { setup_next_server_id: setFirstServer })
}
