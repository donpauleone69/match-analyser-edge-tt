/**
 * Persist one Pass 1 Focus rally + shots to IndexedDB.
 */

import { db, rallyDb, shotDb, setDb, type DBRally, type DBShot } from '@/data'
import { deriveRallyScoreChain } from '@/rules/derive/rally/deriveRallyScoreChain'
import {
  attachRallyIdToPass1Shots,
  mapPass1FocusRallyToDb,
  type Pass1FocusTimelineInput,
} from '@/rules/derive/shot/mapPass1FocusToDb'
import {
  normalizeMissReason,
  summarizeRallyLine,
  toPass1FocusMapperShot,
  type RallyTimelineState,
  type ShotTags,
} from './pass1FocusModel'
import type { PointEnding } from '@/data'
import { isThemSideId, toStoredPlayerId } from '@/helpers/themSide'

export interface PersistPass1FocusInput {
  setId: string
  rallyIndex: number
  videoId: string | null
  serverId: string
  player1Id: string
  player2Id: string
  player1Name: string
  player2Name: string
  player1ScoreBefore: number
  player2ScoreBefore: number
  isHighlight: boolean
  timeline: RallyTimelineState
}

function toMapperTimeline(timeline: RallyTimelineState): Pass1FocusTimelineInput {
  const shots: Pass1FocusTimelineInput['shots'] = {}
  for (const [key, shot] of Object.entries(timeline.shots)) {
    shots[Number(key)] = toPass1FocusMapperShot(shot)
  }
  return {
    shotCount: timeline.shotCount,
    fos: timeline.fos,
    end: timeline.end,
    ending: timeline.ending,
    missReason: timeline.missReason,
    shots,
  }
}

export interface PersistedPass1FocusRally {
  rally: DBRally
  shots: DBShot[]
  summary: string
  serverName: string
  winnerName: string
}

export async function persistPass1FocusRally(
  input: PersistPass1FocusInput
): Promise<PersistedPass1FocusRally> {
  const mapperTimeline = toMapperTimeline(input.timeline)
  const { rally: newRally, shots: mappedShots } = mapPass1FocusRallyToDb({
    timeline: mapperTimeline,
    setId: input.setId,
    rallyIndex: input.rallyIndex,
    videoId: input.videoId,
    serverId: input.serverId,
    player1Id: input.player1Id,
    player2Id: input.player2Id,
    player1ScoreBefore: input.player1ScoreBefore,
    player2ScoreBefore: input.player2ScoreBefore,
    isHighlight: input.isHighlight,
  })

  const savedRally = await rallyDb.create(newRally)
  const shotsWithId = attachRallyIdToPass1Shots(mappedShots, savedRally.id)
  const savedShots = await shotDb.bulkCreate(shotsWithId)

  await setDb.update(input.setId, {
    tagging_phase: 'phase2_in_progress',
    phase1_last_rally: input.rallyIndex,
    player1_score_final: savedRally.player1_score_after,
    player2_score_final: savedRally.player2_score_after,
    is_tagged: false,
  })

  // null server/winner = Villain (unnamed opponent)
  const winnerName =
    savedRally.winner_id === input.player1Id
      ? input.player1Name
      : input.player2Name
  const serverName =
    savedRally.server_id === input.player1Id
      ? input.player1Name
      : input.player2Name

  const summary = summarizeRallyLine(
    {
      ...input.timeline,
      ending: input.timeline.ending as PointEnding | null,
      missReason: savedRally.point_miss_reason,
      fosTimeSeconds: null,
    },
    winnerName
  )

  return {
    rally: savedRally,
    shots: savedShots,
    summary,
    serverName,
    winnerName,
  }
}

export interface UpdatePass1FocusRallyInput {
  setId: string
  rallyId: string
  serverId: string
  player1Id: string
  player2Id: string
  isHighlight: boolean
  timeline: RallyTimelineState
}

export interface UpdatedPass1FocusRally {
  rally: DBRally
  winnerChanged: boolean
  /** Later rallies whose stored score was re-chained */
  rescoredCount: number
  finalScore: { player1: number; player2: number }
}

/**
 * Save edits to one already-tagged rally without touching the rest of the set.
 *
 * Re-maps the rally with the same allow-list as a fresh save, replaces its
 * shots, then re-chains before/after scores through the set (only rallies
 * whose score actually moved are written). Set final score follows; the set
 * winner is refreshed only when the set was already ended.
 */
