/**
 * Map Pass 1 Focus timeline state → NewRally + NewShot[]
 *
 * Pure — no React, no IO.
 * standing (UI) is stored as shot_initiative.
 * The Pass 1 allow-list strips tags that the shot's role may not keep.
 * MA-74/77: phase optionals (spin/depth/Ball High·Heavy, FA contact,
 * Safe) persist when allow-listed. Placement / Weak / Quality dropped from
 * Pass 1 allow-list. Previous-shot placement is inferred from wing + pivot
 * when wing is set and prior placement is still null.
 *
 * Completeness: framework_confirmed = Basic (compulsory gates met on save);
 * detail_complete = Advanced (phase optionals filled — see
 * derivePass1AdvancedDataComplete).
 */

import type {
  NewRally,
  NewShot,
  PointEnding,
  PointMissReason,
  ShotWing,
  ShotStroke,
  ShotInitiative,
  ShotReviewKind,
  ShotSpin,
  ShotDepth,
  ShotPlacement,
  ShotContact,
  ShotQuality,
} from '@/data'
import {
  deriveRally_winner_id,
  getOpponentId,
  playerIdForShotIndex,
} from '../rally/deriveRally_winner_id'
import {
  derivePass1ShotTagAllowList,
  type Pass1ShotTagAllowList,
} from './derivePass1ShotTagRole'
import { derivePass1AdvancedDataComplete } from './derivePass1AdvancedComplete'
import { derivePreviousPlacementFromWingPivot } from './derivePreviousPlacementFromWingPivot'
import { toStoredPlayerId } from '@/helpers/themSide'

export interface Pass1FocusShotTags {
  wing: string | null
  stroke: string | null
  standing: string | null
  isHigh: boolean
  isSafe: boolean
  /** MA-77 exclusive with Safe; not persisted yet (no DB column). */
  isAggressive?: boolean
  isPivot: boolean
  reviewKind: ShotReviewKind | null
  contactTime: number | null
  spin?: string | null
  depth?: string | null
  placement?: string | null
  tableContact?: string | null
  quality?: string | null
  isWeak?: boolean
  isHeavy?: boolean
}

export interface Pass1FocusTimelineInput {
  shotCount: number
  fos: number | null
  end: number | null
  ending: PointEnding | null
  /** Only stored when ending is error_net / error_long / error_wide. */
  missReason: PointMissReason | null
  shots: Record<number, Pass1FocusShotTags>
}

