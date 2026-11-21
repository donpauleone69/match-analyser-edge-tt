import { expect, it } from 'vitest'
import {
  countPoints,
  derivePhase,
  firstServerForSet,
  gapsOf,
  isError,
  isLegalEnd,
  matchSetsWon,
  MIN_SET_S,
  phaseOf,
  SEED,
  setOverOnRule,
  spansOnVideo,
  type MatchRecord,
  type ScriptRally,
} from '../lib/app'
import { isoDaysBefore } from '../lib/app'
import { TODAY } from '../lib/fixed'

const expected: Record<
  string,
  { opponent: string; event: string; days: number | null; me: number | null; them: number | null; phase: string }
> = {
  'm-new': { opponent: 'Lee', event: 'Open trial', days: null, me: null, them: null, phase: 'new' },
  'm-ready': { opponent: 'Kim', event: 'County open', days: 3, me: null, them: null, phase: 'ready' },
  'm-partial': { opponent: 'Sam', event: 'Club night', days: 6, me: 3, them: 1, phase: 'partial' },
  'm-complete': { opponent: 'Pat', event: 'League final', days: 12, me: 3, them: 2, phase: 'complete' },
  'm-h1': { opponent: 'Alex', event: 'Junior GP', days: 19, me: 3, them: 0, phase: 'complete' },
  'm-h2': { opponent: 'Jo', event: 'Junior GP', days: 19, me: 1, them: 3, phase: 'complete' },
  'm-h3': { opponent: 'Kim', event: 'League', days: 26, me: 3, them: 2, phase: 'complete' },
  'm-h4': { opponent: 'Sam', event: 'Club night', days: 33, me: 2, them: 1, phase: 'complete' },
  'm-h5': { opponent: 'Max', event: 'County open', days: 40, me: 3, them: 1, phase: 'complete' },
  'm-h6': { opponent: 'Pat', event: 'League', days: 47, me: 2, them: 3, phase: 'complete' },
  'm-h7': { opponent: 'Alex', event: 'Nationals', days: 61, me: 3, them: 1, phase: 'complete' },
  'm-h8': { opponent: 'Jo', event: 'Nationals', days: 61, me: 0, them: 3, phase: 'complete' },
  'm-h9': { opponent: 'Lee', event: 'League', days: 75, me: 3, them: 1, phase: 'complete' },
  'm-h10': { opponent: 'Max', event: 'Junior GP', days: 88, me: 3, them: 2, phase: 'complete' },
}

it('fourteen matches', () => {
  expect(SEED.length).toBe(14)
})
it('ids', () => {
  expect(SEED.map((m) => m.id).join(',')).toBe(Object.keys(expected).join(','))
})

let ralliesN = 0
let shotsN = 0
let serveOnly = 0
let errors = 0
let longRallies = 0
let youWon = 0
const phases = { serve: 0, receive: 0, rally: 0 }
let serveN = 0
let receiveN = 0
const tagged: MatchRecord[] = []

