import {
  bestOpener,
  bestParts,
  createMatchStore,
  deleteTags,
  derivePhase,
  finishSet,
  firstServerForSet,
  isMatchTagged,
  isRealResult,
  markState,
  matchSetsWon,
  migrateSetMark,
  missingVideoIds,
  newMarkAt,
  rallyOutside,
  resultDiffers,
  segmentsOf,
  selectMatch,
  serveBands,
  serverAt,
  setEndIndex,
  setLineLabel,
  setOverOnRule,
  setScoresDiffer,
  startSet,
  taggedResult,
  toGlobal,
  videoLocked,
  videoMoveBreaks,
  videoStatus,
  type MatchRecord,
  type RallyData,
  type SetData,
  type ShotTags,
  type Side,
} from '../lib/app'

export type InvariantCtx = { matches: MatchRecord[]; today: Date }

export type Invariant = {
  id: string
  text: string
  kind: 'data' | 'probe' | 'skip'
  reads: string[]
  check?: (ctx: InvariantCtx) => string[]
  reason?: string
}

type Score = { me: number; them: number }
type Part = { part: string; from: number; to: number }
type State =
  | 'spare'
  | 'not-on-video'
  | 'ready'
  | 'under-way'
  | 'saved-won'
  | 'ended-early'
  | 'incomplete'

const ZERO: Score = { me: 0, them: 0 }

function place(matchId: string, setId: number, n: number, rallyId: string, what: string): string {
  return `${matchId} set ${setId} rally ${n} (${rallyId}): ${what}`
}

function atSet(m: MatchRecord, s: SetData, what: string): string {
  return place(m.id, s.setId, 0, '-', what)
}

function atRally(m: MatchRecord, s: SetData, r: RallyData, n: number, what: string): string {
  return place(m.id, s.setId, n, r.id, what)
}

function add(score: Score, winner: Side): Score {
  return winner === 'me' ? { me: score.me + 1, them: score.them } : { me: score.me, them: score.them + 1 }
}

function count(winners: Side[]): Score {
  return winners.reduce(add, ZERO)
}

function serverDue(first: Side, score: Score): Side {
  const other: Side = first === 'me' ? 'them' : 'me'
  const total = score.me + score.them
  if (score.me >= 10 && score.them >= 10) return (total - 20) % 2 === 0 ? first : other
  return Math.floor(total / 2) % 2 === 0 ? first : other
}

function won(score: Score): boolean {
  return Math.max(score.me, score.them) >= 11 && Math.abs(score.me - score.them) >= 2
}

function legalEnd(score: Score): boolean {
  const hi = Math.max(score.me, score.them)
  const lo = Math.min(score.me, score.them)
  if (hi === 11 && lo <= 9) return true
  return lo >= 10 && hi - lo === 2
}

function winIndex(winners: Side[]): number {
  let score = ZERO
  for (let i = 0; i < winners.length; i++) {
    score = add(score, winners[i])
    if (won(score)) return i
  }
  return -1
}

function taggedOf(winners: Side[]): Score | null {
  if (winners.length === 0) return null
  const end = winIndex(winners)
  return count(end < 0 ? winners : winners.slice(0, end + 1))
}

function leaderOf(score: Score | null): Side | null {
  if (!score || score.me === score.them) return null
  return score.me > score.them ? 'me' : 'them'
}

function enteredOf(s: SetData): Score | null {
  if (s.entered.me === '' || s.entered.them === '') return null
  const me = Number(s.entered.me)
  const them = Number(s.entered.them)
  if (!Number.isFinite(me) || !Number.isFinite(them)) return null
  return { me, them }
}

function winnersOf(s: SetData): Side[] {
  return s.rallies.map((r) => r.winner)
}

function early(s: SetData): boolean {
  if (!s.finished || s.rallies.length === 0) return false
  const score = taggedOf(winnersOf(s))
  return leaderOf(score) !== null && score !== null && !legalEnd(score)
}

function hitter(server: Side, shot: number): Side {
  return shot % 2 === 1 ? server : server === 'me' ? 'them' : 'me'
}

function winnerRule(server: Side, n: number, ending: string | null): Side | null {
  if (!ending || n === 0) return null
  const last = hitter(server, n)
  const error = ending === 'Net' || ending === 'Long' || ending === 'Wide' || ending === 'Air' || ending === 'Off'
  return error ? (last === 'me' ? 'them' : 'me') : last
}

