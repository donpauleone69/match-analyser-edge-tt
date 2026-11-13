/**
 * Match Review IO actions — the only place Match Review writes data.
 */

import {
  rallyDb,
  setDb,
  linkMatchOpponent,
  useMatchStore,
  usePlayerStore,
  useTournamentStore,
  type DBMatch,
  type DBSet,
  type MatchRound,
} from '@/data'
import {
  archiveAssetLocally,
  maybeApplyMatchDateFromVideo,
  maybeApplyStoredVideoMatchDate,
  resolveSetVideo,
  retrieveAssetToDevice,
  storeSetVideoChecked,
  suggestedVideoMatchDate,
} from '@/data/services/videoAssetService'
import { videoAssetDb } from '@/data'
import { exportTrimmedSetVideo } from '@/data/services/reelExportService'
import { validateTrimWindow } from '@/rules/derive/clips/deriveClipEdl'
import { findDuplicateMatches } from '@/rules/matchDuplicate'
import { resolveOpponentId } from '@/helpers/themSide'
import { downloadMatchBundle, pullMatch, pushMatch, uploadVideoAsset, type PushResult } from '@/data/cloud'

export {
  maybeApplyMatchDateFromVideo,
  maybeApplyStoredVideoMatchDate,
  suggestedVideoMatchDate,
}

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

export async function archiveSetVideo(assetId: string): Promise<string> {
  const asset = await videoAssetDb.getById(assetId)
  if (!asset) throw new Error('Video not found')
  if (!asset.remote_path) {
    throw new Error('Back up this video to the cloud first — archive removes the only copy on this device.')
  }
  await archiveAssetLocally(asset)
  return 'Device copy archived. Tags still use source-video time.'
}

export async function retrieveSetVideo(assetId: string): Promise<string> {
  const asset = await videoAssetDb.getById(assetId)
  if (!asset) throw new Error('Video not found')
  if (!asset.remote_path) {
    throw new Error('No cloud copy to retrieve. Sign in and back up the video first.')
  }
  await retrieveAssetToDevice(asset)
  return 'Video retrieved to this device.'
}

export async function trimSetVideo(
  assetId: string,
  setNumber: number,
  sourceStart: number,
  sourceEnd: number,
): Promise<string> {
  const asset = await videoAssetDb.getById(assetId)
  if (!asset) throw new Error('Video not found')
  const check = validateTrimWindow({
    sourceStart,
    sourceEnd,
    durationS: asset.duration_s,
  })
  if (!check.ok) throw new Error(check.error)
  await exportTrimmedSetVideo({
    matchId: asset.match_id,
    setNumber,
    sourceStart: check.sourceStart,
    sourceEnd: check.sourceEnd,
  })
  return `Trimmed set ${setNumber} saved (${Math.round(check.sourceStart)}–${Math.round(check.sourceEnd)}s). Contacts stay on source-video seconds. Back up, then Archive device copy to free space.`
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
): Promise<string | null> {
  const blob = await (await fetch(pickedUrl)).blob()
  const file = new File([blob], `${matchId}-${setNumber}.mp4`, { type: blob.type || 'video/mp4' })
  let result = await storeSetVideoChecked(matchId, setNumber, file)
  if (result.status === 'duplicate') {
    const first = result.hits[0]
    const label = first
      ? `${first.matchId}${first.setNumber != null ? ` set ${first.setNumber}` : ''}`
      : 'another match'
    const attachAnyway = window.confirm(
      `This video looks like it’s already on ${label}.\n\nOK = attach here anyway\nCancel = don’t attach`
    )
    if (!attachAnyway) return null
    result = await storeSetVideoChecked(matchId, setNumber, file, { force: true })
  }
  if (result.status !== 'stored') return null
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
  return setDb.update(created.id, { setup_next_server_id: setFirstServer })
}

export type MatchContextSaveInput = {
  matchDate: string
  player2Id: string | null
  tournamentId: string | null
  round: MatchRound | null
}