for (const match of SEED) {
  const want = expected[match.id]
  it(`${match.id} opponent and event`, () => {
    expect(want.opponent === match.opponent && want.event === match.event).toBe(true)
  })
  it(`${match.id} date`, () => {
    expect(match.date).toBe(want.days === null ? '' : isoDaysBefore(TODAY, want.days))
  })
  it(`${match.id} result`, () => {
    expect(match.result.me === want.me && match.result.them === want.them).toBe(true)
  })
  it(`${match.id} phase`, () => {
    expect(derivePhase(match)).toBe(want.phase)
  })
  it(`${match.id} sets`, () => {
    expect(match.sets.every((s, i) => s.setId === i + 1)).toBe(true)
  })
  for (const video of match.videos) {
    it(`${match.id} ${video.id} demo script`, () => {
      expect(video.kind === 'demo' && video.script && video.durationS === video.script.duration).toBe(true)
    })
    it(`${match.id} ${video.id} archive`, () => {
      expect(video.archived).toBe(match.id === 'm-h10')
    })
  }
  if (want.phase === 'complete' || want.phase === 'partial') {
    if (match.sets.some((s) => s.rallies.length > 0)) tagged.push(match)
  }
  for (const set of match.sets) {
    it(`${match.id} set ${set.setId} server`, () => {
      expect(set.firstServer).toBe(firstServerForSet('me', set.setId))
    })
    it(`${match.id} set ${set.setId} draft`, () => {
      expect(set.draft).toBeNull()
    })
    let score = { me: 0, them: 0 }
    for (const rally of set.rallies) {
      score = { me: score.me + (rally.winner === 'me' ? 1 : 0), them: score.them + (rally.winner === 'them' ? 1 : 0) }
      if (!rally.point && rally.ending) {
        ralliesN += 1
        shotsN += rally.contacts.length
        if (rally.contacts.length === 1) serveOnly += 1
        if (rally.contacts.length >= 10) longRallies += 1
        if (isError(rally.ending)) errors += 1
        if (rally.winner === 'me') youWon += 1
        const ph = phaseOf(rally.server, rally.contacts.length, rally.ending, 'me')
        if (ph) phases[ph] += 1
        if (rally.server === 'me') serveN += 1
        else receiveN += 1
      }
    }
  }
  if (want.phase === 'complete') {
    it(`${match.id} tagged result`, () => {
      const won = matchSetsWon(match)
      expect(won.me === match.result.me && won.them === match.result.them).toBe(true)
    })
  }
}

it('twelve tagged', () => {
  expect(tagged.length).toBe(12)
})
it('serve only share', () => {
  expect(serveOnly / ralliesN >= 0.03 && serveOnly / ralliesN <= 0.05).toBe(true)
})
it('mean length', () => {
  expect(shotsN / ralliesN >= 4.7 && shotsN / ralliesN <= 5.15).toBe(true)
})
it('long rallies', () => {
  expect(longRallies >= 10).toBe(true)
})
it('errors share', () => {
  expect(errors / ralliesN >= 0.75 && errors / ralliesN <= 0.85).toBe(true)
})
it('you win about 55%', () => {
  expect(youWon / ralliesN >= 0.5 && youWon / ralliesN <= 0.6).toBe(true)
})
it('rally share', () => {
  expect(phases.rally / ralliesN >= 0.3 && phases.rally / ralliesN <= 0.4).toBe(true)
})
for (const phase of ['serve', 'receive', 'rally'] as const) {
  it(`${phase} over 100`, () => {
    expect(phases[phase] >= 100).toBe(true)
  })
}
it('serve solid', () => {
  expect(serveN >= 270).toBe(true)
})
it('receive solid', () => {
  expect(receiveN >= 270).toBe(true)
})

it('opponents variety', () => {
  const opponents = new Set(tagged.map((m) => m.opponent))
  expect(opponents.size >= 4).toBe(true)
})
it('events variety', () => {
  const events = new Set(tagged.map((m) => m.event))
  expect(events.size >= 4).toBe(true)
})
it('about ninety days', () => {
  const dates = tagged.map((m) => m.date).filter(Boolean).sort()
  const span = (Date.parse(dates[dates.length - 1]) - Date.parse(dates[0])) / 86400000
  expect(span >= 80 && span <= 100).toBe(true)
})

const points = SEED.find((m) => m.id === 'm-h9')!.sets[1].rallies.filter((r) => r.point)
it('two points without video', () => {
  expect(points.length).toBe(2)
})
const h9 = SEED.find((m) => m.id === 'm-h9')!
for (const point of points) {
  it(`m-h9 point at ${point.start} is off the picture`, () => {
    const video = h9.videos.find((v) => v.id === point.videoId)
    const onPlay = (video?.script?.rallies ?? []).some((rally) => {
      const last = rally.contacts[rally.contacts.length - 1]
      return rally.contacts[0] - 0.05 <= point.start && point.start <= last + 0.05
    })
    expect(onPlay).toBe(false)
  })
}

