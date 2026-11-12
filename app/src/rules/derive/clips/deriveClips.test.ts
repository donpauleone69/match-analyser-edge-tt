import { describe, it, expect } from 'vitest'
import type { DBRally, DBShot } from '@/data'
import {
  applyClipPlaybackMode,
  decodeClipFilter,
  deriveClips,
  encodeClipFilter,
  isShotBasedClipFilter,
  resolveClipPlaybackWindow,
  type ClipFilter,
  type ClipMatchInput,
} from './deriveClips'
import { applyMeasuredDurations, deriveClipEdl, mapSourceToReel } from './deriveClipEdl'
import { deriveClipPresets } from './deriveClipPresets'

const HERO = 'hero-1'

function rally(id: string, index: number, patch: Partial<DBRally>): DBRally {
  return {
    id,
    set_id: 's1',
    rally_index: index,
    is_scoring: true,
    is_highlight: false,
    timestamp_start: index * 20,
    timestamp_end: index * 20 + 8,
    end_of_point_time: null,
    server_id: HERO,
    winner_id: HERO,
    first_attack_index: null,
    point_ending: 'winner',
    player1_score_before: index - 1,
    player2_score_before: 0,
    ...patch,
  } as unknown as DBRally
}

function shot(rallyId: string, index: number, time: number, patch: Partial<DBShot> = {}): DBShot {
  return {
    id: `${rallyId}-sh${index}`,
    rally_id: rallyId,
    shot_index: index,
    timestamp_start: time,
    // odd shots = hero (hero serves in these fixtures)
    player_id: index % 2 === 1 ? HERO : null,
    shot_review_kind: null,
    shot_wing: null,
    shot_stroke: null,
    ...patch,
  } as unknown as DBShot
}

const match: ClipMatchInput = {
  match: { id: 'm1', player1_id: HERO },
  sets: [{ id: 's1', set_number: 1 }],
  rallies: [
    rally('r1', 1, { is_highlight: true, first_attack_index: 3 }),
    rally('r2', 2, { winner_id: null, point_ending: 'error_net', first_attack_index: 2 }),
    rally('r3', 3, { winner_id: null, point_ending: 'winner', first_attack_index: 3 }),
    rally('let', 4, { is_scoring: false, is_highlight: true }),
  ],
  shots: [
    shot('r1', 1, 21),
    shot('r1', 2, 22),
    shot('r1', 3, 23, { shot_review_kind: 'technical', shot_wing: 'BH', shot_stroke: 'loop' }),
    shot('r2', 1, 41),
    shot('r2', 2, 42),
    shot('r2', 3, 43, { shot_review_kind: 'technical', shot_wing: 'BH', shot_stroke: 'push' }),
    shot('r3', 1, 61, { shot_review_kind: 'technical', shot_wing: 'BH', shot_stroke: 'loop' }),
    shot('r3', 2, 62),
    shot('r3', 3, 63, { shot_review_kind: 'tactical', shot_wing: 'FH', shot_stroke: 'loop' }),
  ],
}

const ids = (filter: ClipFilter) => deriveClips([match], filter).map((c) => c.id)

describe('deriveClips', () => {
  it('highlights: starred scoring rallies only, padded rally window', () => {
    const clips = deriveClips([match], { kind: 'highlights' })
    expect(clips.map((c) => c.id)).toEqual(['r1'])
    expect([clips[0].start, clips[0].end]).toEqual([19, 29])
  })

  it('review: filters by side, kind, wing and stroke', () => {
    expect(ids({ kind: 'review', side: 'hero', reviewKind: 'technical', wing: 'BH' })).toEqual([
      'r1-sh3',
      'r2-sh3',
      'r3-sh1',
    ])
    expect(ids({ kind: 'review', side: 'hero', reviewKind: 'technical', wing: 'BH', stroke: 'loop' })).toEqual([
      'r1-sh3',
      'r3-sh1',
    ])
    expect(ids({ kind: 'review', reviewKind: 'tactical' })).toEqual(['r3-sh3'])
  })

  it('shot clip runs from contact − lead to next contact + tail; keeps rally window', () => {
    const [c] = deriveClips([match], { kind: 'review', reviewKind: 'technical', stroke: 'loop', wing: 'BH' })
    // r1 shot 3 at 23, last shot → rally end 28 (+1 tail)
    expect([c.start, c.end, c.focusTime]).toEqual([21.5, 29, 23])
    expect([c.rallyStart, c.rallyEnd]).toEqual([19, 29])
    expect(resolveClipPlaybackWindow(c, 'rally')).toEqual({ start: 19, end: 29 })
    expect(resolveClipPlaybackWindow(c, 'shot')).toEqual({ start: 21.5, end: 29 })
    const r3 = deriveClips([match], { kind: 'review', reviewKind: 'technical' }).find((x) => x.id === 'r3-sh1')!
    // contact 61 − 1.5 but not before rally start − 1 (59); next contact 62 (+1)
    expect([r3.start, r3.end]).toEqual([59.5, 63])
    expect(applyClipPlaybackMode([r3], 'rally')[0].start).toBe(r3.rallyStart)
  })

  it('isShotBasedClipFilter: review and opening only', () => {
    expect(isShotBasedClipFilter({ kind: 'review' })).toBe(true)
    expect(isShotBasedClipFilter({ kind: 'opening', side: 'hero' })).toBe(true)
    expect(isShotBasedClipFilter({ kind: 'highlights' })).toBe(false)
    expect(isShotBasedClipFilter({ kind: 'errors', side: 'hero' })).toBe(false)
  })

  it('opening: attacks by side, optional outcome', () => {
    expect(ids({ kind: 'opening', side: 'hero' })).toEqual(['r1-sh3', 'r3-sh3'])
    expect(ids({ kind: 'opening', side: 'hero', outcome: 'lost' })).toEqual(['r3-sh3'])
    expect(ids({ kind: 'opening', side: 'villain' })).toEqual(['r2-sh2'])
  })

  it('errors and winners use who lost / won the point', () => {
    expect(ids({ kind: 'errors', side: 'hero' })).toEqual(['r2'])
    expect(ids({ kind: 'winners', side: 'hero' })).toEqual(['r1'])
    expect(ids({ kind: 'winners', side: 'villain' })).toEqual(['r3'])
    expect(ids({ kind: 'serve', side: 'hero', outcome: 'lost' })).toEqual(['r2', 'r3'])
  })

  it('skips rallies with no times', () => {
    const noTimes = {
      ...match,
      rallies: [rally('x', 1, { timestamp_start: null, timestamp_end: null, is_highlight: true })],
      shots: [],
    }
    expect(deriveClips([noTimes], { kind: 'highlights' })).toEqual([])
  })
})