function firstAttack(n: number, shots: ShotTags[]): number | null {
  for (let shot = 2; shot <= n; shot++) if (shots[shot - 1]?.stroke === 'Attack') return shot
  return null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function keys(value: object): string[] {
  return Object.keys(value).sort()
}

function sameKeys(value: object, want: string[]): boolean {
  const got = keys(value)
  return got.length === want.length && got.every((key, i) => key === want[i])
}

/** Parts from the data-model formula. Unknown openers are not in that formula. */
function formulaParts(n: number, shots: ShotTags[]): Part[] | 'unknown' {
  if (n <= 0) return []
  if (n === 1) return [{ part: 'opening', from: 1, to: 1 }]
  let opener: number | 'none' | 'unknown' = 'none'
  for (let shot = 2; shot <= n; shot++) {
    const stroke = shots[shot - 1]?.stroke
    if (stroke !== 'Attack' && stroke !== 'Control') {
      opener = 'unknown'
      break
    }
    if (stroke === 'Attack') {
      opener = shot
      break
    }
  }
  if (opener === 'unknown') return 'unknown'
  const parts: Part[] = []
  const push = (part: string, from: number, to: number) => {
    if (to >= from && from >= 1) parts.push({ part, from, to })
  }
  if (typeof opener === 'number') {
    push('opening', 1, opener - 1)
    if (n < opener + 5) {
      push('attack', opener, n)
      return parts
    }
    const attackTo = opener + 2
    const endFrom = n - 2
    push('attack', opener, attackTo)
    push('rally', attackTo + 1, endFrom - 1)
    push('end', endFrom, n)
    return parts
  }
  const endFrom = Math.max(2, n - 2)
  push('opening', 1, endFrom - 1)
  push('end', endFrom, n)
  return parts
}

function covers(parts: Part[], n: number): boolean {
  let next = 1
  for (const part of parts) {
    if (part.from !== next || part.to < part.from || part.to > n) return false
    next = part.to + 1
  }
  return next === n + 1
}

function sameParts(a: Part[], b: { part: string; from: number; to: number }[]): boolean {
  return a.length === b.length && a.every((part, i) => part.part === b[i].part && part.from === b[i].from && part.to === b[i].to)
}

function clock(m: MatchRecord, r: RallyData): number | null {
  const segs = segmentsOf(m.videos)
  const t = r.point || r.contacts.length === 0 ? r.start : r.contacts[0]
  return toGlobal(segs, r.videoId, t)
}

function statesOf(m: MatchRecord, s: SetData): State[] {
  const hits: State[] = []
  const noRallies = s.rallies.length === 0
  const noDraft = s.draft === null
  const noEntered = s.entered.me === '' && s.entered.them === ''
  const noResult = m.result.me === null || m.result.them === null
  const spare =
    noResult &&
    s.setId === m.sets.length &&
    s.mark === null &&
    !s.skipped &&
    noRallies &&
    noDraft &&
    !s.finished &&
    noEntered
  if (spare) hits.push('spare')
  if ((s.mark === null || s.skipped) && noRallies && noDraft && !s.finished && !spare) hits.push('not-on-video')
  if (!s.finished && (!noRallies || !noDraft)) hits.push('under-way')
  if (s.mark !== null && !s.skipped && !s.finished && noRallies && noDraft) hits.push('ready')
  if (s.finished && !noRallies) {
    const winners = winnersOf(s)
    const score = taggedOf(winners)
    if (setOverOnRule(winners)) hits.push('saved-won')
    else if (score && leaderOf(score) && !legalEnd(score)) hits.push('ended-early')
    else if (score && score.me === score.them) hits.push('incomplete')
  }
  return hits
}

function stateOf(m: MatchRecord, s: SetData): State | null {
  const hits = statesOf(m, s)
  return hits.length === 1 ? hits[0] : null
}

function counted(m: MatchRecord, s: SetData): Score | null {
  const state = stateOf(m, s)
  if (state === 'not-on-video' || state === 'incomplete') return enteredOf(s)
  if (state === 'saved-won' || state === 'ended-early') return taggedOf(winnersOf(s))
  return null
}

function settled(s: SetData): boolean {
  const winners = winnersOf(s)
  const atEnd = winIndex(winners)
  const atEndScore = atEnd < 0 ? null : count(winners.slice(0, atEnd + 1))
  const incomplete = s.finished && s.rallies.length > 0 && !early(s) && (atEndScore === null || !won(atEndScore))
  if (incomplete) return enteredOf(s) !== null
  if (s.finished || s.skipped) return true
  if (!s.mark) return enteredOf(s) !== null
  return false
}

function resultTotal(m: MatchRecord): number | null {
  const { me, them } = m.result
  if (me === null || them === null) return null
  return me + them > 0 ? me + them : null
}

function tagProgress(s: SetData): boolean {
  return s.rallies.length > 0 || s.draft !== null || s.finished
}

function maxSet(sets: SetData[], test: (s: SetData) => boolean): number {
  return sets.reduce((max, s) => (test(s) ? Math.max(max, s.setId) : max), 0)
}

function expectedSetCount(m: MatchRecord): number {
  const fromResult = resultTotal(m)
  const used = Math.max(
    maxSet(m.sets, (s) => tagProgress(s) || s.skipped || s.mark !== null),
    maxSet(m.sets, (s) => s.entered.me !== '' || s.entered.them !== ''),
  )
  const loose = m.sets.some((s) => s.setId <= used && !settled(s))
  const tagDone = m.tagDone && !loose && m.sets.some((s) => s.finished && !s.skipped)
  const lastTagged = maxSet(m.sets, tagProgress)
  return fromResult !== null ? Math.max(fromResult, lastTagged) : Math.max(1, tagDone ? used : used + 1)
}

function markStateOf(s: SetData): 'off' | 'ready' | 'tagging' | 'saved' {
  if (!s.mark) return 'off'
  if (s.finished) return 'saved'
  if (s.rallies.length > 0) return 'tagging'
  return 'ready'
}

function videoSets(m: MatchRecord, videoId: string): SetData[] {
  const segs = segmentsOf(m.videos)
  const seg = segs.find((item) => item.id === videoId)
  if (!seg) return []
  const out: SetData[] = []
  for (const s of m.sets) {
    if (!s.mark) continue
    const g0 = toGlobal(segs, s.mark.from.videoId, s.mark.from.t)
    const g1 = toGlobal(segs, s.mark.to.videoId, s.mark.to.t)
    if (g0 === null || g1 === null) continue
    const lo = Math.min(g0, g1)
    const hi = Math.max(g0, g1)
    const a = Math.max(seg.offset, lo)
    const b = Math.min(seg.offset + seg.duration, hi)
    if (b - a >= 0.05) out.push(s)
  }
  return out
}

function statusOf(m: MatchRecord, videoId: string): string {
  const video = m.videos.find((item) => item.id === videoId)
  if (video?.archived) return 'Archived'
  const sets = videoSets(m, videoId)
  if (sets.some((s) => markStateOf(s) === 'tagging')) return 'Tagging'
  if (sets.some((s) => markStateOf(s) === 'ready')) return 'Ready to tag'
  if (sets.length === 0) return 'No sets yet'
  return 'Done'
}

function freeGaps(m: MatchRecord, videoId: string, duration: number): { a: number; b: number }[] {
  const segs = segmentsOf(m.videos)
  const seg = segs.find((item) => item.id === videoId)
  if (!seg) return []
  const spans: { a: number; b: number }[] = []
  for (const s of m.sets) {
    if (!s.mark) continue
    const g0 = toGlobal(segs, s.mark.from.videoId, s.mark.from.t)
    const g1 = toGlobal(segs, s.mark.to.videoId, s.mark.to.t)
    if (g0 === null || g1 === null) continue
    const lo = Math.min(g0, g1)
    const hi = Math.max(g0, g1)
    const a = Math.max(seg.offset, lo) - seg.offset
    const b = Math.min(seg.offset + seg.duration, hi) - seg.offset
    if (b - a >= 0.05) spans.push({ a, b })
  }
  spans.sort((a, b) => a.a - b.a)
  const gaps: { a: number; b: number }[] = []
  let cursor = 0
  for (const span of spans) {
    if (span.a > cursor + 8) gaps.push({ a: cursor, b: span.a })
    cursor = Math.max(cursor, span.b)
  }
  if (duration > cursor + 8) gaps.push({ a: cursor, b: duration })
  return gaps
}

function scoreKey(value: unknown, path: string): string | null {
  if (!value || typeof value !== 'object') return null
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = scoreKey(value[i], `${path}[${i}]`)
      if (hit) return hit
    }
    return null
  }
  for (const key of Object.keys(value)) {
    if (key === 'score') return `${path}.${key}`
    const hit = scoreKey((value as Record<string, unknown>)[key], `${path}.${key}`)
    if (hit) return hit
  }
  return null
}

