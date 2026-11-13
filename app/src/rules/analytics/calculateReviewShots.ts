/**
 * List shots flagged for review across a match (Pass 1 Focus).
 * Pure — no React, no IO.
 */

import type { DBRally, DBShot, ShotReviewKind } from '@/data'
import { isCompleteScoringRally } from './isCompleteScoringRally'

export interface ReviewShotLine {
  shotId: string
  rallyId: string
  setId: string
  rallyIndex: number
  shotIndex: number
  reviewKind: ShotReviewKind
  playerId: string | null
  wing: DBShot['shot_wing']
  stroke: DBShot['shot_stroke']
  timestampStart: number
}

export function calculateReviewShots(input: {
  rallies: DBRally[]
  shots: DBShot[]
}): ReviewShotLine[] {
  const rallyById = new Map(input.rallies.map((r) => [r.id, r]))
  const lines: ReviewShotLine[] = []

  for (const shot of input.shots) {
    const kind = shot.shot_review_kind
    if (kind !== 'technical' && kind !== 'tactical') continue
    const rally = rallyById.get(shot.rally_id)
    if (!rally || !isCompleteScoringRally(rally)) continue
    lines.push({
      shotId: shot.id,
      rallyId: rally.id,
      setId: rally.set_id,
      rallyIndex: rally.rally_index,
      shotIndex: shot.shot_index,
      reviewKind: kind,
      playerId: shot.player_id,
      wing: shot.shot_wing,
      stroke: shot.shot_stroke,
      timestampStart: shot.timestamp_start,
    })
  }

  return lines.sort((a, b) => {
    if (a.setId !== b.setId) return a.setId.localeCompare(b.setId)
    if (a.rallyIndex !== b.rallyIndex) return a.rallyIndex - b.rallyIndex
    return a.shotIndex - b.shotIndex
  })
}
