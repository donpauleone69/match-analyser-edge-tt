/**
 * Highlighted rallies for Match Review.
 * Pure — no React, no IO.
 *
 * - flagged: rallies starred while tagging (is_highlight), in match order.
 * - longest: auto picks — the longest rallies by contacts that were not
 *   already starred (at least minShots contacts, at most `limit`).
 */

import type { DBRally, DBSet, DBShot } from '@/data'

export interface HighlightRallyRef {
  rallyId: string
  setNumber: number
  rallyIndex: number
  shotCount: number
}

export interface RallyHighlights {
  flagged: HighlightRallyRef[]
  longest: HighlightRallyRef[]
}

export function calculateRallyHighlights(input: {
  sets: DBSet[]
  rallies: DBRally[]
  shots: DBShot[]
  limit?: number
  minShots?: number
}): RallyHighlights {
  const { sets, rallies, shots, limit = 3, minShots = 5 } = input
  const setNumberById = new Map(sets.map((s) => [s.id, s.set_number]))

  const shotCount = new Map<string, number>()
  for (const shot of shots) {
    shotCount.set(shot.rally_id, Math.max(shotCount.get(shot.rally_id) ?? 0, shot.shot_index))
  }

  const refs: HighlightRallyRef[] = rallies
    .filter((r) => r.is_scoring)
    .map((r) => ({
      rallyId: r.id,
      setNumber: setNumberById.get(r.set_id) ?? 0,
      rallyIndex: r.rally_index,
      shotCount: shotCount.get(r.id) ?? 0,
    }))
    .sort((a, b) => a.setNumber - b.setNumber || a.rallyIndex - b.rallyIndex)

  const flaggedIds = new Set(rallies.filter((r) => r.is_highlight).map((r) => r.id))
  const flagged = refs.filter((r) => flaggedIds.has(r.rallyId))

  const longest = refs
    .filter((r) => !flaggedIds.has(r.rallyId) && r.shotCount >= minShots)
    .sort(
      (a, b) =>
        b.shotCount - a.shotCount || a.setNumber - b.setNumber || a.rallyIndex - b.rallyIndex
    )
    .slice(0, limit)

  return { flagged, longest }
}
