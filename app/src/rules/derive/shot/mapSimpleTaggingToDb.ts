/**
 * Map Simple tagging timeline → NewRally + NewShot[].
 *
 * Same DB shape as Pass 1; optional Pass 1 tags (wing/stroke/standing/high/
 * safe/pivot) are forced empty. Review kind and contact times pass through.
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
    isPivot: false,
    reviewKind: shot.reviewKind ?? null,
    contactTime: shot.contactTime,
  }
}

function toSimpleTimeline(
  timeline: Pass1FocusTimelineInput
): Pass1FocusTimelineInput {
  const shots: Pass1FocusTimelineInput['shots'] = {}
  for (const [key, shot] of Object.entries(timeline.shots)) {
    shots[Number(key)] = stripOptionalPass1Tags(shot)
  }
  return { ...timeline, shots }
}

/** Thin wrapper: strip optional Pass 1 tags, then reuse Pass 1 mapper. */
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