export async function updatePersistedPass1FocusRally(
  input: UpdatePass1FocusRallyInput
): Promise<UpdatedPass1FocusRally> {
  return db.transaction('rw', [db.sets, db.rallies, db.shots], async () => {
    const set = await setDb.getById(input.setId)
    if (!set) throw new Error(`Set ${input.setId} not found`)
    const existing = await rallyDb.getById(input.rallyId)
    if (!existing) throw new Error(`Rally ${input.rallyId} not found`)

    const { rally: mapped, shots: mappedShots } = mapPass1FocusRallyToDb({
      timeline: toMapperTimeline(input.timeline),
      setId: input.setId,
      rallyIndex: existing.rally_index,
      videoId: existing.video_id,
      serverId: input.serverId,
      player1Id: input.player1Id,
      player2Id: input.player2Id,
      player1ScoreBefore: existing.player1_score_before,
      player2ScoreBefore: existing.player2_score_before,
      isHighlight: input.isHighlight,
    })

    const winnerChanged = mapped.winner_id !== existing.winner_id
    const updated = await rallyDb.update(existing.id, {
      ...mapped,
      // Keep corrections history visible on the row
      server_corrected: existing.server_corrected || mapped.server_id !== existing.server_id,
      score_corrected: existing.score_corrected,
      correction_notes: existing.correction_notes,
    })

    await shotDb.deleteByRallyId(existing.id)
    await shotDb.bulkCreate(attachRallyIdToPass1Shots(mappedShots, existing.id))

    const rallies = await rallyDb.getBySetId(input.setId)
    const first = rallies[0]
    const chain = deriveRallyScoreChain({
      rallies,
      player1Id: input.player1Id,
      start: {
        player1: set.setup_starting_score_p1 ?? first?.player1_score_before ?? 0,
        player2: set.setup_starting_score_p2 ?? first?.player2_score_before ?? 0,
      },
    })

    let rescoredCount = 0
    let savedRally = updated
    for (const entry of chain.entries) {
      if (!entry.changed) continue
      const { id, changed: _changed, ...scores } = entry
      const written = await rallyDb.update(id, scores)
      if (id === existing.id) savedRally = written
      else rescoredCount++
    }

    const ended = set.is_tagged || set.tagging_phase === 'phase2_complete'
    const { player1, player2 } = chain.final
    await setDb.update(input.setId, {
      player1_score_final: player1,
      player2_score_final: player2,
      ...(ended
        ? {
            winner_id:
              player1 > player2
                ? input.player1Id
                : player2 > player1
                  ? toStoredPlayerId(input.player2Id)
                  : null,
          }
        : {}),
    })

    return { rally: savedRally, winnerChanged, rescoredCount, finalScore: chain.final }
  })
}

/** Star / un-star a rally as a highlight. */
export async function setPersistedRallyHighlight(
  rallyId: string,
  isHighlight: boolean
): Promise<void> {
  await rallyDb.update(rallyId, { is_highlight: isHighlight })
}

export async function finalizePass1FocusSet(input: {
  setId: string
  player1Id: string
  player2Id: string
  player1Score: number
  player2Score: number
  scoreConfirmed?: boolean | null
}): Promise<void> {
  const winnerId =
    input.player1Score > input.player2Score
      ? input.player1Id
      : input.player2Score > input.player1Score
        ? toStoredPlayerId(input.player2Id)
        : null

  await setDb.update(input.setId, {
    player1_score_final: input.player1Score,
    player2_score_final: input.player2Score,
    winner_id: winnerId,
    is_tagged: true,
    tagging_phase: 'phase2_complete',
    tagging_completed_at: new Date().toISOString(),
    ...(input.scoreConfirmed !== undefined
      ? { score_confirmed: input.scoreConfirmed }
      : {}),
  })
}

export interface ResumedCompletedRally {
  dbRallyId: string
  rallyIndex: number
  serveTimestamp: number
  endTimestamp: number
  serverId: 'player1' | 'player2'
  winnerId: 'player1' | 'player2'
  serverName: string
  winnerName: string
  summary: string
  isHighlight: boolean
  timeline: RallyTimelineState
  player1ScoreAfter: number
  player2ScoreAfter: number
}

export interface ResumedPass1FocusState {
  setId: string
  completed: ResumedCompletedRally[]
  currentScore: { player1: number; player2: number }
  setupNextServer: 'player1' | 'player2'
  setupStartingScore: { player1: number; player2: number }
}

/**
 * Delete the last persisted rally for a set and roll set progress/score back.
 */
export async function deleteLastPersistedPass1FocusRally(input: {
  setId: string
  rallyId: string
}): Promise<{
  player1Score: number
  player2Score: number
  phase1LastRally: number | null
}> {
  const set = await setDb.getById(input.setId)
  if (!set) throw new Error(`Set ${input.setId} not found`)

  await rallyDb.remove(input.rallyId)

  const remaining = (await rallyDb.getBySetId(input.setId)).sort(
    (a, b) => a.rally_index - b.rally_index
  )
  const last = remaining[remaining.length - 1]
  const player1Score =
    last?.player1_score_after ?? set.setup_starting_score_p1 ?? 0
  const player2Score =
    last?.player2_score_after ?? set.setup_starting_score_p2 ?? 0
  const phase1LastRally = last?.rally_index ?? null

  await setDb.update(input.setId, {
    tagging_phase: remaining.length > 0 ? 'phase2_in_progress' : 'not_started',
    phase1_last_rally: phase1LastRally,
    player1_score_final: player1Score,
    player2_score_final: player2Score,
    is_tagged: false,
    tagging_completed_at: null,
  })

  return { player1Score, player2Score, phase1LastRally }
}

