/**
 * Group shots flagged for review into "what to work on" patterns.
 * Pure — no React, no IO.
 *
 * - Split by side (hero first) and kind (technical vs tactical).
 * - Within each kind, group by wing + stroke so repeated faults read as one
 *   pattern ("5× BH push").
 * - Patterns sort by count (desc), then by first occurrence.
 */

import type { ShotReviewKind, ShotStroke, ShotWing } from '@/data'
import type { ReviewShotLine } from './calculateReviewShots'
import type { StorySide } from './calculateMatchStory'

export interface ReviewPattern {
  /** `${side}|${kind}|${wing}|${stroke}` */
  key: string
  side: StorySide
  kind: ShotReviewKind
  wing: ShotWing | null
  stroke: ShotStroke | null
  count: number
  lines: ReviewShotLine[]
}

export interface ReviewShotGroups {
  total: number
  bySide: Record<StorySide, { technical: ReviewPattern[]; tactical: ReviewPattern[]; total: number }>
  /** Repeated patterns (count >= minRepeat), hero first, biggest first. */
  focus: ReviewPattern[]
}

export function groupReviewShots(
  lines: ReviewShotLine[],
  heroId: string,
  minRepeat = 2
): ReviewShotGroups {
  const patterns = new Map<string, ReviewPattern>()
  const order: string[] = []

  for (const line of lines) {
    const side: StorySide = line.playerId === heroId ? 'hero' : 'villain'
    const key = `${side}|${line.reviewKind}|${line.wing ?? '?'}|${line.stroke ?? '?'}`
    let pattern = patterns.get(key)
    if (!pattern) {
      pattern = {
        key,
        side,
        kind: line.reviewKind,
        wing: line.wing,
        stroke: line.stroke,
        count: 0,
        lines: [],
      }
      patterns.set(key, pattern)
      order.push(key)
    }
    pattern.count++
    pattern.lines.push(line)
  }

  const sorted = [...patterns.values()].sort(
    (a, b) => b.count - a.count || order.indexOf(a.key) - order.indexOf(b.key)
  )

  const pick = (side: StorySide, kind: ShotReviewKind) =>
    sorted.filter((p) => p.side === side && p.kind === kind)

  const sideGroup = (side: StorySide) => {
    const technical = pick(side, 'technical')
    const tactical = pick(side, 'tactical')
    const total = [...technical, ...tactical].reduce((sum, p) => sum + p.count, 0)
    return { technical, tactical, total }
  }

  const focus = sorted
    .filter((p) => p.count >= minRepeat)
    .sort((a, b) => (a.side === b.side ? 0 : a.side === 'hero' ? -1 : 1))

  return {
    total: lines.length,
    bySide: { hero: sideGroup('hero'), villain: sideGroup('villain') },
    focus,
  }
}
