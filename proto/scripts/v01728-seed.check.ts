/**
 * v0.17.28 demo seed. Fails on the first broken rule, naming the match, set and rally.
 * Run: npm run check:v01728-seed
 */
import { derivePhase, calculateMatchSetsWon, setScoresDiffer } from '../src/rules/match'
import { SEED } from '../src/data/demoStore'
import { bestOpener, bestParts } from '../src/rules/bestFa'
import { isError, winnerOf } from '../src/rules/rally'
import type { MatchRecord, SetData } from '../src/types/match'
import type { RallyData, ShotTags } from '../src/types/rally'
import { phaseOf } from '../src/rules/insights'
import {
  countPoints,
  firstServerForSet,
  isLegalEnd,
  serverAt,
  setOverOnRule,
} from '../src/rules/score'
import { endedEarly, gapsOf, MIN_SET_S, rallyOutside, spansOnVideo } from '../src/rules/marks'
import { tagsFromPlay } from '../src/features/tagging/script'
import type { ScriptRally } from '../src/types/video'
import { firstContactG, lastContactG, segmentsOf, toGlobal, totalDuration } from '../src/rules/timeline'

const fails: string[] = []
const say = (where: string, cond: boolean, detail = '') => {
  if (cond) return
  const line = `${where} ${detail}`.trim()
  fails.push(line)
  console.log(`FAIL  ${line}`)
  console.log(`\n${fails.length} failed`)
  process.exit(1)
}

const WINGS = new Set(['BH', 'FH'])
const today = new Date()
const iso = (days: number) => {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days)
  const two = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
}

function shotKeys(shot: ShotTags): string {
  return Object.keys(shot).sort().join(',')
}

function checkRally(match: MatchRecord, set: SetData, rally: RallyData, index: number, score: { me: number; them: number }) {
  const where = `${match.id} set ${set.setId} rally ${index + 1} (${rally.id})`
  if (rally.point) {
    say(where, rally.contacts.length === 0 && rally.shots.length === 0, 'point has contacts')
    say(where, rally.ending === null && rally.fa === null, 'point has an ending')
    say(where, rally.start === rally.end, 'point start and end differ')
    say(where, rally.server === serverAt(set.firstServer, score), `server ${rally.server}`)
    say(where, rally.winner === set.rallies[index].winner, 'winner')
    return
  }
  const n = rally.contacts.length
  say(where, rally.shots.length === n, 'I-1')
  say(where, n >= 1, 'no contacts')
  for (let i = 0; i < n; i++) {
    const t = rally.contacts[i]
    const video = match.videos.find((v) => v.id === rally.videoId)
    say(where, Boolean(video) && t >= 0 && t <= (video?.durationS ?? -1), `contact ${i} ${t}`)
    if (i > 0) say(where, t - rally.contacts[i - 1] >= 0.05, 'contacts too close')
  }
  say(where, rally.start <= rally.contacts[0] && rally.end >= rally.contacts[n - 1] && rally.start >= 0, 'I-3')
  say(where, rally.ending === 'Winner' || rally.ending === 'Net' || rally.ending === 'Long' || rally.ending === 'Wide', `ending ${rally.ending}`)
  say(where, rally.winner === winnerOf(rally), `winner ${rally.winner}`)
  if (n === 1) {
    say(where, shotKeys(rally.shots[0]) === '', 'serve only shot')
  } else {
    const serve = rally.shots[0]
    say(where, shotKeys(serve) === 'depth,wing' && (serve.depth === 'Short' || serve.depth === 'Long') && WINGS.has(serve.wing ?? ''), 'serve tags')
    for (let i = 1; i < n; i++) {
      const shot = rally.shots[i]
      say(
        where,
        shotKeys(shot) === 'stroke,wing' && WINGS.has(shot.wing ?? '') && (shot.stroke === 'Attack' || shot.stroke === 'Control'),
        `shot ${i + 1} ${shotKeys(shot)} ${shot.stroke}`,
      )
    }
  }
  const opener = bestOpener(n, rally.shots)
  const fa = opener === 'none' || opener === 'unknown' ? null : opener
  say(where, fa !== 1 && rally.fa === fa, `fa ${rally.fa} opener ${opener}`)
  say(where, rally.serveChecked === true, 'serveChecked')
  say(where, rally.idea?.flow === 'bestfa' && !rally.idea.first, 'idea flow')
  if (n >= 2) say(where, rally.idea?.serve === rally.shots[0].depth, 'idea.serve')
  const result = n === 1 ? (rally.ending === 'Winner' ? 'Ace' : 'Serve fault') : rally.ending
  say(where, rally.idea?.result === result, `idea.result ${rally.idea?.result}`)
  const parts = bestParts(n, rally.shots).map((part) => part.part)
  const review = rally.idea?.review ?? []
  say(where, new Set(review).size === review.length, 'review duplicates')
  say(where, review.every((part) => parts.includes(part)), `review ${review.join(',')}`)
  say(where, rally.server === serverAt(set.firstServer, score), `server ${rally.server} at ${score.me}-${score.them}`)
  const video = match.videos.find((v) => v.id === rally.videoId)
  const scripted = video?.script?.rallies.find((s) => s.contacts[0] === rally.contacts[0] && s.server === rally.server)
  say(where, Boolean(scripted), 'no scripted rally')
  if (scripted) {
    const tags = tagsFromPlay(scripted)
    say(where, JSON.stringify(tags.shots) === JSON.stringify(rally.shots) && tags.fa === rally.fa, 'tags differ from the play')
    say(where, scripted.winner === rally.winner, 'script winner')
  }
}