const RALLY_KEYS = ['contacts', 'end', 'ending', 'fa', 'id', 'idea', 'left', 'point', 'serveChecked', 'server', 'shots', 'start', 'videoId', 'winner']
const SET_KEYS = ['draft', 'entered', 'finished', 'firstServer', 'mark', 'rallies', 'setId', 'skipped']
const MATCH_KEYS = ['date', 'event', 'id', 'opponent', 'result', 'sets', 'tagDone', 'videos']

function shotRules(r: RallyData, say: (what: string) => string): string[] {
  const bad: string[] = []
  const n = r.contacts.length
  if (r.point) return bad
  const want = winnerRule(r.server, n, r.ending)
  if (r.idea?.check !== 'Check the point' && r.winner !== want) bad.push(say(`winner ${r.winner} should be ${want}`))
  if (n === 1) {
    if (r.shots.length !== 1 || !sameKeys(r.shots[0] ?? {}, [])) bad.push(say('one contact writes {}'))
  } else if (n >= 2) {
    const serve = r.shots[0]
    if (!serve || !sameKeys(serve, ['depth', 'wing'])) bad.push(say(`serve keys ${keys(serve ?? {}).join(',')}`))
    else if ((serve.depth !== 'Short' && serve.depth !== 'Long') || (serve.wing !== 'BH' && serve.wing !== 'FH')) {
      bad.push(say(`serve ${serve.depth} ${serve.wing}`))
    }
    for (let i = 1; i < n; i++) {
      const shot = r.shots[i]
      if (!shot || !sameKeys(shot, ['stroke', 'wing'])) bad.push(say(`shot ${i + 1} keys ${keys(shot ?? {}).join(',')}`))
      else if ((shot.wing !== 'BH' && shot.wing !== 'FH') || (shot.stroke !== 'Attack' && shot.stroke !== 'Control')) {
        bad.push(say(`shot ${i + 1} ${shot.wing} ${shot.stroke}`))
      }
    }
  }
  const attack = firstAttack(n, r.shots)
  const opener = bestOpener(n, r.shots, r.idea?.first)
  const fromApp = typeof opener === 'number' ? opener : null
  if (r.fa !== attack || r.fa !== fromApp || r.fa === 1) bad.push(say(`fa ${r.fa} attack ${attack} bestOpener ${String(opener)}`))
  if (r.serveChecked !== true) bad.push(say('serveChecked is not true'))
  if (!r.idea) bad.push(say('idea missing'))
  else {
    if (r.idea.flow !== 'bestfa') bad.push(say(`idea.flow ${r.idea.flow}`))
    if (n >= 2 && r.idea.serve !== r.shots[0]?.depth) bad.push(say(`idea.serve ${r.idea.serve} depth ${r.shots[0]?.depth}`))
    const result = n === 1 ? (r.ending === 'Winner' ? 'Ace' : 'Serve fault') : r.ending
    if (n >= 1 && r.idea.result !== result) bad.push(say(`idea.result ${r.idea.result} want ${result}`))
    if (r.idea.first !== undefined) bad.push(say('idea.first is set'))
    const order = bestParts(n, r.shots, r.idea.first).map((part) => part.part)
    const review = r.idea.review ?? []
    let last = -1
    for (const part of review) {
      const at = order.indexOf(part)
      if (at < 0 || at <= last) bad.push(say(`review ${review.join(',')} parts ${order.join(',')}`))
      last = at
    }
  }
  return bad
}

/** I-5 to I-10 on one saved rally. The Best + FA golden test calls this. */
export function bestFaViolations(rally: RallyData, label: string): string[] {
  return shotRules(rally, (what) => place(label, 0, rally.contacts.length, rally.id, what))
}

function eachRally(matches: MatchRecord[], fn: (m: MatchRecord, s: SetData, r: RallyData, n: number) => void) {
  for (const m of matches) {
    for (const s of m.sets) s.rallies.forEach((r, i) => fn(m, s, r, i + 1))
  }
}

const checkRally =
  (fn: (m: MatchRecord, s: SetData, r: RallyData, n: number, bad: string[]) => void) =>
  (ctx: InvariantCtx): string[] => {
    const bad: string[] = []
    eachRally(ctx.matches, (m, s, r, n) => fn(m, s, r, n, bad))
    return bad
  }

