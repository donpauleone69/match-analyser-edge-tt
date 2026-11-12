/**
 * Match Review IO actions — the only place Match Review writes data.
 */

import { setDb, type DBMatch, type DBSet } from '@/data'
import { resolveSetVideo, storeSetVideo } from '@/data/services/videoAssetService'
import { resolveOpponentId } from '@/helpers/themSide'

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