const partial = SEED.find((m) => m.id === 'm-partial')!
it('partial two videos', () => {
  expect(partial.videos.length).toBe(2)
})
it('partial set 2 saved on the first video', () => {
  expect(partial.sets[1].rallies.every((r) => r.videoId === 'v-club-1')).toBe(true)
})
it('partial set 2 details', () => {
  expect(partial.sets[1].entered.me === '9' && partial.sets[1].entered.them === '11').toBe(true)
})
it('partial set 2 mark runs onto video 2', () => {
  expect(partial.sets[1].mark?.from.videoId === 'v-club-1' && partial.sets[1].mark?.to.videoId === 'v-club-2').toBe(true)
})
const partialSpans = spansOnVideo(partial.videos, partial.sets, 'v-club-2')
const partialGaps = gapsOf(partial.videos[1].durationS, partialSpans)
it('set 3 has room to tag', () => {
  expect(partialGaps.some((gap) => gap.b - gap.a >= MIN_SET_S)).toBe(true)
})
it('set 3 is not marked', () => {
  expect(partial.sets[2].mark === null && partial.sets[2].rallies.length === 0).toBe(true)
})
it('set 4 is not on video', () => {
  expect(
    partial.sets[3].mark === null && (partial.videos[1].script?.rallies ?? []).every((rally) => rally.setNo !== 4),
  ).toBe(true)
})

function scriptedSets(match: MatchRecord): Map<number, { videoId: string; rally: ScriptRally }[]> {
  const out = new Map<number, { videoId: string; rally: ScriptRally }[]>()
  for (const video of match.videos) {
    for (const rally of video.script?.rallies ?? []) {
      const list = out.get(rally.setNo) ?? []
      list.push({ videoId: video.id, rally })
      out.set(rally.setNo, list)
    }
  }
  return out
}

function playsToEnd(winners: Array<'me' | 'them'>): boolean {
  return winners.length > 0 && setOverOnRule(winners) && isLegalEnd(countPoints(winners))
}

for (const match of SEED) {
  const bySet = scriptedSets(match)
  for (const [setNo, scripted] of bySet) {
    const set = match.sets.find((row) => row.setId === setNo)
    const saved = set?.rallies ?? []
    const paired = new Set<ScriptRally>()
    for (const rally of saved) {
      if (rally.point) continue
      const hit = scripted.find(
        (item) => !paired.has(item.rally) && item.videoId === rally.videoId && item.rally.contacts[0] === rally.contacts[0] && item.rally.server === rally.server,
      )
      it(`${match.id} set ${setNo} saved rally ${rally.id} is on the script`, () => {
        expect(Boolean(hit)).toBe(true)
      })
      if (hit) paired.add(hit.rally)
    }
    const untagged = scripted.filter((item) => !paired.has(item.rally))
    if (untagged.length === 0) continue
    const winners = [...saved.map((rally) => rally.winner), ...untagged.map((item) => item.rally.winner)]
    const score = countPoints(winners)
    it(`${match.id} set ${setNo} script ends on the rule`, () => {
      expect(playsToEnd(winners), `${score.me}-${score.them}`).toBe(true)
    })
    if (set && set.entered.me !== '' && set.entered.them !== '') {
      it(`${match.id} set ${setNo} script matches details`, () => {
        expect(set.entered.me === String(score.me) && set.entered.them === String(score.them)).toBe(true)
      })
    }
    if (set && saved.length > 0) {
      it(`${match.id} set ${setNo} saved rallies start the script`, () => {
        const prefix = scripted.slice(0, saved.length).every((item, i) => item.rally.winner === saved[i].winner)
        expect(prefix).toBe(true)
      })
    }
  }
}

const h7 = SEED.find((m) => m.id === 'm-h7')!
const spanned = h7.sets.find((s) => s.mark && s.mark.from.videoId !== s.mark.to.videoId)
it('a set across the cut', () => {
  expect(Boolean(spanned)).toBe(true)
})

const marked = tagged.reduce(
  (n, m) => n + m.sets.reduce((k, s) => k + s.rallies.filter((r) => (r.idea?.review?.length ?? 0) > 0).length, 0),
  0,
)
it('marks about one in twelve', () => {
  expect(marked > ralliesN / 20 && marked < ralliesN / 8, `${marked}/${ralliesN}`).toBe(true)
})