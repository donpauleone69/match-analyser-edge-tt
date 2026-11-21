import { describe, expect, it } from 'vitest'
import {
  clampWing,
  lineAction,
  newMarkAt,
  saveMark,
  spanBack,
  spanOnto,
  videoStatus,
  wingLimits,
} from '../lib/app'
import { mark, matchOfSets, setOf, video } from '../lib/builders'
import type { SetData } from '../lib/app'

function rally(videoId: string, a: number, b: number): SetData['rallies'][number] {
  return { id: `${a}`, videoId, contacts: [a, b], start: a, end: b, winner: 'me' } as SetData['rallies'][number]
}

describe('v0179 status', () => {
  const v1 = video('v1')
  const v2 = video('v2')
  const archived = video('arc', true)

  it('archived wins', () => {
    expect(videoStatus(matchOfSets([archived], [setOf(1, mark('arc', 0, 100, true), 'tagging')]), 'arc')).toBe('Archived')
  })
  it('no sets yet', () => {
    expect(videoStatus(matchOfSets([v1], [setOf(1, null, 'off')]), 'v1')).toBe('No sets yet')
  })
  it('tagging', () => {
    expect(videoStatus(matchOfSets([v1], [setOf(1, mark('v1', 0, 200, true), 'tagging')]), 'v1')).toBe('Tagging')
  })
  it('tagging before ready', () => {
    expect(
      videoStatus(
        matchOfSets(
          [v1],
          [
            setOf(1, mark('v1', 0, 100, true), 'saved'),
            setOf(2, mark('v1', 100, 400, true), 'tagging'),
            setOf(3, mark('v1', 400, 500, true), 'ready'),
          ],
        ),
        'v1',
      ),
    ).toBe('Tagging')
  })
  it('ready to tag', () => {
    expect(
      videoStatus(matchOfSets([v1], [setOf(1, mark('v1', 0, 100, true), 'saved'), setOf(2, mark('v1', 200, 400, true), 'ready')]), 'v1'),
    ).toBe('Ready to tag')
  })
  it('part filmed is ready', () => {
    expect(videoStatus(matchOfSets([v1], [setOf(1, mark('v1', 0, 80, false), 'part')]), 'v1')).toBe('Ready to tag')
  })
  it('saved and part filmed is ready', () => {
    expect(
      videoStatus(matchOfSets([v1], [setOf(1, mark('v1', 0, 100, true), 'saved'), setOf(2, mark('v1', 100, 180, false), 'part')]), 'v1'),
    ).toBe('Ready to tag')
  })
  it('free time still done', () => {
    expect(videoStatus(matchOfSets([v1], [setOf(1, mark('v1', 0, 90, true), 'saved')]), 'v1')).toBe('Done')
  })

  const spanning = matchOfSets([v1, v2], [setOf(3, { from: { videoId: 'v1', t: 500 }, to: { videoId: 'v2', t: 40 }, complete: true }, 'ready')])
  it('span counts on the next video', () => {
    expect(videoStatus(spanning, 'v2')).toBe('Ready to tag')
  })
  it('span counts on the first video', () => {
    expect(videoStatus(spanning, 'v1')).toBe('Ready to tag')
  })

  it('ready button', () => {
    expect(lineAction(setOf(2, mark('v1', 0, 10, true), 'ready'))).toBe('Tag')
  })
  it('tagging button', () => {
    expect(lineAction(setOf(2, mark('v1', 0, 10, true), 'tagging'))).toBe('Continue')
  })
  it('saved button', () => {
    expect(lineAction(setOf(1, mark('v1', 0, 10, true), 'saved'))).toBe('Open')
  })
  it('incomplete button', () => {
    expect(
      lineAction({
        ...setOf(3, mark('v1', 0, 10, true), 'saved'),
        rallies: [{ winner: 'me' } as SetData['rallies'][number], { winner: 'them' } as SetData['rallies'][number]],
      }),
    ).toBe('Continue')
  })

  const brief = matchOfSets([v1], [{ ...setOf(2, mark('v1', 0, 10, true), 'saved'), rallies: [{ winner: 'me' } as SetData['rallies'][number]] }])
  it('a later end reopens a short set', () => {
    expect(saveMark(brief, 2, mark('v1', 0, 12, true)).sets[0].finished).toBe(false)
  })
  it('a later end leaves a won set saved', () => {
    expect(saveMark(matchOfSets([v1], [setOf(1, mark('v1', 0, 10, true), 'saved')]), 1, mark('v1', 0, 12, true)).sets[0].finished).toBe(true)
  })
  it('moving the start leaves it saved', () => {
    expect(saveMark(brief, 2, mark('v1', 2, 10, true)).sets[0].finished).toBe(true)
  })
  it('the complete flag leaves it saved', () => {
    expect(saveMark(brief, 2, mark('v1', 0, 10, false)).sets[0].finished).toBe(true)
  })
  const overrun = {
    ...setOf(2, mark('v1', 0, 10, true), 'saved'),
    rallies: [
      ...Array.from({ length: 11 }, () => ({ winner: 'me' }) as SetData['rallies'][number]),
      ...Array.from({ length: 11 }, () => ({ winner: 'them' }) as SetData['rallies'][number]),
    ],
  }
  it('an overrun set stays won', () => {
    expect(lineAction(overrun)).toBe('Open')
  })
  it('a later end leaves an overrun set saved', () => {
    expect(saveMark(matchOfSets([v1], [overrun]), 2, mark('v1', 0, 12, true)).sets[0].finished).toBe(true)
  })
  it('part filmed can be tagged', () => {
    expect(lineAction(setOf(3, mark('v1', 0, 10, false), 'part'))).toBe('Tag')
  })
  it('unmarked has no button', () => {
    expect(lineAction(setOf(4, null, 'off'))).toBeNull()
  })

  const open = matchOfSets([video('v1', false)], [])
  open.videos[0] = { ...open.videos[0], durationS: 1000 }
  it('add at the start is part filmed', () => {
    const added = newMarkAt(open, 'v1', null)
    expect(added.ok && added.setId === 1 && added.mark.complete === false && added.mark.from.t === 0 && added.mark.to.t === 600).toBe(true)
  })
  it('add in free time is complete', () => {
    const mid = newMarkAt(open, 'v1', 100)
    expect(mid.ok && mid.mark.from.t === 100 && mid.mark.to.t === 700 && mid.mark.complete === true).toBe(true)
  })
  const short = matchOfSets([{ ...video('v1'), durationS: 700 }], [])
  it('add at the last video end is part filmed', () => {
    const tail = newMarkAt(short, 'v1', 200)
    expect(tail.ok && tail.mark.to.t === 700 && tail.mark.complete === false).toBe(true)
  })

  const taken = matchOfSets([{ ...video('v1'), durationS: 1000 }], [setOf(1, mark('v1', 0, 100, true), 'saved')])
  it('add takes the next number', () => {
    const next = newMarkAt(taken, 'v1', null)
    expect(next.ok && next.setId === 2 && next.mark.from.t === 100).toBe(true)
  })
  const taggedOff = matchOfSets([{ ...video('v1'), durationS: 1000 }], [setOf(1, null, 'saved')])
  it('add skips a tagged set with no mark', () => {
    const skipped = newMarkAt(taggedOff, 'v1', null)
    expect(skipped.ok && skipped.setId === 2).toBe(true)
  })
  it('taken number is refused', () => {
    const none = newMarkAt(taken, 'v1', 500, 1)
    expect(!none.ok && none.reason === 'No set number is free here.').toBe(true)
  })

  const bounded = matchOfSets(
    [{ ...video('v1'), durationS: 600 }],
    [
      setOf(1, mark('v1', 0, 100, true), 'saved'),
      {
        ...setOf(2, mark('v1', 100, 400, true), 'tagging'),
        rallies: [rally('v1', 180, 260)],
      },
    ],
  )
  const startLimit = wingLimits(bounded, 2, 'start')
  const endLimit = wingLimits(bounded, 2, 'end')
  it('start stops at the rally', () => {
    expect(startLimit !== null && clampWing(startLimit, 300).hint === 'Stops at rally 1' && clampWing(startLimit, 300).at === 180).toBe(true)
  })
  it('start stops at the neighbour', () => {
    expect(startLimit !== null && clampWing(startLimit, 10).hint === 'Stops at set 1').toBe(true)
  })
  it('end stops at the rally', () => {
    expect(endLimit !== null && clampWing(endLimit, 200).hint === 'Stops at rally 1' && Math.round(clampWing(endLimit, 200).at) === 260).toBe(true)
  })
  it('end stops at the video end', () => {
    expect(endLimit !== null && clampWing(endLimit, 900).hint === 'Stops at the video end' && clampWing(endLimit, 900).at === 600).toBe(true)
  })
  it('end on the video end hints', () => {
    expect(endLimit !== null && clampWing(endLimit, 600).hint === 'Stops at the video end' && clampWing(endLimit, 600).at === 600).toBe(true)
  })
  it('end keeps 60 seconds', () => {
    expect(endLimit !== null && clampWing(endLimit, 120).at >= 160).toBe(true)
  })
  const plain = matchOfSets([{ ...video('v1'), durationS: 600 }], [setOf(1, mark('v1', 0, 200, true), 'ready')])
  const plainEnd = wingLimits(plain, 1, 'end')
  it('60 seconds from the other wing', () => {
    expect(plainEnd !== null && clampWing(plainEnd, 20).hint === 'Stops at 1 minute' && clampWing(plainEnd, 20).at === 60).toBe(true)
  })

  const crowded = matchOfSets(
    [{ ...video('v1'), durationS: 600 }],
    [
      setOf(1, mark('v1', 0, 60, true), 'saved'),
      setOf(2, mark('v1', 60, 100, true), 'ready'),
      setOf(7, mark('v1', 100, 600, true), 'ready'),
    ],
  )
  const pinned = wingLimits(crowded, 2, 'end')
  it('crossed limits pin the wing', () => {
    expect(pinned !== null && pinned.lo === 100 && pinned.hi === 100).toBe(true)
  })
  it('nudge stays on the short set', () => {
    expect(pinned !== null && clampWing(pinned, 99).at === 100 && clampWing(pinned, 120).at === 100 && clampWing(pinned, 120).hint === 'Stops at set 7').toBe(
      true,
    )
  })
  const tight = matchOfSets(
    [{ ...video('v1'), durationS: 600 }],
    [setOf(1, mark('v1', 0, 60, true), 'saved'), setOf(7, mark('v1', 100, 600, true), 'ready')],
  )
  it('short gap is refused', () => {
    const refused = newMarkAt(tight, 'v1', 80)
    expect(!refused.ok && refused.reason === 'No room on this video.').toBe(true)
  })
  const mixed = matchOfSets(
    [{ ...video('v1'), durationS: 600 }],
    [setOf(1, mark('v1', 0, 60, true), 'saved'), setOf(2, mark('v1', 100, 200, true), 'saved')],
  )
  it('short stretch is skipped', () => {
    const later = newMarkAt(mixed, 'v1', 70)
    expect(later.ok && later.mark.from.t === 200 && later.mark.to.t - later.mark.from.t >= 60).toBe(true)
  })

  const two = matchOfSets(
    [
      { ...video('v1'), durationS: 400 },
      { ...video('v2'), durationS: 300 },
    ],
    [setOf(1, mark('v1', 0, 400, true), 'ready')],
  )
  it('span onto the next video', () => {
    const spanned = spanOnto(two, 1)
    expect(spanned !== null && spanned.to.videoId === 'v2' && spanned.to.t === 120).toBe(true)
  })
  const early = matchOfSets(two.videos, [setOf(1, mark('v1', 0, 400, true), 'ready'), setOf(2, mark('v2', 40, 80, true), 'ready')])
  it('span stops at the next set', () => {
    const shortSpan = spanOnto(early, 1)
    expect(shortSpan !== null && shortSpan.to.t === 40).toBe(true)
  })
  const atZero = matchOfSets(two.videos, [setOf(1, { from: { videoId: 'v1', t: 0 }, to: { videoId: 'v2', t: 0 }, complete: true }, 'ready')])
  it('span back to the video end', () => {
    const returned = spanBack(atZero, 1)
    expect(returned !== null && returned.to.videoId === 'v1' && returned.to.t === 400).toBe(true)
  })
  const past = matchOfSets(two.videos, [
    {
      ...setOf(1, { from: { videoId: 'v1', t: 0 }, to: { videoId: 'v2', t: 0 }, complete: true }, 'ready'),
      rallies: [{ videoId: 'v2', contacts: [5], start: 5, end: 5, winner: 'me' } as SetData['rallies'][number]],
    },
  ])
  it('span back keeps the rally', () => {
    expect(spanBack(past, 1)).toBeNull()
  })
  const blocked = matchOfSets(two.videos, [setOf(1, mark('v1', 0, 400, true), 'ready'), setOf(2, mark('v2', 0, 30, true), 'ready')])
  it('no room to span', () => {
    expect(spanOnto(blocked, 1)).toBeNull()
  })
  it('middle of a video does not span', () => {
    expect(spanOnto(matchOfSets(two.videos, [setOf(1, mark('v1', 0, 200, true), 'ready')]), 1)).toBeNull()
  })
})