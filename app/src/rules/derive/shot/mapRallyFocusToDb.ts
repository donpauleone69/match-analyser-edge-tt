/**
 * Map Rally Focus timeline state → NewRally + NewShot[]
 *
 * Pure — no React, no IO.
 * standing (UI) is stored as shot_initiative.
 * Role allow-list strips tags that the current role may not keep.
 */

import type {
  NewRally,
  NewShot,
  PointEnding,
  ShotSpin,
  ShotWing,
  ShotStroke,
  ShotDepth,
  ShotPlacement,
  ShotContact,
  ShotInitiative,
  ShotQuality,
} from '@/data'
import {
  deriveRally_winner_id,
  getOpponentId,
  playerIdForShotIndex,
} from '../rally/deriveRally_winner_id'
import {
  allowInitiativeForLaterShot,
  allowListForRole,
  deriveShotTagRole,
  type ShotTagAllowList,
} from './deriveShotTagRole'
import { toStoredPlayerId } from '@/helpers/themSide'

export interface RallyFocusShotTags {
  spin: string | null
  wing: string | null
  stroke: string | null
  depth: string | null
  placement: string | null
  standing: string | null
  tableContact: string | null
  quality: string | null
  isWeak: boolean
  isHigh: boolean
  isHeavy: boolean
  contactTime: number | null
}

export interface RallyFocusTimelineInput {
  shotCount: number
  fos: number | null
  end: number | null
  ending: PointEnding | null
  shots: Record<number, RallyFocusShotTags>
}

export interface MapRallyFocusInput {
  timeline: RallyFocusTimelineInput
  setId: string
  rallyIndex: number
  videoId: string | null
  serverId: string
  player1Id: string
  player2Id: string
  player1ScoreBefore: number
  player2ScoreBefore: number
  isHighlight?: boolean
}

export interface MapRallyFocusResult {
  rally: NewRally
  shots: NewShot[]
}

function lowerOrNull<T extends string>(value: string | null): T | null {
  if (!value) return null
  return value.toLowerCase() as T
}

function mapSpin(spin: string | null): ShotSpin | null {
  if (!spin) return null
  const v = spin.toLowerCase()
  if (v === 'under' || v === 'top' || v === 'side') return v
  return null
}

function mapWing(wing: string | null): ShotWing | null {
  if (wing === 'FH' || wing === 'BH') return wing
  return null
}

function mapStroke(stroke: string | null): ShotStroke | null {
  if (!stroke) return null
  const v = stroke.toLowerCase()
  if (
    v === 'flick' ||
    v === 'loop' ||
    v === 'drive' ||
    v === 'smash' ||
    v === 'lob' ||
    v === 'block' ||
    v === 'push' ||
    v === 'chop'
  ) {
    return v
  }
  return null
}

function mapDepth(depth: string | null): ShotDepth | null {
  if (!depth) return null
  const v = depth.toLowerCase()
  if (v === 'short' || v === 'half' || v === 'long') return v
  return null
}

function mapPlacement(placement: string | null): ShotPlacement | null {
  if (!placement) return null
  if (placement === 'BH' || placement === 'FH') return placement
  if (placement.toLowerCase() === 'middle') return 'middle'
  return null
}

function mapContact(value: string | null): ShotContact | null {
  if (!value) return null
  const v = value.toLowerCase().replace(/\s+/g, '_')
  if (v === 'over' || v === 'over_table') return 'over_table'
  if (v === 'behind' || v === 'off' || v === 'off_table') return 'off_table'
  return null
}

function mapInitiative(standing: string | null): ShotInitiative | null {
  return lowerOrNull<ShotInitiative>(standing)
}

function mapQuality(quality: string | null): ShotQuality | null {
  if (!quality) return null
  const v = quality.toLowerCase()
  if (v === 'good' || v === 'normal' || v === 'poor') return v
  return null
}

function applyAllowList(
  tags: RallyFocusShotTags,
  allow: ShotTagAllowList,
  allowInitiative: boolean
): Omit<
  NewShot,
  'rally_id' | 'video_id' | 'player_id' | 'shot_index' | 'timestamp_start'
