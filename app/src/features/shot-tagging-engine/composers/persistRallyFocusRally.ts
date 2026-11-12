/**
 * Persist one Rally Focus rally + shots to IndexedDB.
 */

import { rallyDb, shotDb, setDb, type DBRally, type DBShot } from '@/data'
import {
  attachRallyIdToShots,
  mapRallyFocusRallyToDb,
  type RallyFocusTimelineInput,
} from '@/rules/derive/shot/mapRallyFocusToDb'
import {
  summarizeRallyLine,
  toRallyFocusMapperShot,
  type RallyTimelineState,
  type ShotTags,
} from './rallyFocusModel'
import type { PointEnding } from '@/data'
import { isThemSideId, toStoredPlayerId } from '@/helpers/themSide'

export interface PersistRallyFocusInput {
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

function toMapperTimeline(timeline: RallyTimelineState): RallyFocusTimelineInput {
  const shots: RallyFocusTimelineInput['shots'] = {}
  for (const [key, shot] of Object.entries(timeline.shots)) {
    shots[Number(key)] = toRallyFocusMapperShot(shot)
  }
  return {
    shotCount: timeline.shotCount,
    fos: timeline.fos,
    end: timeline.end,
    ending: timeline.ending,
    shots,
  }
}

export interface PersistedRallyFocusRally {
  rally: DBRally
  shots: DBShot[]
  summary: string
  serverName: string
  winnerName: string
}

export async function persistRallyFocusRally(
  input: PersistRallyFocusInput
): Promise<PersistedRallyFocusRally> {
  const mapperTimeline = toMapperTimeline(input.timeline)
  const { rally: newRally, shots: mappedShots } = mapRallyFocusRallyToDb({
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
  const shotsWithId = attachRallyIdToShots(mappedShots, savedRally.id)
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
      shotCount: input.timeline.shotCount,
      fos: input.timeline.fos,
      end: input.timeline.end,
      ending: input.timeline.ending as PointEnding | null,
      fosTimeSeconds: null,
      shots: input.timeline.shots,
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

export async function finalizeRallyFocusSet(input: {
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

export interface ResumedRallyFocusState {
  setId: string
  completed: ResumedCompletedRally[]
  currentScore: { player1: number; player2: number }
  setupNextServer: 'player1' | 'player2'
  setupStartingScore: { player1: number; player2: number }
}

/**
 * Delete the last persisted rally for a set and roll set progress/score back.
 */
export async function deleteLastPersistedRallyFocusRally(input: {
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

function dbShotToUiTags(shot: DBShot): ShotTags {
  return {
    spin: shot.shot_spin
      ? shot.shot_spin === 'under'
        ? 'Under'
        : shot.shot_spin === 'top'
          ? 'Top'
          : 'Side'
      : null,
    wing: shot.shot_wing,
    stroke: shot.shot_stroke
      ? ((shot.shot_stroke.charAt(0).toUpperCase() +
          shot.shot_stroke.slice(1)) as ShotTags['stroke'])
      : null,
    depth: shot.shot_depth
      ? shot.shot_depth === 'half'
        ? 'Half'
        : ((shot.shot_depth.charAt(0).toUpperCase() +
            shot.shot_depth.slice(1)) as ShotTags['depth'])
      : null,
    placement: shot.shot_placement === 'middle' ? 'Middle' : shot.shot_placement,
    mental: null,
    isWeak: shot.shot_is_weak,
    isHigh: shot.shot_is_high,
    isHeavy: shot.shot_is_heavy,
    standing: shot.shot_initiative,
    tableContact: shot.shot_contact
      ? shot.shot_contact === 'over_table'
        ? 'Over'
        : 'Off'
      : null,
    quality: shot.shot_quality
      ? ((shot.shot_quality.charAt(0).toUpperCase() +
          shot.shot_quality.slice(1)) as ShotTags['quality'])
      : null,
    contactTime: shot.timestamp_start,
  }
}

/**
 * Rebuild in-memory session state from rallies already saved for this set.
 */
export async function loadResumedRallyFocusState(input: {
  setId: string
  player1Id: string
  player2Id: string
  player1Name: string
  player2Name: string
}): Promise<ResumedRallyFocusState> {
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
    for (const shot of rallyShots) {
      shots[shot.shot_index] = dbShotToUiTags(shot)
    }

    const end = rallyShots.length
    const timeline: RallyTimelineState = {
      shotCount: end,
      fos: rally.first_attack_index,
      end,
      ending: rally.point_ending,
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