function markClock(match: MatchRecord, set: SetData): { a: number; b: number } | null {
  if (!set.mark) return null
  const segs = segmentsOf(match.videos)
  const a = toGlobal(segs, set.mark.from.videoId, set.mark.from.t)
  const b = toGlobal(segs, set.mark.to.videoId, set.mark.to.t)
  if (a === null || b === null) return null
  return { a, b }
}

const expected: Record<string, { opponent: string; event: string; days: number | null; me: number | null; them: number | null; phase: string }> = {
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

say('fourteen matches', SEED.length === 14, String(SEED.length))
say('ids', SEED.map((m) => m.id).join(',') === Object.keys(expected).join(','))

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
  say(match.id, want.opponent === match.opponent && want.event === match.event, `${match.opponent} ${match.event}`)
  say(match.id, match.date === (want.days === null ? '' : iso(want.days)), match.date)
  say(match.id, match.result.me === want.me && match.result.them === want.them, JSON.stringify(match.result))
  say(`${match.id} phase`, derivePhase(match) === want.phase, derivePhase(match))
  say(`${match.id} sets`, match.sets.every((s, i) => s.setId === i + 1), match.sets.map((s) => s.setId).join(','))
  for (const video of match.videos) {
    say(`${match.id} ${video.id}`, video.kind === 'demo' && video.script && video.durationS === video.script.duration, 'video')
    say(`${match.id} ${video.id} archive`, video.archived === (match.id === 'm-h10'), String(video.archived))
  }
  if (want.phase === 'complete' || want.phase === 'partial') {
    if (match.sets.some((s) => s.rallies.length > 0)) tagged.push(match)
  }
  const filmed = match.sets.filter((s) => s.mark && s.rallies.length > 0)
  let prevEnd = -1
  for (const set of match.sets) {
    say(`${match.id} set ${set.setId} server`, set.firstServer === firstServerForSet('me', set.setId), set.firstServer)
    say(`${match.id} set ${set.setId} draft`, set.draft === null, 'draft')
    let score = { me: 0, them: 0 }
    let prevAt = -1
    const segs = segmentsOf(match.videos)
    set.rallies.forEach((rally, i) => {
      checkRally(match, set, rally, i, score)
      const at = firstContactG(segs, rally)
      say(`${match.id} set ${set.setId} rally ${i + 1} order`, at !== null && at >= prevAt, String(at))
      prevAt = at ?? prevAt
      score = { me: score.me + (rally.winner === 'me' ? 1 : 0), them: score.them + (rally.winner === 'them' ? 1 : 0) }
      if (!rally.point && rally.ending) {
        ralliesN += 1
        shotsN += rally.contacts.length
        if (rally.contacts.length === 1) serveOnly += 1
        if (rally.contacts.length >= 10) longRallies += 1
        if (isError(rally.ending)) errors += 1
        if (rally.winner === 'me') youWon += 1
        const phase = phaseOf(rally.server, rally.contacts.length, rally.ending, 'me')
        if (phase) phases[phase] += 1
        if (rally.server === 'me') serveN += 1
        else receiveN += 1
      }
    })
    const won = set.finished && setOverOnRule(set.rallies.map((r) => r.winner))
    const early = endedEarly(set)
    const off = set.mark === null && set.rallies.length === 0
    const under = !set.finished && set.rallies.length > 0
    if (match.id === 'm-h3' && set.setId === 5) {
      say('m-h3 set 5 early', early && score.me === 9 && score.them === 7, `${score.me}-${score.them}`)
      const clock = markClock(match, set)
      const end = totalDuration(segmentsOf(match.videos))
      say('m-h3 set 5 mark ends at the video', clock !== null && Math.abs(clock.b - end) < 0.05, String(clock?.b))
    } else if (under) {
      say(`${match.id} set ${set.setId} under way`, !isLegalEnd(score) && !setOverOnRule(set.rallies.map((r) => r.winner)), `${score.me}-${score.them}`)
      say(`${match.id} set ${set.setId} not complete`, set.mark?.complete === false, String(set.mark?.complete))
      if (!(match.id === 'm-partial' && set.setId === 2)) {
        const clock = markClock(match, set)
        const last = set.rallies[set.rallies.length - 1]
        const seg = segmentsOf(match.videos).find((s) => s.id === last.videoId)
        const end = seg ? seg.offset + seg.duration : -1
        say(`${match.id} set ${set.setId} mark to video end`, clock !== null && seg !== null && Math.abs(clock.b - end) < 0.05, String(clock?.b))
      }
    } else if (won) {
      say(`${match.id} set ${set.setId} no overrun`, true)
      say(`${match.id} set ${set.setId} complete mark`, set.mark?.complete === true, String(set.mark?.complete))
      const counted = countPoints(set.rallies.map((r) => r.winner))
      if (!(match.id === 'm-complete' && set.setId === 2)) {
        say(`${match.id} set ${set.setId} details`, set.entered.me === String(counted.me) && set.entered.them === String(counted.them), `${set.entered.me}-${set.entered.them} vs ${counted.me}-${counted.them}`)
      } else {
        say('m-complete set 2 differs', setScoresDiffer(set), `${set.entered.me}-${set.entered.them} vs ${counted.me}-${counted.them}`)
      }
    } else if (off && match.id !== 'm-new' && match.id !== 'm-ready') {
      const me = Number(set.entered.me)
      const them = Number(set.entered.them)
      say(`${match.id} set ${set.setId} details legal`, set.entered.me !== '' && isLegalEnd({ me, them }), `${set.entered.me}-${set.entered.them}`)
    }
    if (set.mark) {
      const clock = markClock(match, set)
      say(`${match.id} set ${set.setId} mark forward`, clock !== null && clock.a <= clock.b + 0.001, JSON.stringify(clock))
      say(`${match.id} set ${set.setId} inside`, rallyOutside(match.videos, set.rallies, set.mark) === null, JSON.stringify(rallyOutside(match.videos, set.rallies, set.mark)))
      const videos = new Set([set.mark.from.videoId, set.mark.to.videoId])
      const ids = match.videos.map((v) => v.id)
      const ia = ids.indexOf(set.mark.from.videoId)
      const ib = ids.indexOf(set.mark.to.videoId)
      say(`${match.id} set ${set.setId} span`, ia >= 0 && ib >= 0 && ib - ia <= 1, `${ia} ${ib}`)
      if (prevEnd >= 0 && clock) {
        const gap = clock.a - prevEnd
        say(`${match.id} set ${set.setId} no overlap`, gap >= -0.05, String(gap))
        say(`${match.id} set ${set.setId} no blank`, gap < 8, String(gap))
      }
      if (clock) prevEnd = clock.b
    }
  }
  if (want.phase === 'complete') {
    const won = calculateMatchSetsWon(match)
    say(`${match.id} result`, won.me === match.result.me && won.them === match.result.them, `${won.me}-${won.them}`)
  }
}