> {
  return {
    shot_spin: allow.shot_spin ? mapSpin(tags.spin) : null,
    shot_wing: allow.shot_wing ? mapWing(tags.wing) : null,
    shot_stroke: allow.shot_stroke ? mapStroke(tags.stroke) : null,
    shot_placement: allow.shot_placement ? mapPlacement(tags.placement) : null,
    shot_depth: allow.shot_depth ? mapDepth(tags.depth) : null,
    shot_contact: allow.shot_contact ? mapContact(tags.tableContact) : null,
    shot_initiative:
      allow.shot_initiative && allowInitiative
        ? mapInitiative(tags.standing)
        : null,
    shot_quality: allow.shot_quality ? mapQuality(tags.quality) : null,
    shot_is_weak: allow.attributes ? Boolean(tags.isWeak) : false,
    shot_is_high: allow.attributes ? Boolean(tags.isHigh) : false,
    shot_is_heavy: allow.attributes ? Boolean(tags.isHeavy) : false,
    shot_is_safe: false,
    shot_is_pivot: false,
    shot_review_kind: null,
  }
}

/**
 * Map a completed Rally Focus timeline into DB rows.
 * Shots saved are 1..end only.
 */
export function mapRallyFocusRallyToDb(input: MapRallyFocusInput): MapRallyFocusResult {
  const {
    timeline,
    setId,
    rallyIndex,
    videoId,
    serverId,
    player1Id,
    player2Id,
    player1ScoreBefore,
    player2ScoreBefore,
    isHighlight = false,
  } = input

  if (timeline.end === null || !timeline.ending) {
    throw new Error('Cannot map rally: end and ending are required')
  }

  const end = timeline.end
  const ending = timeline.ending
  const receiverId = getOpponentId(serverId, player1Id, player2Id)

  let firstAttackIndex: number | null = timeline.fos
  if (firstAttackIndex !== null && firstAttackIndex > end) {
    firstAttackIndex = null
  }

  const lastPlayerId = playerIdForShotIndex(end, serverId, player1Id, player2Id)
  const winnerId = deriveRally_winner_id(
    { player_id: lastPlayerId, point_ending: ending },
    getOpponentId(lastPlayerId, player1Id, player2Id)
  )

  const player1ScoreAfter =
    winnerId === player1Id ? player1ScoreBefore + 1 : player1ScoreBefore
  const player2ScoreAfter =
    winnerId === player2Id ? player2ScoreBefore + 1 : player2ScoreBefore

  const firstContact = timeline.shots[1]?.contactTime ?? null
  const lastContact = timeline.shots[end]?.contactTime ?? null

  const rally: NewRally = {
    set_id: setId,
    rally_index: rallyIndex,
    video_id: videoId,
    has_video_data: true,
    timestamp_start: firstContact,
    timestamp_end: lastContact,
    end_of_point_time: lastContact,
    server_id: toStoredPlayerId(serverId),
    receiver_id: toStoredPlayerId(receiverId),
    is_scoring: true,
    winner_id: toStoredPlayerId(winnerId),
    player1_score_before: player1ScoreBefore,
    player2_score_before: player2ScoreBefore,
    player1_score_after: player1ScoreAfter,
    player2_score_after: player2ScoreAfter,
    first_attack_index: firstAttackIndex,
    point_ending: ending,
    point_miss_reason: null,
    is_highlight: isHighlight,
    framework_confirmed: true,
    detail_complete: true,
    server_corrected: false,
    score_corrected: false,
    correction_notes: null,
    is_stub_rally: false,
  }

  const shots: NewShot[] = []
  for (let i = 1; i <= end; i++) {
    const tags = timeline.shots[i]
    const contact = tags?.contactTime
    if (typeof contact !== 'number') {
      throw new Error(`Cannot map shot ${i}: missing contactTime`)
    }

    const role = deriveShotTagRole(i, firstAttackIndex)
    const allow = allowListForRole(role)
    const allowInitiative =
      role === 'later' &&
      typeof firstAttackIndex === 'number' &&
      allowInitiativeForLaterShot(i, firstAttackIndex, end)

    const stripped = applyAllowList(tags, allow, allowInitiative)

    shots.push({
      rally_id: '', // filled by caller after rally id is known
      video_id: videoId,
      player_id: toStoredPlayerId(
        playerIdForShotIndex(i, serverId, player1Id, player2Id)
      ),
      shot_index: i,
      timestamp_start: contact,
      ...stripped,
    })
  }

  return { rally, shots }
}

/**
 * Attach rally_id to mapped shots after the rally row has an id.
 */
export function attachRallyIdToShots(shots: NewShot[], rallyId: string): NewShot[] {
  return shots.map((s) => ({ ...s, rally_id: rallyId }))
}