export interface MapPass1FocusInput {
  timeline: Pass1FocusTimelineInput
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

export interface MapPass1FocusResult {
  rally: NewRally
  shots: NewShot[]
}

const MISS_REASONS: readonly PointMissReason[] = [
  'technical',
  'timing',
  'footwork',
  'positioning',
  'misread',
  'forced',
]

function isErrorEnding(ending: PointEnding): boolean {
  return (
    ending === 'error_net' || ending === 'error_long' || ending === 'error_wide'
  )
}

function mapMissReason(
  ending: PointEnding,
  missReason: PointMissReason | null
): PointMissReason | null {
  if (!isErrorEnding(ending)) return null
  if (!missReason) return null
  return MISS_REASONS.includes(missReason) ? missReason : null
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

function mapInitiative(standing: string | null): ShotInitiative | null {
  if (!standing) return null
  const v = standing.toLowerCase()
  if (v === 'behind' || v === 'level' || v === 'ahead') return v
  return null
}

function mapReviewKind(kind: string | null | undefined): ShotReviewKind | null {
  if (kind === 'technical' || kind === 'tactical') return kind
  return null
}

function mapSpin(spin: string | null | undefined): ShotSpin | null {
  if (!spin) return null
  const v = spin.toLowerCase()
  if (v === 'under' || v === 'top' || v === 'side') return v
  return null
}

function mapDepth(depth: string | null | undefined): ShotDepth | null {
  if (!depth) return null
  const v = depth.toLowerCase()
  if (v === 'short' || v === 'half' || v === 'long') return v
  return null
}

function mapPlacement(placement: string | null | undefined): ShotPlacement | null {
  if (!placement) return null
  if (placement === 'BH' || placement === 'FH' || placement === 'middle') {
    return placement
  }
  const v = placement.toLowerCase()
  if (v === 'bh') return 'BH'
  if (v === 'fh') return 'FH'
  if (v === 'middle' || v === 'mid') return 'middle'
  return null
}

function mapContact(contact: string | null | undefined): ShotContact | null {
  if (!contact) return null
  const v = contact.toLowerCase().replace(/\s+/g, '_')
  if (v === 'over_table' || v === 'over') return 'over_table'
  if (v === 'off_table' || v === 'off') return 'off_table'
  return null
}

function mapQuality(quality: string | null | undefined): ShotQuality | null {
  if (!quality) return null
  const v = quality.toLowerCase()
  if (v === 'good' || v === 'normal' || v === 'poor') return v
  return null
}

function applyAllowList(
  tags: Pass1FocusShotTags,
  allow: Pass1ShotTagAllowList
): Omit<
  NewShot,
  'rally_id' | 'video_id' | 'player_id' | 'shot_index' | 'timestamp_start'
> {
  const reviewKind = mapReviewKind(tags.reviewKind)
  // Technical review always captures wing + stroke, even off the role allow-list.
  const forceShotType = reviewKind === 'technical'
  const allowWing = allow.shot_wing || forceShotType
  const allowStroke = allow.shot_stroke || forceShotType
  const allowPivot = allow.shot_is_pivot || forceShotType
  const wing = allowWing ? mapWing(tags.wing) : null
  return {
    shot_spin: allow.shot_spin ? mapSpin(tags.spin) : null,
    shot_wing: wing,
    shot_stroke: allowStroke ? mapStroke(tags.stroke) : null,
    shot_placement: allow.shot_placement ? mapPlacement(tags.placement) : null,
    shot_depth: allow.shot_depth ? mapDepth(tags.depth) : null,
    shot_contact: allow.shot_contact ? mapContact(tags.tableContact) : null,
    shot_initiative: allow.shot_initiative ? mapInitiative(tags.standing) : null,
    shot_quality: allow.shot_quality ? mapQuality(tags.quality) : null,
    shot_is_weak: allow.shot_is_weak ? Boolean(tags.isWeak) : false,
    shot_is_high: allow.shot_is_high ? Boolean(tags.isHigh) : false,
    shot_is_heavy: allow.shot_is_heavy ? Boolean(tags.isHeavy) : false,
    shot_is_safe: allow.shot_is_safe ? Boolean(tags.isSafe) : false,
    shot_is_pivot: allowPivot && wing !== null ? Boolean(tags.isPivot) : false,
    shot_review_kind: reviewKind,
  }
}

/**
 * Map a completed Pass 1 Focus timeline into DB rows.
 * Shots saved are 1..end only.
 * When shot N has a wing and prior placement is unset, shot N-1 gets
 * placement from wing + pivot.
 */
export function mapPass1FocusRallyToDb(
  input: MapPass1FocusInput
): MapPass1FocusResult {
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
  if (firstAttackIndex !== null && (firstAttackIndex > end || firstAttackIndex < 2)) {
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

  const advancedComplete = derivePass1AdvancedDataComplete({
    end,
    fos: firstAttackIndex,
    shots: timeline.shots,
  })

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
    point_miss_reason: mapMissReason(ending, timeline.missReason ?? null),
    is_highlight: isHighlight,
    // Basic = compulsory Pass 1 gates (caller only maps when saveable)
    framework_confirmed: true,
    // Advanced = RF-class optionals filled; incomplete by default after basic save
    detail_complete: advancedComplete,
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

    const allow = derivePass1ShotTagAllowList(i, firstAttackIndex, end)
    const stripped = applyAllowList(tags, allow)

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

  // Infer previous placement from each tagged wing (+ pivot) when unset.
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i]
    const wing = shot.shot_wing
    if (!wing || shot.shot_index < 2) continue
    const prev = shots[i - 1]
    if (!prev || prev.shot_index !== shot.shot_index - 1) continue
    if (prev.shot_placement != null) continue
    prev.shot_placement = derivePreviousPlacementFromWingPivot(
      wing,
      shot.shot_is_pivot
    )
  }

  return { rally, shots }
}

/**
 * Attach rally_id to mapped shots after the rally row has an id.
 * (Named distinctly from the Rally Focus helper so both can live in the barrel.)
 */
export function attachRallyIdToPass1Shots(
  shots: NewShot[],
  rallyId: string
): NewShot[] {
  return shots.map((s) => ({ ...s, rally_id: rallyId }))
}