/** Soft-fail save for Details context. Returns an error message or null. */
export async function saveMatchContext(
  match: DBMatch,
  input: MatchContextSaveInput,
  options: { forceDuplicate?: boolean } = {}
): Promise<string | null> {
  try {
    if (input.player2Id && input.player2Id === match.player1_id) {
      return 'Opponent must be different from you'
    }

    const tournamentId = input.tournamentId
    const round = tournamentId && input.round ? input.round : null
    const date = input.matchDate.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return 'Match date must be YYYY-MM-DD'
    }

    if (input.player2Id && !options.forceDuplicate) {
      await useMatchStore.getState().load()
      const hits = findDuplicateMatches(useMatchStore.getState().matches, {
        player1Id: match.player1_id,
        player2Id: input.player2Id,
        tournamentId,
        matchDate: date,
      }, { excludeMatchId: match.id })
      if (hits.length > 0) {
        const sample = hits[0]?.id ?? 'another match'
        const proceed = window.confirm(
          `Another match already has this opponent, tournament, and date (${sample}).\n\nOK = save anyway\nCancel = keep editing`
        )
        if (!proceed) return 'Save cancelled — possible duplicate match'
      }
    }

    const nextOpponent = input.player2Id
    if (nextOpponent !== match.player2_id) {
      if (nextOpponent) {
        await linkMatchOpponent(match.id, nextOpponent)
        await useMatchStore.getState().load()
      } else {
        await useMatchStore.getState().update(match.id, { player2_id: null })
      }
    }

    const dateChanged = date !== match.match_date.slice(0, 10)
    await useMatchStore.getState().update(match.id, {
      match_date: date,
      match_date_source: dateChanged ? 'manual' : match.match_date_source ?? null,
      tournament_id: tournamentId,
      round,
    })
    return null
  } catch (err) {
    console.error('[MatchReview] saveMatchContext failed:', err)
    return err instanceof Error ? err.message : 'Could not save match context'
  }
}

/** Quick-create an opponent player and link them. Returns error or null. */
export async function createAndLinkOpponent(
  match: DBMatch,
  firstName: string,
  lastName: string
): Promise<string | null> {
  const first = firstName.trim()
  const last = lastName.trim()
  if (!first) return 'Opponent needs a first name'
  try {
    const player = await usePlayerStore.getState().create({
      first_name: first,
      last_name: last || first,
      handedness: 'right',
      playstyle: null,
      club_id: null,
      is_archived: false,
    })
    await linkMatchOpponent(match.id, player.id)
    await useMatchStore.getState().load()
    return null
  } catch (err) {
    console.error('[MatchReview] createAndLinkOpponent failed:', err)
    return err instanceof Error ? err.message : 'Could not create opponent'
  }
}

/** Optional quick tournament create (name only). */
export async function createTournamentForMatch(
  name: string,
  startDate: string
): Promise<{ id: string } | { error: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Tournament needs a name' }
  try {
    const tournament = await useTournamentStore.getState().create({
      name: trimmed,
      location: null,
      start_date: startDate,
      end_date: null,
      tournament_type: 'club',
      tournament_host_club_id: null,
      notes: null,
    })
    return { id: tournament.id }
  } catch (err) {
    console.error('[MatchReview] createTournamentForMatch failed:', err)
    return { error: err instanceof Error ? err.message : 'Could not create tournament' }
  }
}

/** Apply a suggested video date from Details (clears a prior manual lock). */
export async function applySuggestedVideoDate(
  matchId: string,
  suggestedDate: string
): Promise<string | null> {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(suggestedDate)) return 'Invalid video date'
    await useMatchStore.getState().update(matchId, {
      match_date: suggestedDate,
      match_date_source: 'video',
    })
    return null
  } catch (err) {
    console.error('[MatchReview] applySuggestedVideoDate failed:', err)
    return err instanceof Error ? err.message : 'Failed to apply video date'
  }
}

/**
 * On Details open: if date isn't manual and a stored video lastModified exists,
 * apply it once. Soft-fail.
 */
export async function applyStoredVideoMatchDateIfNeeded(matchId: string): Promise<boolean> {
  return maybeApplyStoredVideoMatchDate(matchId)
}