say('twelve tagged', tagged.length === 12, String(tagged.length))
say('serve only', serveOnly / ralliesN >= 0.03 && serveOnly / ralliesN <= 0.05, `${serveOnly}/${ralliesN}`)
say('mean length', shotsN / ralliesN >= 4.7 && shotsN / ralliesN <= 5.15, String((shotsN / ralliesN).toFixed(2)))
say('long rallies', longRallies >= 10, String(longRallies))
say('errors', errors / ralliesN >= 0.75 && errors / ralliesN <= 0.85, String(errors / ralliesN))
say('you win about 55%', youWon / ralliesN >= 0.5 && youWon / ralliesN <= 0.6, String(youWon / ralliesN))
say('rally share', phases.rally / ralliesN >= 0.3 && phases.rally / ralliesN <= 0.4, String(phases.rally / ralliesN))
for (const phase of ['serve', 'receive', 'rally'] as const) {
  say(`${phase} over 100`, phases[phase] >= 100, String(phases[phase]))
}
say('serve solid', serveN >= 270, String(serveN))
say('receive solid', receiveN >= 270, String(receiveN))

const opponents = new Set(tagged.map((m) => m.opponent))
const events = new Set(tagged.map((m) => m.event))
say('opponents', opponents.size >= 4, [...opponents].join(','))
say('events', events.size >= 4, [...events].join(','))
const dates = tagged.map((m) => m.date).filter(Boolean).sort()
const span = (Date.parse(dates[dates.length - 1]) - Date.parse(dates[0])) / 86400000
say('about ninety days', span >= 80 && span <= 100, String(span))

