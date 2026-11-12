import { describe, it, expect } from 'vitest'
import { groupReviewShots } from './groupReviewShots'
import type { ReviewShotLine } from './calculateReviewShots'

let n = 0
function line(partial: Partial<ReviewShotLine>): ReviewShotLine {
  n++
  return {
    shotId: `s${n}`,
    rallyId: `r${n}`,
    setId: 'set1',
    rallyIndex: n,
    shotIndex: 2,
    reviewKind: 'technical',
    playerId: 'hero',
    wing: 'BH',
    stroke: 'push',
    timestampStart: n,
    ...partial,
  }
}

describe('groupReviewShots', () => {
  const lines = [
    line({}),
    line({ wing: 'FH', stroke: 'loop' }),
    line({}),
    line({ reviewKind: 'tactical', wing: null, stroke: null }),
    line({}),
    line({ playerId: null, wing: 'FH', stroke: 'loop' }),
    line({ playerId: null, wing: 'FH', stroke: 'loop' }),
  ]
  const groups = groupReviewShots(lines, 'hero')

  it('groups technical shots by wing + stroke, biggest first', () => {
    const technical = groups.bySide.hero.technical
    expect(technical.map((p) => [p.wing, p.stroke, p.count])).toEqual([
      ['BH', 'push', 3],
      ['FH', 'loop', 1],
    ])
  })

  it('keeps tactical separate and counts per side', () => {
    expect(groups.bySide.hero.tactical).toHaveLength(1)
    expect(groups.bySide.hero.total).toBe(5)
    expect(groups.bySide.villain.total).toBe(2)
    expect(groups.total).toBe(7)
  })

  it('surfaces repeated patterns as focus items, hero first', () => {
    expect(groups.focus.map((p) => [p.side, p.wing, p.stroke, p.count])).toEqual([
      ['hero', 'BH', 'push', 3],
      ['villain', 'FH', 'loop', 2],
    ])
  })
})
