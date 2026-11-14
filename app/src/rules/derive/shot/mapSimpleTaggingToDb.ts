/**
 * Map Simple tagging timeline → NewRally + NewShot[].
 *
 * Same DB shape as Pass 1. Optional Pass 1 tags are stripped on non-end shots.
 * End shot (end > 1) keeps wing / stroke / pivot (Phase 2.1 End detail).
 * Review kind and contact times pass through.
 * Pure — no React, no IO.
 */

import type { NewRally, NewShot } from '@/data'
import {
  mapPass1FocusRallyToDb,
  attachRallyIdToPass1Shots,
  type MapPass1FocusInput,
  type MapPass1FocusResult,
  type Pass1FocusShotTags,
  type Pass1FocusTimelineInput,
} from './mapPass1FocusToDb'

export type MapSimpleTaggingInput = MapPass1FocusInput
export type MapSimpleTaggingResult = MapPass1FocusResult

function stripOptionalPass1Tags(shot: Pass1FocusShotTags): Pass1FocusShotTags {
  return {
    wing: null,
    stroke: null,
    standing: null,
    isHigh: false,
    isSafe: false,
    isAggressive: false,
    isPivot: false,
    reviewKind: shot.reviewKind ?? null,
    contactTime: shot.contactTime,
    spin: null,
    depth: null,
    placement: null,
    tableContact: null,
    quality: null,
    isWeak: false,
    isHeavy: false,
  }
}

/** Keep wing / stroke / pivot on the End shot when End > 1. */
function toSimpleTimeline(
  timeline: Pass1FocusTimelineInput
): Pass1FocusTimelineInput {
  const end =
    typeof timeline.end === 'number' && timeline.end > 1 ? timeline.end : null
  const shots: Pass1FocusTimelineInput['shots'] = {}
  for (const [key, shot] of Object.entries(timeline.shots)) {
    const n = Number(key)
    if (end !== null && n === end) {
      shots[n] = {
        wing: shot.wing ?? null,
        stroke: shot.stroke ?? null,
        standing: null,
        isHigh: false,
        isSafe: false,
        isAggressive: false,
        isPivot: Boolean(shot.isPivot),
        reviewKind: shot.reviewKind ?? null,
        contactTime: shot.contactTime,
        spin: null,
        depth: null,
        placement: null,
        tableContact: null,
        quality: null,
        isWeak: false,
        isHeavy: false,
      }
    } else {
      shots[n] = stripOptionalPass1Tags(shot)
    }
  }
  return { ...timeline, shots }
}

/** Thin wrapper: strip optional tags (keep End wing/shot), then Pass 1 mapper. */
export function mapSimpleTaggingRallyToDb(
  input: MapSimpleTaggingInput
): MapSimpleTaggingResult {
  return mapPass1FocusRallyToDb({
    ...input,
    timeline: toSimpleTimeline(input.timeline),
  })
}

export function attachRallyIdToSimpleShots(
  shots: NewShot[],
  rallyId: string
): NewShot[] {
  return attachRallyIdToPass1Shots(shots, rallyId)
}

export type { NewRally, NewShot }