function dbShotToUiTags(
  shot: DBShot,
  previousPlacement: DBShot['shot_placement'] | null = null
): ShotTags {
  const wing = shot.shot_wing
  const storedPivot = Boolean(shot.shot_is_pivot)
  // Prefer stored pivot; if older rows lack it, infer from previous placement.
  const isPivot =
    wing === 'FH' || wing === 'BH'
      ? storedPivot ||
        (previousPlacement === 'FH' || previousPlacement === 'BH'
          ? previousPlacement !== wing
          : false)
      : false

  return {
    wing,
    stroke: shot.shot_stroke
      ? ((shot.shot_stroke.charAt(0).toUpperCase() +
          shot.shot_stroke.slice(1)) as ShotTags['stroke'])
      : null,
    isHigh: shot.shot_is_high,
    isSafe: shot.shot_is_safe,
    isPivot,
    reviewKind:
      shot.shot_review_kind === 'technical' || shot.shot_review_kind === 'tactical'
        ? shot.shot_review_kind
        : null,
    standing: shot.shot_initiative,
    contactTime: shot.timestamp_start,
  }
}

/**
 * Rebuild in-memory session state from rallies already saved for this set.
 */
export async function loadResumedPass1FocusState(input: {
  setId: string
  player1Id: string
  player2Id: string
  player1Name: string
  player2Name: string
}): Promise<ResumedPass1FocusState> {
  const set = await setDb.getById(input.setId)
  if (!set) throw new Error(`Set ${input.setId} not found`)

  const rallies = (await rallyDb.getBySetId(input.setId)).sort(
    (a, b) => a.rally_index - b.rally_index
  )
  const allShots = await shotDb.getBySetId(input.setId)

  const setupStartingScore = {
    player1: set.setup_starting_score_p1 ?? 0,
    player2: set.setup_starting_score_p2 ?? 0,
  }

  const setupNextServer: 'player1' | 'player2' =
    set.setup_next_server_id === input.player2Id ||
    (isThemSideId(set.setup_next_server_id) && isThemSideId(input.player2Id))
      ? 'player2'
      : 'player1'

  const completed = rallies.map((rally) => {
    const rallyShots = allShots
      .filter((s) => s.rally_id === rally.id)
      .sort((a, b) => a.shot_index - b.shot_index)

    const shots: RallyTimelineState['shots'] = {}
    for (let i = 0; i < rallyShots.length; i++) {
      const shot = rallyShots[i]
      const previous = i > 0 ? rallyShots[i - 1] : null
      shots[shot.shot_index] = dbShotToUiTags(
        shot,
        previous?.shot_placement ?? null
      )
    }

    const end = rallyShots.length
    const timeline: RallyTimelineState = {
      shotCount: end,
      fos: rally.first_attack_index,
      // Saved rallies: null first_attack_index means explicit no attack (not undecided).
      noFirstAttack: rally.first_attack_index === null,
      end,
      ending: rally.point_ending,
      missReason: normalizeMissReason(rally.point_miss_reason),
      fosTimeSeconds: null,
      shots,
    }

    const serverId: 'player1' | 'player2' =
      rally.server_id === input.player1Id ? 'player1' : 'player2'
    const winnerId: 'player1' | 'player2' =
      rally.winner_id === input.player1Id ? 'player1' : 'player2'

    return {
      dbRallyId: rally.id,
      rallyIndex: rally.rally_index,
      serveTimestamp: rally.timestamp_start ?? 0,
      endTimestamp: rally.timestamp_end ?? 0,
      serverId,
      winnerId,
      serverName:
        serverId === 'player1' ? input.player1Name : input.player2Name,
      winnerName:
        winnerId === 'player1' ? input.player1Name : input.player2Name,
      summary: summarizeRallyLine(
        timeline,
        winnerId === 'player1' ? input.player1Name : input.player2Name
      ),
      isHighlight: rally.is_highlight,
      timeline,
      player1ScoreAfter: rally.player1_score_after,
      player2ScoreAfter: rally.player2_score_after,
    }
  })

  const last = rallies[rallies.length - 1]
  const currentScore = last
    ? {
        player1: last.player1_score_after,
        player2: last.player2_score_after,
      }
    : { ...setupStartingScore }

  return {
    setId: input.setId,
    completed,
    currentScore,
    setupNextServer,
    setupStartingScore,
  }
}