export const INVARIANTS: Invariant[] = [
  {
    id: 'I-1',
    text: 'shots.length equals contacts.length',
    kind: 'data',
    reads: ['shots', 'contacts'],
    check: checkRally((m, s, r, n, bad) => {
      if (r.shots.length !== r.contacts.length) bad.push(atRally(m, s, r, n, `${r.shots.length} shots, ${r.contacts.length} contacts`))
    }),
  },
  {
    id: 'I-2',
    text: 'contacts are strictly ascending, inside the video, and at least 0.05s apart',
    kind: 'data',
    reads: ['contacts', 'video.durationS'],
    check: checkRally((m, s, r, n, bad) => {
      const video = m.videos.find((item) => item.id === r.videoId)
      if (!video) return
      for (let i = 0; i < r.contacts.length; i++) {
        const t = r.contacts[i]
        if (t < -1e-6 || t > video.durationS + 1e-6) bad.push(atRally(m, s, r, n, `contact ${t} outside 0..${video.durationS}`))
        if (i > 0 && !(r.contacts[i] > r.contacts[i - 1])) bad.push(atRally(m, s, r, n, 'contacts are not strictly ascending'))
        if (i > 0 && r.contacts[i] - r.contacts[i - 1] < 0.05 - 1e-6) bad.push(atRally(m, s, r, n, 'contacts closer than 0.05s'))
      }
    }),
  },
  {
    id: 'I-3',
    text: 'start and end hold the contacts, and unedited pads are 2s before and 1s after',
    kind: 'data',
    reads: ['start', 'end', 'contacts'],
    check: checkRally((m, s, r, n, bad) => {
      if (r.start < -1e-6) bad.push(atRally(m, s, r, n, `start ${r.start} is below 0`))
      if (r.contacts.length === 0) return
      const first = r.contacts[0]
      const last = r.contacts[r.contacts.length - 1]
      if (r.start > first + 1e-6) bad.push(atRally(m, s, r, n, `start ${r.start} is after the first contact`))
      if (r.end < last - 1e-6) bad.push(atRally(m, s, r, n, `end ${r.end} is before the last contact`))
      const wantStart = round2(Math.max(0, first - 2))
      const wantEnd = round2(last + 1)
      if (round2(r.start) !== wantStart || round2(r.end) !== wantEnd) {
        bad.push(atRally(m, s, r, n, `pads ${r.start}..${r.end} want ${wantStart}..${wantEnd}`))
      }
    }),
  },
  {
    id: 'I-4',
    text: 'ending is Winner, Net, Long or Wide, and null exactly on a point',
    kind: 'data',
    reads: ['ending', 'point'],
    check: checkRally((m, s, r, n, bad) => {
      const point = r.point === true
      if (point !== (r.ending === null)) bad.push(atRally(m, s, r, n, `ending ${r.ending} point ${String(r.point)}`))
      if (r.ending !== null && !['Winner', 'Net', 'Long', 'Wide'].includes(r.ending)) {
        bad.push(atRally(m, s, r, n, `ending ${r.ending}`))
      }
    }),
  },
  {
    id: 'I-5',
    text: 'winner follows the server, the count and the ending, unless the point was kept',
    kind: 'data',
    reads: ['winner', 'server', 'ending', 'idea.check'],
    check: checkRally((m, s, r, n, bad) => {
      if (r.point) return
      for (const line of shotRules(r, (what) => atRally(m, s, r, n, what))) {
        if (line.includes('winner ')) bad.push(line)
      }
    }),
  },
  {
    id: 'I-6',
    text: 'shots follow the Best + FA key sets',
    kind: 'data',
    reads: ['shots'],
    check: checkRally((m, s, r, n, bad) => {
      if (r.point) return
      for (const line of shotRules(r, (what) => atRally(m, s, r, n, what))) {
        if (line.includes('keys') || line.includes('serve ') || line.includes('shot ') || line.includes('one contact')) bad.push(line)
      }
    }),
  },
  {
    id: 'I-7',
    text: 'fa is the first Attack from shot 2, else null, and never 1',
    kind: 'data',
    reads: ['fa', 'shots'],
    check: checkRally((m, s, r, n, bad) => {
      if (r.point) return
      for (const line of shotRules(r, (what) => atRally(m, s, r, n, what))) if (line.includes('fa ')) bad.push(line)
    }),
  },
  {
    id: 'I-8',
    text: 'serveChecked is true',
    kind: 'data',
    reads: ['serveChecked'],
    check: checkRally((m, s, r, n, bad) => {
      if (r.point) return
      for (const line of shotRules(r, (what) => atRally(m, s, r, n, what))) if (line.includes('serveChecked')) bad.push(line)
    }),
  },
  {
    id: 'I-9',
    text: 'idea is a Best + FA save, with no who-attacked-first answer',
    kind: 'data',
    reads: ['idea', 'shots', 'ending'],
    check: checkRally((m, s, r, n, bad) => {
      if (r.point) return
      for (const line of shotRules(r, (what) => atRally(m, s, r, n, what))) {
        if (line.includes('idea')) bad.push(line)
      }
    }),
  },
  {
    id: 'I-10',
    text: 'idea.review lists parts this rally has, in row order, once each',
    kind: 'data',
    reads: ['idea.review', 'bestParts'],
    check: checkRally((m, s, r, n, bad) => {
      if (r.point) return
      for (const line of shotRules(r, (what) => atRally(m, s, r, n, what))) if (line.includes('review ')) bad.push(line)
    }),
  },
  {
    id: 'I-11',
    text: 'a point added without video has the point shape, and its server is the one due',
    kind: 'data',
    reads: ['point', 'server', 'm-h9 set 2'],
    check: (ctx) => {
      const bad: string[] = []
      const h9 = ctx.matches.find((m) => m.id === 'm-h9')
      const set2 = h9?.sets.find((s) => s.setId === 2)
      const named = set2?.rallies.filter((r) => r.point) ?? []
      if (!h9 || !set2 || named.length !== 2) bad.push(place('m-h9', 2, 0, '-', `${named.length} point rallies, want 2`))
      eachRally(ctx.matches, (m, s, r, n) => {
        if (!r.point) return
        if (r.contacts.length !== 0 || r.start !== r.end || r.ending !== null || r.fa !== null || r.shots.length !== 0) {
          bad.push(atRally(m, s, r, n, 'point shape'))
        }
        let score = ZERO
        for (let i = 0; i < n - 1; i++) score = add(score, s.rallies[i].winner)
        const due = serverDue(s.firstServer, score)
        if (r.server !== due || r.server !== serverAt(s.firstServer, score)) bad.push(atRally(m, s, r, n, `server ${r.server} due ${due}`))
        if (r.winner !== 'me' && r.winner !== 'them') bad.push(atRally(m, s, r, n, 'winner is not a side'))
      })
      return bad
    },
  },
  {
    id: 'I-12',
    text: 'rallies are in video order by first contact, or by start for a point',
    kind: 'data',
    reads: ['segmentsOf', 'toGlobal', 'contacts', 'start'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        for (const s of m.sets) {
          let prev: number | null = null
          s.rallies.forEach((r, i) => {
            const t = clock(m, r)
            if (t === null) return
            if (prev !== null && t + 1e-6 < prev) bad.push(atRally(m, s, r, i + 1, `clock ${t} is before ${prev}`))
            prev = t
          })
        }
      }
      return bad
    },
  },
  {
    id: 'I-20',
    text: 'rally, set and match keep their key sets, and no score is stored',
    kind: 'data',
    reads: ['RallyData', 'SetData', 'MatchRecord'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        const extra = keys(m).filter((key) => !MATCH_KEYS.includes(key))
        if (extra.length) bad.push(place(m.id, 0, 0, '-', `match keys ${extra.join(',')}`))
        const scored = scoreKey(m, m.id)
        if (scored) bad.push(place(m.id, 0, 0, '-', `score field at ${scored}`))
        for (const s of m.sets) {
          const setExtra = keys(s).filter((key) => !SET_KEYS.includes(key))
          if (setExtra.length) bad.push(atSet(m, s, `set keys ${setExtra.join(',')}`))
          s.rallies.forEach((r, i) => {
            const rallyExtra = keys(r).filter((key) => !RALLY_KEYS.includes(key))
            if (rallyExtra.length) bad.push(atRally(m, s, r, i + 1, `rally keys ${rallyExtra.join(',')}`))
          })
        }
      }
      return bad
    },
  },
  {
    id: 'I-21',
    text: 'rally 1 is served by the set first server, and a 3-2 start writes points served by serverAt',
    kind: 'probe',
    reads: ['firstServer', 'startSet', 'serverAt'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        for (const s of m.sets) {
          const first = s.rallies[0]
          if (first && first.server !== s.firstServer) bad.push(atRally(m, s, first, 1, `server ${first.server} firstServer ${s.firstServer}`))
        }
      }
      const partial = ctx.matches.find((m) => m.id === 'm-partial')
      if (!partial) return [...bad, place('m-partial', 3, 0, '-', 'missing')]
      const rally: RallyData = {
        id: 'r-probe',
        videoId: partial.videos[0].id,
        server: 'them',
        contacts: [30],
        start: 28,
        end: 31,
        ending: 'Winner',
        fa: null,
        shots: [{}],
        winner: 'them',
      }
      const next = startSet(structuredClone(partial), 3, rally, { me: 3, them: 2 })
      const set = next.sets.find((s) => s.setId === 3)
      const points = set?.rallies.filter((r) => r.point) ?? []
      if (!set || points.length !== 5) bad.push(place('m-partial', 3, 0, '-', `${points.length} start points, want 5`))
      let score = ZERO
      points.forEach((p, i) => {
        const due = serverDue(set?.firstServer ?? 'me', score)
        if (p.server !== due || (set && p.server !== serverAt(set.firstServer, score))) {
          bad.push(place('m-partial', 3, i + 1, p.id, `start point server ${p.server} due ${due}`))
        }
        score = add(score, p.winner)
      })
      if (score.me !== 3 || score.them !== 2) bad.push(place('m-partial', 3, 0, '-', `start score ended ${score.me}-${score.them}`))
      return bad
    },
  },
  {
    id: 'I-22',
    text: 'each rally is served by serverAt of the score before it, and the seed has no serve break',
    kind: 'data',
    reads: ['server', 'winner', 'serveBands'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        for (const s of m.sets) {
          if (serveBands(s.rallies, s.firstServer).length !== 0) bad.push(atSet(m, s, 'serve break'))
          let score = ZERO
          s.rallies.forEach((r, i) => {
            const due = serverDue(s.firstServer, score)
            if (r.server !== due || r.server !== serverAt(s.firstServer, score)) {
              bad.push(atRally(m, s, r, i + 1, `server ${r.server} due ${due}`))
            }
            score = add(score, r.winner)
          })
        }
      }
      return bad
    },
  },
  {
    id: 'I-23',
    text: 'first servers alternate from you in set 1',
    kind: 'data',
    reads: ['firstServer', 'setId'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        for (const s of m.sets) {
          const want: Side = s.setId % 2 === 1 ? 'me' : 'them'
          if (s.firstServer !== want || firstServerForSet('me', s.setId) !== want) {
            bad.push(atSet(m, s, `firstServer ${s.firstServer} want ${want}`))
          }
        }
      }
      return bad
    },
  },
  {
    id: 'I-24',
    text: 'parts cover shots 1 to n once, in order, and match the formula',
    kind: 'data',
    reads: ['shots', 'bestParts'],
    check: checkRally((m, s, r, n, bad) => {
      if (r.point || r.contacts.length === 0) return
      const countShots = r.contacts.length
      const formula = formulaParts(countShots, r.shots)
      const app = bestParts(countShots, r.shots, r.idea?.first)
      if (formula === 'unknown') bad.push(atRally(m, s, r, n, 'first attack is unknown'))
      else if (!sameParts(formula, app) || !covers(formula, countShots)) {
        bad.push(atRally(m, s, r, n, `parts ${app.map((p) => `${p.part}:${p.from}-${p.to}`).join(',')}`))
      }
    }),
  },
  {
    id: 'set-states',
    text: 'exactly one set state applies',
    kind: 'data',
    reads: ['mark', 'finished', 'rallies', 'draft', 'entered', 'result'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        for (const s of m.sets) {
          const hits = statesOf(m, s)
          if (hits.length !== 1) bad.push(atSet(m, s, hits.length === 0 ? 'no state' : hits.join('+')))
        }
      }
      return bad
    },
  },
  {
    id: 'I-30',
    text: 'a finished set that is not early and not level was won on the rule',
    kind: 'data',
    reads: ['finished', 'winner', 'setOverOnRule'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        for (const s of m.sets) {
          if (!s.finished || s.rallies.length === 0) continue
          const score = taggedOf(winnersOf(s))
          const level = score !== null && score.me === score.them
          if (!early(s) && !level && !setOverOnRule(winnersOf(s))) bad.push(atSet(m, s, 'finished off the rule'))
        }
      }
      return bad
    },
  },
  {
    id: 'I-31',
    text: 'a finished set has no rally after the one that won it',
    kind: 'data',
    reads: ['winner', 'setEndIndex'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        for (const s of m.sets) {
          if (!s.finished) continue
          const winners = winnersOf(s)
          const end = setEndIndex(winners)
          if (end >= 0 && end !== winIndex(winners)) bad.push(atSet(m, s, 'setEndIndex disagrees with the walk'))
          if (end >= 0 && end < winners.length - 1) bad.push(atSet(m, s, `rally after the win at ${end + 1}`))
        }
      }
      return bad
    },
  },
  {
    id: 'I-32',
    text: 'an ended-early set line reads Set N · Saved · a - b · ended early',
    kind: 'data',
    reads: ['setLineLabel', 'finished', 'winner'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        for (const s of m.sets) {
          if (stateOf(m, s) !== 'ended-early') continue
          const score = taggedOf(winnersOf(s))
          const want = `Set ${s.setId} · Saved · ${score?.me} - ${score?.them} · ended early`
          if (setLineLabel(s) !== want) bad.push(atSet(m, s, `label ${setLineLabel(s)}`))
        }
      }
      return bad
    },
  },
  {
    id: 'I-33',
    text: 'finishing a set leaves the Details score unchanged',
    kind: 'probe',
    reads: ['entered', 'finishSet'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        for (const s of m.sets) {
          const next = finishSet(structuredClone(m), s.setId).sets.find((item) => item.setId === s.setId)
          if (!next || next.entered.me !== s.entered.me || next.entered.them !== s.entered.them) {
            bad.push(atSet(m, s, 'entered changed'))
          }
        }
      }
      return bad
    },
  },
  {
    id: 'I-34',
    text: 'setScoresDiffer is a finished set whose Details score and tagged score disagree',
    kind: 'data',
    reads: ['entered', 'finished', 'winner', 'setScoresDiffer'],
    check: (ctx) => {
      const bad: string[] = []
      let sawComplete = false
      for (const m of ctx.matches) {
        for (const s of m.sets) {
          const entered = enteredOf(s)
          const tagged = taggedOf(winnersOf(s))
          const differ = Boolean(s.finished && !s.skipped && entered && tagged && (entered.me !== tagged.me || entered.them !== tagged.them))
          if (setScoresDiffer(s) !== differ) bad.push(atSet(m, s, `differs ${setScoresDiffer(s)} formula ${differ}`))
          if (m.id === 'm-complete' && s.setId === 2) {
            sawComplete = true
            if (!differ) bad.push(atSet(m, s, 'the known differs case is false'))
          }
        }
      }
      if (!sawComplete) bad.push(place('m-complete', 2, 0, '-', 'missing'))
      return bad
    },
  },
  {
    id: 'I-40',
    text: 'the set list is the result count or the used sets plus a spare, with no gaps',
    kind: 'data',
    reads: ['result', 'sets', 'setId'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        const count = expectedSetCount(m)
        if (m.sets.length !== count) bad.push(place(m.id, 0, 0, '-', `${m.sets.length} sets, formula ${count}`))
        m.sets.forEach((s, i) => {
          if (s.setId !== i + 1) bad.push(atSet(m, s, 'set numbers have a gap'))
        })
        const last = maxSet(m.sets, tagProgress)
        if (last > m.sets.length) bad.push(place(m.id, 0, 0, '-', `tagged set ${last} was dropped`))
      }
      return bad
    },
  },
  {
    id: 'I-41',
    text: 'sets won count a leader from the score that state uses, and a set still to tag counts for nobody',
    kind: 'data',
    reads: ['matchSetsWon', 'winner', 'entered'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        const won = { me: 0, them: 0 }
        for (const s of m.sets) {
          const side = leaderOf(counted(m, s))
          if (side) won[side] += 1
        }
        const got = matchSetsWon(m)
        if (got.me !== won.me || got.them !== won.them) bad.push(place(m.id, 0, 0, '-', `sets ${got.me}-${got.them} formula ${won.me}-${won.them}`))
      }
      return bad
    },
  },
  {
    id: 'I-42',
    text: 'taggedResult is null until every listed set that is not a spare has a leader',
    kind: 'data',
    reads: ['taggedResult', 'entered', 'winner'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        const won = { me: 0, them: 0 }
        let open = false
        for (const s of m.sets) {
          if (stateOf(m, s) === 'spare') continue
          const side = leaderOf(counted(m, s))
          if (!side) open = true
          else won[side] += 1
        }
        const want = open || won.me + won.them === 0 ? null : won
        const got = taggedResult(m)
        const same = want === null ? got === null : got !== null && got.me === want.me && got.them === want.them
        if (!same) bad.push(place(m.id, 0, 0, '-', `taggedResult ${got ? `${got.me}-${got.them}` : 'null'}`))
      }
      return bad
    },
  },
  {
    id: 'I-43',
    text: 'complete means no set under way, one set finished, and every set the result lists is settled',
    kind: 'data',
    reads: ['derivePhase', 'finished', 'result', 'tagDone'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        const underWay = m.sets.some((s) => !s.finished && !s.skipped && (s.rallies.length > 0 || s.draft !== null))
        const someFinished = m.sets.some((s) => s.finished)
        const count = resultTotal(m)
        const upTo = count === null ? m.tagDone : m.sets.filter((s) => s.setId <= count).every(settled)
        const tagged = !underWay && someFinished && upTo
        const progress = m.sets.some((s) => !s.skipped && tagProgress(s))
        if (isMatchTagged(m) !== tagged) bad.push(place(m.id, 0, 0, '-', `tagged ${isMatchTagged(m)} formula ${tagged}`))
        if ((derivePhase(m) === 'complete') !== (tagged && progress)) {
          bad.push(place(m.id, 0, 0, '-', `phase ${derivePhase(m)}`))
        }
      }
      return bad
    },
  },
  {
    id: 'I-44',
    text: 'an entered result is a real best of 3, 5 or 7, and a complete match agrees with taggedResult',
    kind: 'data',
    reads: ['result', 'taggedResult', 'isRealResult'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        const { me, them } = m.result
        if (me !== null && them !== null) {
          const real = me !== them && [2, 3, 4].includes(Math.max(me, them))
          if (!real || isRealResult({ me, them }) !== real) bad.push(place(m.id, 0, 0, '-', `result ${me}-${them}`))
        }
        if (derivePhase(m) === 'complete') {
          const tagged = taggedResult(m)
          if (!tagged || me === null || them === null || tagged.me !== me || tagged.them !== them) {
            bad.push(place(m.id, 0, 0, '-', `complete result ${me}-${them} tagged ${tagged ? `${tagged.me}-${tagged.them}` : 'null'}`))
          }
        }
        const tagged = taggedResult(m)
        const differ = Boolean(
          isMatchTagged(m) && me !== null && them !== null && tagged && (tagged.me !== me || tagged.them !== them),
        )
        if (resultDiffers(m) !== differ) bad.push(place(m.id, 0, 0, '-', `differs flag ${resultDiffers(m)}`))
      }
      return bad
    },
  },
  {
    id: 'I-50',
    text: 'a mark runs forward and sits on one video or the next one',
    kind: 'data',
    reads: ['mark', 'segmentsOf', 'toGlobal'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        const segs = segmentsOf(m.videos)
        for (const s of m.sets) {
          if (!s.mark) continue
          const a = toGlobal(segs, s.mark.from.videoId, s.mark.from.t)
          const b = toGlobal(segs, s.mark.to.videoId, s.mark.to.t)
          if (a === null || b === null) {
            bad.push(atSet(m, s, 'mark names a missing video'))
            continue
          }
          if (a > b + 1e-6) bad.push(atSet(m, s, 'mark runs backward'))
          const from = m.videos.findIndex((v) => v.id === s.mark?.from.videoId)
          const to = m.videos.findIndex((v) => v.id === s.mark?.to.videoId)
          if (from < 0 || to < from || to > from + 1) bad.push(atSet(m, s, 'mark spans more than the next video'))
        }
      }
      return bad
    },
  },
  {
    id: 'I-51',
    text: 'marks do not overlap by more than 0.05s, and set numbers rise with the clock',
    kind: 'data',
    reads: ['mark', 'setId'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        const segs = segmentsOf(m.videos)
        const placed: { id: number; start: number; end: number }[] = []
        for (const s of m.sets) {
          if (!s.mark) continue
          const a = toGlobal(segs, s.mark.from.videoId, s.mark.from.t)
          const b = toGlobal(segs, s.mark.to.videoId, s.mark.to.t)
          if (a === null || b === null) continue
          placed.push({ id: s.setId, start: Math.min(a, b), end: Math.max(a, b) })
        }
        for (let i = 0; i < placed.length; i++) {
          for (let j = i + 1; j < placed.length; j++) {
            const overlap = Math.min(placed[i].end, placed[j].end) - Math.max(placed[i].start, placed[j].start)
            if (overlap > 0.05 + 1e-6) bad.push(place(m.id, placed[i].id, 0, '-', `overlaps set ${placed[j].id}`))
          }
        }
        for (let i = 0; i < placed.length; i++) {
          for (let j = 0; j < placed.length; j++) {
            if (placed[i].start + 0.05 < placed[j].start && placed[i].id > placed[j].id) {
              bad.push(place(m.id, placed[j].id, 0, '-', `set ${placed[j].id} starts after set ${placed[i].id}`))
            }
          }
        }
      }
      return bad
    },
  },
  {
    id: 'I-52',
    text: 'every saved rally lies inside its set mark',
    kind: 'data',
    reads: ['rallyOutside', 'mark', 'rallies'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        for (const s of m.sets) {
          if (!s.mark) continue
          const outside = rallyOutside(m.videos, s.rallies, s.mark)
          if (outside) bad.push(atSet(m, s, `rally ${outside.n} is ${outside.side} the mark`))
        }
      }
      return bad
    },
  },
  {
    id: 'I-52',
    text: 'a re-added video takes the missing id and position',
    kind: 'probe',
    reads: ['matchStore.removeVideo', 'matchStore.addVideo', 'missingVideoIds'],
    check: (ctx) => {
      const bad: string[] = []
      let probes = 0
      for (const m of ctx.matches) {
        m.videos.forEach((video, index) => {
          const used = m.sets.some((s) => s.rallies.some((r) => r.videoId === video.id) || s.draft?.videoId === video.id)
          if (!used) return
          const file = { fileName: 'same-footage.mp4', sizeMb: 1, durationS: video.durationS, src: 'blob:same-footage' }
          for (const pick of [undefined, file]) {
            probes += 1
            const how = pick ? 'file' : 'demo'
            const store = createMatchStore(ctx.matches, 'filled')
            store.getState().removeVideo(m.id, video.id)
            const gone = selectMatch(store.getState(), m.id)
            const missing = gone ? missingVideoIds(gone) : []
            if (missing.length !== 1 || missing[0] !== video.id) {
              bad.push(place(m.id, 0, 0, '-', `removing ${video.id} leaves missing [${missing.join(', ')}]`))
              continue
            }
            store.getState().addVideo(m.id, pick)
            const back = selectMatch(store.getState(), m.id)
            if (!back) {
              bad.push(place(m.id, 0, 0, '-', `match gone after re-adding ${video.id} (${how})`))
              continue
            }
            const at = back.videos.findIndex((v) => v.id === video.id)
            if (at !== index) bad.push(place(m.id, 0, 0, '-', `${video.id} (${how}) came back at ${at}, was at ${index}`))
            if (back.videos.length !== m.videos.length) bad.push(place(m.id, 0, 0, '-', `${back.videos.length} videos after re-adding ${video.id} (${how})`))
            const still = missingVideoIds(back)
            if (still.length > 0) bad.push(place(m.id, 0, 0, '-', `still missing [${still.join(', ')}] after re-adding ${video.id} (${how})`))
            const added = back.videos[at]
            if (pick && (added?.kind !== 'file' || added.fileName !== pick.fileName)) {
              bad.push(place(m.id, 0, 0, '-', `${video.id} re-added from a file is ${added?.kind} ${added?.fileName}`))
            }
            if (!pick && video.kind === 'demo' && JSON.stringify(added) !== JSON.stringify({ ...video, archived: false })) {
              bad.push(place(m.id, 0, 0, '-', `${video.id} demo video did not come back as it was`))
            }
          }
        })
      }
      if (probes !== 26) bad.push(place('seed', 0, 0, '-', `${probes} probes, expected 26`))
      return bad
    },
  },
  {
    id: 'I-53',
    text: 'a new mark that fits is at least 60s and starts in free time',
    kind: 'probe',
    reads: ['newMarkAt', 'videos', 'mark'],
    check: (ctx) => {
      const bad: string[] = []
      let probes = 0
      let oks = 0
      for (const m of ctx.matches) {
        for (const video of m.videos) {
          for (let t = 0; t < video.durationS; t += 30) {
            probes += 1
            const result = newMarkAt(m, video.id, t)
            if (!result.ok) continue
            oks += 1
            const span = result.mark.to.t - result.mark.from.t
            if (span < 60 - 0.05) bad.push(place(m.id, result.setId, 0, '-', `new mark is ${span}s at ${t}`))
            const gaps = freeGaps(m, video.id, video.durationS)
            const start = result.mark.from.t
            if (!gaps.some((gap) => start >= gap.a - 1e-6 && start <= gap.b + 1e-6)) {
              bad.push(place(m.id, result.setId, 0, '-', `new mark at ${start} is not in free time`))
            }
          }
        }
      }
      if (probes !== 311 || oks !== 29) bad.push(place('seed', 0, 0, '-', `${probes} probes, ${oks} ok, expected 311 probes and 29 ok`))
      return bad
    },
  },
  {
    id: 'I-54',
    text: 'won sets are complete, under-way sets are not, delete tags sets complete, and finishing keeps it',
    kind: 'probe',
    reads: ['mark.complete', 'deleteTags', 'finishSet'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        for (const s of m.sets) {
          const state = stateOf(m, s)
          if (state === 'saved-won' && s.mark?.complete !== true) bad.push(atSet(m, s, 'won set is not complete'))
          if (state === 'under-way' && s.mark && s.mark.complete !== false) bad.push(atSet(m, s, 'under-way set is complete'))
          if (s.rallies.length > 0 && s.mark) {
            const cleared = deleteTags(structuredClone(m), s.setId).sets.find((item) => item.setId === s.setId)
            if (cleared?.mark?.complete !== true) bad.push(atSet(m, s, 'delete tags did not set complete'))
          }
          const kept = finishSet(structuredClone(m), s.setId).sets.find((item) => item.setId === s.setId)
          if (kept?.mark?.complete !== s.mark?.complete) bad.push(atSet(m, s, 'finish changed complete'))
        }
      }
      return bad
    },
  },
  {
    id: 'I-55',
    text: 'a video a set spans is locked, and moving it breaks',
    kind: 'probe',
    reads: ['videoLocked', 'videoMoveBreaks', 'mark'],
    check: (ctx) => {
      const bad: string[] = []
      const locked: string[] = []
      for (const m of ctx.matches) {
        for (const video of m.videos) {
          const spanned = m.sets.some(
            (s) =>
              s.mark !== null &&
              s.mark.from.videoId !== s.mark.to.videoId &&
              (s.mark.from.videoId === video.id || s.mark.to.videoId === video.id),
          )
          if (videoLocked(m, video.id) !== spanned) bad.push(place(m.id, 0, 0, '-', `${video.id} locked ${videoLocked(m, video.id)}`))
          if (!videoLocked(m, video.id)) continue
          locked.push(`${m.id} ${video.id}`)
          if (!videoMoveBreaks(m, video.id, -1) || !videoMoveBreaks(m, video.id, 1)) {
            bad.push(place(m.id, 0, 0, '-', `${video.id} can move`))
          }
        }
      }
      const want = ['m-partial v-club-1', 'm-partial v-club-2', 'm-h7 v-h7-a', 'm-h7 v-h7-b']
      if (locked.join(',') !== want.join(',')) bad.push(place('seed', 0, 0, '-', `locked ${locked.join(', ')}`))
      return bad
    },
  },
  {
    id: 'I-56',
    text: 'mark state follows the table, and video status is the first line that fits',
    kind: 'data',
    reads: ['markState', 'videoStatus', 'mark', 'finished', 'rallies', 'archived'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        for (const s of m.sets) {
          if (markState(s) !== markStateOf(s)) bad.push(atSet(m, s, `mark state ${markState(s)}`))
        }
        for (const video of m.videos) {
          if (videoStatus(m, video.id) !== statusOf(m, video.id)) {
            bad.push(place(m.id, 0, 0, '-', `${video.id} status ${videoStatus(m, video.id)} formula ${statusOf(m, video.id)}`))
          }
        }
      }
      return bad
    },
  },
  {
    id: 'I-57',
    text: 'every set with rallies has a mark, and migrating the mark changes nothing',
    kind: 'data',
    reads: ['mark', 'rallies', 'migrateSetMark'],
    check: (ctx) => {
      const bad: string[] = []
      for (const m of ctx.matches) {
        for (const s of m.sets) {
          if (s.rallies.length > 0 && !s.mark) bad.push(atSet(m, s, 'rallies and no mark'))
          if (migrateSetMark(m.videos, s) !== s) bad.push(atSet(m, s, 'migrateSetMark changed the set'))
        }
      }
      return bad
    },
  },
]