const points = SEED.find((m) => m.id === 'm-h9')!.sets[1].rallies.filter((r) => r.point)
say('two points without video', points.length === 2, String(points.length))
const h9 = SEED.find((m) => m.id === 'm-h9')!
for (const point of points) {
  const video = h9.videos.find((v) => v.id === point.videoId)
  const onPlay = (video?.script?.rallies ?? []).some((rally) => {
    const last = rally.contacts[rally.contacts.length - 1]
    return rally.contacts[0] - 0.05 <= point.start && point.start <= last + 0.05
  })
  say(`m-h9 point at ${point.start} is off the picture`, !onPlay)
}
const partial = SEED.find((m) => m.id === 'm-partial')!
say('partial two videos', partial.videos.length === 2)
say('partial set 2 saved on the first video', partial.sets[1].rallies.every((r) => r.videoId === 'v-club-1'))
say('partial set 2 details', partial.sets[1].entered.me === '9' && partial.sets[1].entered.them === '11')
say('partial set 2 mark runs onto video 2', partial.sets[1].mark?.from.videoId === 'v-club-1' && partial.sets[1].mark?.to.videoId === 'v-club-2')
const partialSpans = spansOnVideo(partial.videos, partial.sets, 'v-club-2')
const partialGaps = gapsOf(partial.videos[1].durationS, partialSpans)
say('set 3 has room to tag', partialGaps.some((gap) => gap.b - gap.a >= MIN_SET_S), partialGaps.map((gap) => `${gap.a.toFixed(0)}-${gap.b.toFixed(0)}`).join(','))
say('set 3 is not marked', partial.sets[2].mark === null && partial.sets[2].rallies.length === 0)
say('set 4 is not on video', partial.sets[3].mark === null && (partial.videos[1].script?.rallies ?? []).every((rally) => rally.setNo !== 4))

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
      say(`${match.id} set ${setNo} saved rally is on the script`, Boolean(hit), rally.id)
      if (hit) paired.add(hit.rally)
    }
    const untagged = scripted.filter((item) => !paired.has(item.rally))
    if (untagged.length === 0) continue
    const winners = [...saved.map((rally) => rally.winner), ...untagged.map((item) => item.rally.winner)]
    const score = countPoints(winners)
    say(`${match.id} set ${setNo} script ends on the rule`, playsToEnd(winners), `${score.me}-${score.them}`)
    if (set && set.entered.me !== '' && set.entered.them !== '') {
      say(
        `${match.id} set ${setNo} script matches details`,
        set.entered.me === String(score.me) && set.entered.them === String(score.them),
        `${set.entered.me}-${set.entered.them} vs ${score.me}-${score.them}`,
      )
    }
    if (set && saved.length > 0) {
      const prefix = scripted.slice(0, saved.length).every((item, i) => item.rally.winner === saved[i].winner)
      say(`${match.id} set ${setNo} saved rallies start the script`, prefix)
    }
  }
}
const h7 = SEED.find((m) => m.id === 'm-h7')!
const spanned = h7.sets.find((s) => s.mark && s.mark.from.videoId !== s.mark.to.videoId)
say('a set across the cut', Boolean(spanned), spanned ? String(spanned.setId) : '')
const marked = tagged.reduce((n, m) => n + m.sets.reduce((k, s) => k + s.rallies.filter((r) => (r.idea?.review?.length ?? 0) > 0).length, 0), 0)
say('marks about one in twelve', marked > ralliesN / 20 && marked < ralliesN / 8, `${marked}/${ralliesN}`)

console.log(
  `seed ok  rallies ${ralliesN}  mean ${(shotsN / ralliesN).toFixed(2)}  serve-only ${(100 * serveOnly / ralliesN).toFixed(1)}%  errors ${(100 * errors / ralliesN).toFixed(1)}%  you ${(100 * youWon / ralliesN).toFixed(1)}%  rally ${(100 * phases.rally / ralliesN).toFixed(1)}%  phases ${phases.serve}/${phases.receive}/${phases.rally}  serve ${serveN} receive ${receiveN}`,
)