describe('clip filter keys', () => {
  const filters: ClipFilter[] = [
    { kind: 'highlights' },
    { kind: 'review', side: 'hero', reviewKind: 'technical', wing: 'BH' },
    { kind: 'review' },
    { kind: 'opening', side: 'hero', outcome: 'lost' },
    { kind: 'serve', side: 'villain' },
    { kind: 'errors', side: 'hero' },
    { kind: 'rallies', rallyIds: ['a-s1-r1', 'a-s1-r2'] },
  ]
  it('round-trips', () => {
    for (const f of filters) expect(decodeClipFilter(encodeClipFilter(f))).toEqual(f)
  })
  it('rejects junk', () => {
    expect(decodeClipFilter('nope')).toBeNull()
    expect(decodeClipFilter('errors.nobody')).toBeNull()
  })
})

describe('deriveClipEdl', () => {
  it('merges overlapping clips from the same source and lays out the reel', () => {
    const clips = deriveClips([match], { kind: 'review', side: 'hero' })
    // r3-sh1 (59.5–63) and r3-sh3 (61.5–65) overlap → one segment
    const edl = deriveClipEdl(clips)
    expect(edl.segments.map((s) => [s.sourceStart, s.sourceEnd, s.clipIds.length])).toEqual([
      [21.5, 29, 1],
      [41.5, 49, 1],
      [59.5, 69, 2],
    ])
    expect(edl.segments[1].reelStart).toBe(7.5)
    expect(edl.duration).toBe(7.5 + 7.5 + 9.5)
  })

  it('does not merge across different set videos', () => {
    const a = { ...deriveClips([match], { kind: 'highlights' })[0] }
    const b = { ...a, id: 'b', setNumber: 2 }
    expect(deriveClipEdl([a, b]).segments).toHaveLength(2)
  })

  it('maps source time to reel time, shifting by measured keyframe lead', () => {
    const edl = deriveClipEdl(deriveClips([match], { kind: 'review', side: 'hero' }))
    expect(mapSourceToReel(edl, 'm1#1', 43)).toBe(7.5 + 1.5)
    expect(mapSourceToReel(edl, 'm1#1', 35)).toBeNull()
    const measured = applyMeasuredDurations(edl, [8, null, 9.5])
    // first segment measured 0.5 s longer → starts 0.5 s earlier in source
    expect(mapSourceToReel(measured, 'm1#1', 23)).toBe(0.5 + 1.5)
    expect(measured.segments[1].reelStart).toBe(8)
  })
})

describe('deriveClipPresets', () => {
  it('lists non-empty presets with counts, review patterns by count', () => {
    const presets = deriveClipPresets([match], { hero: 'Pat', villain: 'Opp' })
    const byKey = Object.fromEntries(presets.map((p) => [p.key, p]))
    expect(byKey['review.hero.technical.*.*'].count).toBe(3)
    expect(byKey['review.hero.technical.BH.loop'].count).toBe(2)
    expect(byKey['review.hero.technical.BH.push'].count).toBe(1)
    expect(byKey['highlights'].count).toBe(1)
    expect(byKey['opening.hero.*'].label).toBe('You · opening attacks')
    expect(byKey['opening.villain.*'].label).toBe('Opp · opening attacks')
    expect(byKey['review.hero.tactical.FH.loop'].count).toBe(1)
    const workOn = presets.filter((p) => p.group === 'work-on').map((p) => p.key)
    expect(workOn.indexOf('review.hero.technical.BH.loop')).toBeLessThan(workOn.indexOf('review.hero.technical.BH.push'))
  })
})
