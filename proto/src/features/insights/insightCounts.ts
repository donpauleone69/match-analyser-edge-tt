/**
 * Match Insights counts. Pure: no React, no IO.
 * Named insightCounts so it can live next to MatchInsights.tsx.
 * One function of (rallies, player) builds each card for both sides.
 */
import { derivePhase } from '@/data/demoStore'
import { bestParts, partWindow } from '@/features/tagging/bestFlow'
import { hitterOf, isAttackStroke, isError, rallyEnd, rallyStart } from '@/features/tagging/rally'
import { leader, scoreAtSetEnd } from '@/features/tagging/score'
import type { MatchRecord, Points, SetData } from '@/types/match'
import type { BestPart, Draft, Ending, RallyData, ShotTags, Side } from '@/types/rally'

export type Phase = 'serve' | 'receive' | 'rally'
export type Grade = 'Excellent' | 'Good' | 'Pass' | 'Below'

export type Cell = { text: string; of: string | null }

export type InsightRow = {
  label: string
  weak: boolean
  youWon: number
  youN: number
  themWon: number
  themN: number
  single?: { main: string; detail: string | null }
  you?: Cell | null
  them?: Cell | null
  grade?: Grade | null
}

export type PlayItem = {
  id: string
  rallyId: string
  videoId: string
  a: number
  b: number
  setId: number
  sets: Points
  points: Points
  server: Side
  /** Extra words on the bar, such as Net or the marked part. */
  note: string
  matchId: string
  /** "vs Sam", added on a playlist that spans matches. */
  versus: string
}

export type InsightCardModel = {
  id: string
  title: string
  value: string | null
  sub: string | null
  compare: string | null
  columns: string[] | null
  rows: InsightRow[]
  empty: string | null
  playlist: { name: string; items: PlayItem[]; caption: 'name' | 'note' } | null
  about: string[]
  counts: { youWon: number; youN: number; themWon: number; themN: number; points: number }
}

/** Match rules count one match. Global rules pool matches and say how far the rate can be trusted. */
export type InsightRules = {
  scope: 'match' | 'global'
  label: string
  they: string
  their: string
  who: string
  /** Usual on the global page needs a filter. A match page always passes true. */
  subset: boolean
}

export function insightRules(scope: 'match' | 'global', opponent: string, subset: boolean): InsightRules {
  const raw = opponent.trim()
  return {
    scope,
    label: raw || 'Them',
    they: raw || 'They',
    their: raw ? `${raw}'s` : 'their',
    who: raw || 'they',
    subset,
  }
}

const valueMin = (rules: InsightRules) => (rules.scope === 'global' ? 30 : 10)
const rowMin = (rules: InsightRules) => (rules.scope === 'global' ? 30 : 5)
const gradeMin = (rules: InsightRules) => (rules.scope === 'global' ? 100 : 20)
const weakMin = (rules: InsightRules) => (rules.scope === 'global' ? 30 : 5)

export type MatchInsightsModel = {
  /** No saved point with an End answer. */
  empty: boolean
  coverage: string | null
  /** Set when no saved point can play. */
  videoLine: string | null
  cards: InsightCardModel[]
  marked: InsightCardModel | null
}

const PHASE_MARKS: Record<Phase, { excellent: number; good: number; pass: number }> = {
  serve: { excellent: 68, good: 62, pass: 56 },
  receive: { excellent: 55, good: 48, pass: 42 },
  rally: { excellent: 51, good: 44, pass: 37 },
}

const PHASE_LABEL: Record<Phase, string> = {
  serve: 'Serve to 5th',
  receive: 'Receive to 4th',
  rally: 'Rally',
}

/** Back of the card. The same words are in match-insights-cards.md. */
export const CARD_ABOUT: Record<string, string[]> = {
  phases: [
    'Points you won, split the way China\'s coaches split a match.',
    'The player who misses is charged on that ball. The player who wins is credited on the ball before.',
    'Serve to 5th is your 1st, 3rd and 5th when you served. Receive to 4th is your receive, 2nd and 4th when they served. Rally is the rest.',
    'The grade is the China team marks from Zhang 2004. It needs 20 of your points in that row. Only you are graded.',
  ],
  serve: [
    'Every point you served, including aces and faults.',
    'The rows are the first three shots: their attack on the receive, your attack on the 3rd ball, or neither.',
    'Elite 51% is elite men on serve, from Djokic 2020. Lets are not counted.',
  ],
  receive: [
    'Every point they served.',
    'The rows show whether you attacked the receive, they attacked the 3rd ball, or neither.',
    'Elite 49% is the same study, Djokic 2020, from the receiver\'s side.',
  ],
  attack: [
    'Points where they made the first attack, and how you answered: a counter, a block, or no reply.',
    'Their number is how often they win when you attack first.',
    'Elite 48% is the defender\'s rate, from Fuchs and Lames 2021.',
    'A blocked fast serve counts as Control here, and as a first attack in that study. That case is rare.',
  ],
  end: [
    'Your errors after the serve.',
    'A free ball is one where the shot before was Control. Under attack means the shot before was Attack. On the receive is a missed return of serve.',
    'There is no elite mark for this.',
  ],
  marked: [
    'Parts you starred while tagging: Opening, Attack, Rally and End.',
    'Each one plays that part of the rally. There is no benchmark.',
  ],
}

type Placed = {
  rally: RallyData
  setId: number
  sets: Points
  points: Points
  matchId: string
  versus: string
}

/**
 * The phase a player is charged or credited on.
 * An error charges the miss at shot n. A winner credits the winner at n and
 * charges the other player at n + 1. Stroke 0 is the receiver of a serve fault.
 */
export function phaseOf(server: Side, n: number, ending: Ending | null, player: Side): Phase | null {
  if (!ending || n < 1) return null
  const k = isError(ending) ? n : n + 1
  const stroke = hitterOf(server, k) === player ? k : k - 1
  const youServed = server === player
  if (youServed) return stroke >= 7 ? 'rally' : 'serve'
  return stroke >= 6 ? 'rally' : 'receive'
}

function shotAttack(shot: ShotTags | undefined): boolean {
  if (!shot?.stroke) return false
  return shot.stroke === 'Attack' || isAttackStroke(shot.stroke)
}

function asDraft(r: RallyData): Draft {
  return {
    videoId: r.videoId,
    server: r.server,
    contacts: r.contacts,
    closed: true,
    start: r.start,
    end: r.end,
    ending: r.ending,
    fa: r.fa,
    noAttack: r.fa === null,
    shots: r.shots,
  }
}

function wholeWindow(r: RallyData): { a: number; b: number } {
  const d = asDraft(r)
  return { a: rallyStart(d), b: rallyEnd(d) }
}

function endWindow(r: RallyData): { a: number; b: number } {
  const d = asDraft(r)
  const span = bestParts(r.contacts.length, r.shots).find((s) => s.part === 'end')
  return span ? partWindow(d, span) : wholeWindow(r)
}

function partAt(r: RallyData, part: BestPart): { a: number; b: number } | null {
  const d = asDraft(r)
  const span = bestParts(r.contacts.length, r.shots).find((s) => s.part === part)
  return span ? partWindow(d, span) : null
}

function countedRally(set: SetData, r: RallyData): boolean {
  return !set.skipped && !r.point && r.contacts.length >= 1 && r.ending !== null
}

function rateText(won: number, n: number, min: number): string {
  if (n < min) return `${won} of ${n}`
  return `${Math.round((won / n) * 100)}%`
}

function rateCell(won: number, n: number, min: number): Cell {
  if (n <= 0) return { text: '-', of: null }
  if (n < min) return { text: `${won} of ${n}`, of: null }
  return { text: `${Math.round((won / n) * 100)}%`, of: `of ${n}` }
}

export function gradeOf(phase: Phase, won: number, n: number, min = 20): Grade | null {
  if (n < min) return null
  const mark = PHASE_MARKS[phase]
  const pct = Math.round((won / n) * 100)
  if (pct >= mark.excellent) return 'Excellent'
  if (pct >= mark.good) return 'Good'
  if (pct >= mark.pass) return 'Pass'
  return 'Below'
}

/** Lowest rate at least 10 points under the card. Global rows also clear their own margin. */
function pickWeak(rows: { won: number; n: number }[], cardWon: number, cardN: number, rules: InsightRules): number | null {
  if (cardN <= 0) return null
  const base = cardWon / cardN
  let best: { i: number; rate: number; n: number } | null = null
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row.n < weakMin(rules)) continue
    const rate = row.won / row.n
    const points = (base - rate) * 100
    if (points < 10 - 1e-6) continue
    if (rules.scope === 'global' && points <= 100 / Math.sqrt(row.n)) continue
    if (!best || rate < best.rate - 1e-9 || (Math.abs(rate - best.rate) < 1e-9 && row.n > best.n)) {
      best = { i, rate, n: row.n }
    }
  }
  return best ? best.i : null
}

function coverageOf(sets: SetData[]): string | null {
  const bits: { kind: 'set' | 'part'; id: number }[] = []
  for (const set of [...sets].sort((a, b) => a.setId - b.setId)) {
    if (set.skipped) continue
    const has = set.rallies.some((r) => !r.point && r.contacts.length >= 1)
    if (!has) continue
    bits.push({ kind: set.finished ? 'set' : 'part', id: set.setId })
  }
  if (bits.length === 0) return null
  const chunks: string[] = []
  let i = 0
  while (i < bits.length) {
    if (bits[i].kind === 'part') {
      chunks.push(`part of set ${bits[i].id}`)
      i += 1
      continue
    }
    let j = i
    while (j + 1 < bits.length && bits[j + 1].kind === 'set' && bits[j + 1].id === bits[j].id + 1) j += 1
    chunks.push(j === i ? `set ${bits[i].id}` : `sets ${bits[i].id} to ${bits[j].id}`)
    i = j + 1
  }
  const line = chunks.join(', ')
  return line.charAt(0).toUpperCase() + line.slice(1)
}

function place(match: MatchRecord): Placed[] {
  const out: Placed[] = []
  const versus = `vs ${match.opponent.trim() || 'Them'}`
  let setsWon: Points = { me: 0, them: 0 }
  for (const set of [...match.sets].sort((a, b) => a.setId - b.setId)) {
    let points: Points = { me: 0, them: 0 }
    for (const rally of set.rallies) {
      out.push({ rally, setId: set.setId, sets: { ...setsWon }, points: { ...points }, matchId: match.id, versus })
      points = { me: points.me + (rally.winner === 'me' ? 1 : 0), them: points.them + (rally.winner === 'them' ? 1 : 0) }
    }
    if (set.finished && !set.skipped) {
      const at = scoreAtSetEnd(set.rallies.map((r) => r.winner))
      const side = at ? leader(at) : null
      if (side) setsWon = { ...setsWon, [side]: setsWon[side] + 1 }
    }
  }
  return out
}

function newestFirst(matches: MatchRecord[]): MatchRecord[] {
  return [...matches].sort((a, b) => {
    if (!a.date !== !b.date) return a.date ? 1 : -1
    return b.date.localeCompare(a.date)
  })
}

type Bucket<K extends string> = { key: K; rows: Placed[] }

function group<K extends string>(rows: Placed[], keyOf: (r: RallyData) => K, keys: K[]): Bucket<K>[] {
  const map = new Map<K, Placed[]>(keys.map((key) => [key, []]))
  for (const row of rows) map.get(keyOf(row.rally))!.push(row)
  return keys.map((key) => ({ key, rows: map.get(key)! }))
}

function wonOf(rows: Placed[], player: Side): { won: number; n: number } {
  const n = rows.length
  const won = rows.filter((row) => row.rally.winner === player).length
  return { won, n }
}

function itemsFrom(
  rows: Placed[],
  videos: Set<string>,
  idPrefix: string,
  windowFor: (r: RallyData) => { a: number; b: number },
  noteFor: (r: RallyData) => string,
  lossesOnly: boolean,
): PlayItem[] {
  const items: PlayItem[] = []
  for (const row of rows) {
    const rally = row.rally
    if (lossesOnly && rally.winner === 'me') continue
    if (!videos.has(rally.videoId)) continue
    const w = windowFor(rally)
    items.push({
      id: `${idPrefix}-${rally.id}-${items.length}`,
      rallyId: rally.id,
      videoId: rally.videoId,
      a: w.a,
      b: w.b,
      setId: row.setId,
      sets: row.sets,
      points: row.points,
      server: rally.server,
      note: noteFor(rally),
      matchId: row.matchId,
      versus: row.versus,
    })
  }
  return items
}

function playlistOf(
  name: string,
  rows: Placed[],
  videos: Set<string>,
  idPrefix: string,
  windowFor: (r: RallyData) => { a: number; b: number },
  noteFor: (r: RallyData) => string,
  caption: 'name' | 'note',
  lossesOnly: boolean,
): InsightCardModel['playlist'] {
  const items = itemsFrom(rows, videos, idPrefix, windowFor, noteFor, lossesOnly)
  if (items.length === 0) return null
  return { name, items, caption }
}

function aboutFor(id: string, rules: InsightRules): string[] {
  const lines = [...CARD_ABOUT[id]]
  if (rules.scope === 'global') {
    lines.push('Across the matches in the filter. Each point counts once.')
    if (id === 'phases') lines.push('A grade here needs 100 of your points in the row.')
    if (id === 'end') lines.push('Per 100 points, so long and short matches compare.')
  }
  if (id === 'end') {
    lines.push('Usual is your rate in your other tagged matches. It shows when today differs by 3 errors per 100 points or more.')
  } else if (id !== 'marked') {
    lines.push('Usual is your rate in your other tagged matches. It shows when today differs by 10 points or more.')
  }
  return lines
}

function emptyCard(id: string, title: string, empty: string, rules: InsightRules): InsightCardModel {
  return {
    id,
    title,
    value: null,
    sub: null,
    compare: null,
    columns: null,
    rows: [],
    empty,
    playlist: null,
    about: aboutFor(id, rules),
    counts: { youWon: 0, youN: 0, themWon: 0, themN: 0, points: 0 },
  }
}

function tierWord(n: number): string | null {
  if (n >= 270) return 'Solid'
  if (n >= 100) return 'Fair'
  if (n >= 30) return 'Early'
  return null
}

function withTier(sub: string, n: number, rules: InsightRules): string {
  if (rules.scope !== 'global') return sub
  const tier = tierWord(n)
  return tier ? `${sub} · ${tier}` : sub
}

function per100(count: number, points: number): string {
  return ((count / points) * 100).toFixed(1)
}

type Rate = { won: number; n: number }

function usualRate(rules: InsightRules, yours: Rate, usual: Rate | null): string | null {
  if (!usual || usual.n < 100 || yours.n <= 0) return null
  if (rules.scope === 'global' && !rules.subset) return null
  if (yours.n < valueMin(rules)) return null
  const gap = Math.abs(Math.round((yours.won / yours.n) * 100) - Math.round((usual.won / usual.n) * 100))
  if (gap < 10) return null
  return `Usual ${Math.round((usual.won / usual.n) * 100)}%`
}

function usualEnd(rules: InsightRules, errors: number, points: number, usualErrors: number, usualPoints: number): string | null {
  if (rules.scope === 'global' && !rules.subset) return null
  if (usualPoints < 100 || points < (rules.scope === 'global' ? 30 : 1)) return null
  const gap = Math.abs(errors / points - usualErrors / usualPoints) * 100
  if (gap < 3 - 1e-9) return null
  if (rules.scope === 'global' && points >= 100) return `Usual ${per100(usualErrors, usualPoints)}`
  return `Usual ${Math.round((usualErrors / usualPoints) * points)}`
}

function eliteBit(rules: InsightRules, n: number, elite: string): string | null {
  if (n <= 0) return null
  if (rules.scope === 'global' && n < valueMin(rules)) return null
  return `Elite ${elite}`
}

function joinBits(bits: (string | null)[]): string | null {
  const kept = bits.filter((bit): bit is string => Boolean(bit))
  return kept.length ? kept.join(' · ') : null
}

function serveBucket(r: RallyData): 'ace' | 'opp' | 'third' | 'none' {
  if (r.contacts.length <= 1) return 'ace'
  if (shotAttack(r.shots[1])) return 'opp'
  if (r.contacts.length >= 3 && shotAttack(r.shots[2])) return 'third'
  return 'none'
}

function replyBucket(r: RallyData): 'counter' | 'block' | 'none' {
  const fa = r.fa
  if (fa === null || r.contacts.length === fa) return 'none'
  return shotAttack(r.shots[fa]) ? 'counter' : 'block'
}

function endBucket(r: RallyData, player: Side): 'fh' | 'bh' | 'under' | 'receive' | null {
  const n = r.contacts.length
  if (n < 2 || !r.ending || !isError(r.ending)) return null
  if (hitterOf(r.server, n) !== player) return null
  if (n === 2) return 'receive'
  if (shotAttack(r.shots[n - 2])) return 'under'
  return r.shots[n - 1]?.wing === 'BH' ? 'bh' : 'fh'
}

function missWord(r: RallyData): string {
  if (r.ending === 'Net' || r.ending === 'Long' || r.ending === 'Wide' || r.ending === 'Air' || r.ending === 'Off') {
    return r.ending
  }
  return ''
}

type UsualPack = {
  phases: Rate
  serve: Rate
  receive: Rate
  attack: Rate
  endErrors: number
  endPoints: number
}

function phasesCard(all: Placed[], videos: Set<string>, rules: InsightRules, usual: UsualPack | null): InsightCardModel {
  const yours = { won: 0, n: all.length }
  const phases: Phase[] = ['serve', 'receive', 'rally']
  const buckets = phases.map((phase) => {
    const mine = all.filter((row) => phaseOf(row.rally.server, row.rally.contacts.length, row.rally.ending, 'me') === phase)
    const theirs = all.filter((row) => phaseOf(row.rally.server, row.rally.contacts.length, row.rally.ending, 'them') === phase)
    const you = wonOf(mine, 'me')
    const them = wonOf(theirs, 'them')
    yours.won += you.won
    return { phase, mine, you, them }
  })
  const graded = buckets.map((b) => ({ grade: gradeOf(b.phase, b.you.won, b.you.n, gradeMin(rules)), n: b.you.n, won: b.you.won }))
  let weak = -1
  let bestRank = 9
  let bestN = -1
  graded.forEach((row, i) => {
    if (row.grade !== 'Pass' && row.grade !== 'Below') return
    const rank = row.grade === 'Below' ? 0 : 1
    if (rank < bestRank || (rank === bestRank && row.n > bestN)) {
      weak = i
      bestRank = rank
      bestN = row.n
    }
  })
  if (weak < 0) weak = pickWeak(graded, yours.won, yours.n, rules) ?? -1
  const themHas = all.length > 0
  const lostName: Record<Phase, string> = {
    serve: 'Lost on serve to 5th',
    receive: 'Lost on receive to 4th',
    rally: 'Lost in the rally',
  }
  const weakPhase = weak >= 0 ? buckets[weak].phase : null
  const listRows = weakPhase ? buckets[weak].mine : all
  const listName = weakPhase ? lostName[weakPhase] : 'Points lost'
  return {
    id: 'phases',
    title: 'Phases',
    value: rateText(yours.won, yours.n, valueMin(rules)),
    sub: withTier(`Won ${yours.won} of ${yours.n} · China team marks`, yours.n, rules),
    compare: usualRate(rules, yours, usual?.phases ?? null),
    columns: ['You', rules.label, 'Grade'],
    rows: buckets.map((b, i) => ({
      label: PHASE_LABEL[b.phase],
      weak: i === weak,
      youWon: b.you.won,
      youN: b.you.n,
      themWon: b.them.won,
      themN: b.them.n,
      you: rateCell(b.you.won, b.you.n, rowMin(rules)),
      them: themHas ? rateCell(b.them.won, b.them.n, rowMin(rules)) : null,
      grade: gradeOf(b.phase, b.you.won, b.you.n, gradeMin(rules)),
    })),
    empty: null,
    playlist: playlistOf(listName, listRows, videos, 'phases', wholeWindow, () => '', 'name', true),
    about: aboutFor('phases', rules),
    counts: { youWon: yours.won, youN: yours.n, themWon: all.length - yours.won, themN: all.length, points: yours.n },
  }
}

function threeBall(
  id: 'serve' | 'receive',
  title: string,
  rows: Placed[],
  videos: Set<string>,
  rules: InsightRules,
  empty: string,
  sub: (won: number, n: number) => string,
  labels: Record<'ace' | 'opp' | 'third' | 'none', string>,
  lost: Record<'ace' | 'opp' | 'third' | 'none', string>,
  fallback: string,
  elite: string,
  themRows: Placed[],
  usual: Rate | null,
): InsightCardModel {
  if (rows.length === 0) {
    const them = wonOf(themRows, 'them')
    return { ...emptyCard(id, title, empty, rules), counts: { youWon: 0, youN: 0, themWon: them.won, themN: them.n, points: 0 } }
  }
  const you = wonOf(rows, 'me')
  const them = wonOf(themRows, 'them')
  const keys = ['ace', 'opp', 'third', 'none'] as const
  const buckets = group(rows, (r) => serveBucket(r), [...keys]).filter((b) => b.rows.length > 0)
  const stats = buckets.map((b) => wonOf(b.rows, 'me'))
  const weak = pickWeak(stats, you.won, you.n, rules)
  const weakKey = weak === null ? null : buckets[weak].key
  const listRows = weakKey ? buckets[weak!].rows : rows
  const listName = weakKey ? lost[weakKey] : fallback
  const opp = them.n === 0 ? `${rules.label} none yet` : `${rules.label} ${rateText(them.won, them.n, valueMin(rules))}`
  return {
    id,
    title,
    value: rateText(you.won, you.n, valueMin(rules)),
    sub: withTier(sub(you.won, you.n), you.n, rules),
    compare: joinBits([opp, usualRate(rules, you, usual), eliteBit(rules, you.n, elite)]),
    columns: null,
    rows: buckets.map((b, i) => {
      const s = stats[i]
      const detail = s.n >= rowMin(rules) ? `${Math.round((s.won / s.n) * 100)}%` : null
      return {
        label: labels[b.key],
        weak: i === weak,
        youWon: s.won,
        youN: s.n,
        themWon: 0,
        themN: 0,
        single: { main: `won ${s.won} of ${s.n}`, detail },
      }
    }),
    empty: null,
    playlist: playlistOf(listName, listRows, videos, id, wholeWindow, () => '', 'name', true),
    about: aboutFor(id, rules),
    counts: { youWon: you.won, youN: you.n, themWon: them.won, themN: them.n, points: you.n },
  }
}

function attackCard(all: Placed[], videos: Set<string>, rules: InsightRules, usual: Rate | null): InsightCardModel {
  const mine = all.filter((row) => row.rally.fa !== null && hitterOf(row.rally.server, row.rally.fa) === 'them')
  const theirs = all.filter((row) => row.rally.fa !== null && hitterOf(row.rally.server, row.rally.fa) === 'me')
  if (mine.length === 0) {
    return emptyCard('attack', 'Attack', `${rules.they} ${rules.they === 'They' ? 'have' : 'has'} not attacked first yet`, rules)
  }
  const you = wonOf(mine, 'me')
  const them = wonOf(theirs, 'them')
  const keys = ['counter', 'block', 'none'] as const
  const labels = { counter: 'Countered', block: 'Blocked', none: 'No reply' }
  const mineB = group(mine, (r) => replyBucket(r), [...keys])
  const themB = group(theirs, (r) => replyBucket(r), [...keys])
  const shown = keys.filter((key) => mineB.find((b) => b.key === key)!.rows.length + themB.find((b) => b.key === key)!.rows.length > 0)
  const stats = shown.map((key) => wonOf(mineB.find((b) => b.key === key)!.rows, 'me'))
  const weak = pickWeak(stats, you.won, you.n, rules)
  const weakKey = weak === null ? null : shown[weak]
  const lost = {
    counter: 'Lost after you countered',
    block: 'Lost after you blocked',
    none: 'Lost to their attack',
  }
  const listRows = weakKey ? mineB.find((b) => b.key === weakKey)!.rows : mine
  const listName = weakKey ? lost[weakKey] : `Lost when ${rules.who} attacked first`
  const opp = them.n === 0 ? `${rules.label} none yet` : `${rules.label} ${rateText(them.won, them.n, valueMin(rules))}`
  return {
    id: 'attack',
    title: 'Attack',
    value: rateText(you.won, you.n, valueMin(rules)),
    sub: withTier(`Won ${you.won} of ${you.n} when ${rules.who} attacked first`, you.n, rules),
    compare: joinBits([opp, usualRate(rules, you, usual), eliteBit(rules, you.n, '48%')]),
    columns: ['You', rules.label],
    rows: shown.map((key, i) => {
      const y = wonOf(mineB.find((b) => b.key === key)!.rows, 'me')
      const t = wonOf(themB.find((b) => b.key === key)!.rows, 'them')
      return {
        label: labels[key],
        weak: i === weak,
        youWon: y.won,
        youN: y.n,
        themWon: t.won,
        themN: t.n,
        you: rateCell(y.won, y.n, rowMin(rules)),
        them: them.n === 0 ? null : rateCell(t.won, t.n, rowMin(rules)),
      }
    }),
    empty: null,
    playlist: playlistOf(listName, listRows, videos, 'attack', wholeWindow, () => '', 'name', true),
    about: aboutFor('attack', rules),
    counts: { youWon: you.won, youN: you.n, themWon: them.won, themN: them.n, points: you.n },
  }
}

function endCard(all: Placed[], videos: Set<string>, rules: InsightRules, usualErrors: number, usualPoints: number): InsightCardModel {
  const past = all.filter((row) => row.rally.contacts.length >= 2)
  if (past.length === 0) return emptyCard('end', 'End', 'No rallies past the serve yet', rules)
  const keys = ['fh', 'bh', 'under', 'receive'] as const
  const labels = {
    fh: 'Free ball, FH',
    bh: 'Free ball, BH',
    under: 'Under attack',
    receive: 'On the receive',
  }
  const mine = new Map<(typeof keys)[number], Placed[]>()
  const theirs = new Map<(typeof keys)[number], Placed[]>()
  for (const key of keys) {
    mine.set(key, [])
    theirs.set(key, [])
  }
  let youN = 0
  let themN = 0
  for (const row of past) {
    const mineKey = endBucket(row.rally, 'me')
    const themKey = endBucket(row.rally, 'them')
    if (mineKey) {
      mine.get(mineKey)!.push(row)
      youN += 1
    }
    if (themKey) {
      theirs.get(themKey)!.push(row)
      themN += 1
    }
  }
  const free = mine.get('fh')!.length + mine.get('bh')!.length
  const shown = keys.filter((key) => mine.get(key)!.length + theirs.get(key)!.length > 0)
  let weakKey: (typeof keys)[number] | null = null
  for (const key of ['fh', 'bh'] as const) {
    const n = mine.get(key)!.length
    if (n < 3) continue
    if (!weakKey || n > mine.get(weakKey)!.length) weakKey = key
  }
  const lost = { fh: 'FH errors on a free ball', bh: 'BH errors on a free ball' }
  const listRows = weakKey ? mine.get(weakKey)! : [...mine.values()].flat()
  const listName = weakKey ? lost[weakKey] : 'Your errors'
  const scaled = rules.scope === 'global' && all.length >= 100
  const cell = (count: number) => (scaled ? { text: per100(count, all.length), of: null } : { text: String(count), of: null })
  const opp = scaled ? `${rules.label} ${per100(themN, all.length)}` : `${rules.label} ${themN}`
  const sub = scaled
    ? `Your errors per 100 points · ${per100(free, all.length)} on a free ball`
    : `${free} on a free ball`
  return {
    id: 'end',
    title: 'End',
    value: scaled ? per100(youN, all.length) : String(youN),
    sub: withTier(sub, all.length, rules),
    compare: joinBits([opp, usualPoints > 0 ? usualEnd(rules, youN, all.length, usualErrors, usualPoints) : null]),
    columns: shown.length ? ['You', rules.label] : null,
    rows: shown.map((key) => ({
      label: labels[key],
      weak: key === weakKey,
      youWon: 0,
      youN: mine.get(key)!.length,
      themWon: 0,
      themN: theirs.get(key)!.length,
      you: cell(mine.get(key)!.length),
      them: cell(theirs.get(key)!.length),
    })),
    empty: null,
    playlist: playlistOf(listName, listRows, videos, 'end', endWindow, (r) => missWord(r), 'name', false),
    about: aboutFor('end', rules),
    counts: { youWon: 0, youN, themWon: 0, themN, points: all.length },
  }
}

const PART_LABEL: Record<BestPart, string> = {
  opening: 'Opening',
  attack: 'Attack',
  rally: 'Rally',
  end: 'End',
}

function markedCard(all: Placed[], videos: Set<string>, rules: InsightRules): InsightCardModel | null {
  const order: BestPart[] = ['opening', 'attack', 'rally', 'end']
  const rows: { row: Placed; part: BestPart; w: { a: number; b: number } }[] = []
  for (const row of all) {
    const marks = row.rally.idea?.review ?? []
    for (const part of order) {
      if (!marks.includes(part)) continue
      const w = partAt(row.rally, part)
      if (!w || !videos.has(row.rally.videoId)) continue
      rows.push({ row, part, w })
    }
  }
  if (rows.length === 0) return null
  const items: PlayItem[] = rows.map((entry, i) => ({
    id: `marked-${entry.row.rally.id}-${entry.part}-${i}`,
    rallyId: entry.row.rally.id,
    videoId: entry.row.rally.videoId,
    a: entry.w.a,
    b: entry.w.b,
    setId: entry.row.setId,
    sets: entry.row.sets,
    points: entry.row.points,
    server: entry.row.rally.server,
    note: PART_LABEL[entry.part],
    matchId: entry.row.matchId,
    versus: entry.row.versus,
  }))
  return {
    id: 'marked',
    title: 'Marked for review',
    value: null,
    sub: null,
    compare: null,
    columns: null,
    rows: [],
    empty: null,
    playlist: { name: 'Marked for review', items, caption: 'note' },
    about: aboutFor('marked', rules),
    counts: { youWon: 0, youN: items.length, themWon: 0, themN: 0, points: items.length },
  }
}

function countedOf(matches: MatchRecord[]): Placed[] {
  const out: Placed[] = []
  for (const match of newestFirst(matches)) {
    for (const row of place(match)) {
      const set = match.sets.find((s) => s.setId === row.setId)
      if (set && countedRally(set, row.rally)) out.push(row)
    }
  }
  return out
}

function videoLineFor(all: Placed[], videos: Set<string>, rules: InsightRules): string | null {
  if (all.length === 0) return null
  const playable = all.filter((row) => videos.has(row.rally.videoId)).length
  if (playable === all.length) return null
  if (rules.scope === 'match') {
    return playable === 0 ? 'The video was removed, so rallies cannot play. Add it on Tag.' : null
  }
  if (playable === 0) return 'The videos were removed, so rallies cannot play.'
  return 'Some rallies cannot play. Their video was removed.'
}

function coverageLine(matches: MatchRecord[], points: number, rules: InsightRules): string | null {
  if (rules.scope === 'match') return matches[0] ? coverageOf(matches[0].sets) : null
  const n = matches.length
  const parts = matches.filter((m) => derivePhase(m) === 'partial').length
  let line = `${n === 1 ? '1 match' : `${n} matches`} · ${points} points`
  if (parts === 1) line += ' · 1 part tagged'
  else if (parts > 1) line += ` · ${parts} parts tagged`
  return line
}

function packFrom(cards: InsightCardModel[]): UsualPack {
  const by = (id: string) => cards.find((card) => card.id === id)!
  const end = by('end')
  return {
    phases: { won: by('phases').counts.youWon, n: by('phases').counts.youN },
    serve: { won: by('serve').counts.youWon, n: by('serve').counts.youN },
    receive: { won: by('receive').counts.youWon, n: by('receive').counts.youN },
    attack: { won: by('attack').counts.youWon, n: by('attack').counts.youN },
    endErrors: end.counts.youN,
    endPoints: end.counts.points,
  }
}

function buildCards(all: Placed[], videos: Set<string>, rules: InsightRules, usual: UsualPack | null): InsightCardModel[] {
  const serves = all.filter((row) => row.rally.server === 'me')
  const receives = all.filter((row) => row.rally.server === 'them')
  return [
    all.length ? phasesCard(all, videos, rules, usual) : emptyCard('phases', 'Phases', 'No points yet', rules),
    threeBall(
      'serve',
      'Serve',
      serves,
      videos,
      rules,
      'No serves of yours yet',
      (won, n) => `Won ${won} of ${n} on your serve`,
      {
        ace: 'Ace or fault',
        opp: `${rules.they} attacked`,
        third: 'You attacked 3rd',
        none: 'No attack by 3rd',
      },
      {
        ace: 'Your serve faults',
        opp: `Lost when ${rules.who} attacked your serve`,
        third: 'Lost after your 3rd ball',
        none: 'Lost with no attack by 3rd',
      },
      'Lost on your serve',
      '51%',
      receives,
      usual?.serve ?? null,
    ),
    threeBall(
      'receive',
      'Receive',
      receives,
      videos,
      rules,
      `No serves from ${rules.who === 'they' ? 'them' : rules.they} yet`,
      (won, n) => `Won ${won} of ${n} on ${rules.their} serve`,
      {
        ace: 'Ace or fault',
        opp: 'You attacked',
        third: `${rules.they} attacked 3rd`,
        none: 'No attack by 3rd',
      },
      {
        ace: `Lost to ${rules.their} ace`,
        opp: 'Lost when you attacked',
        third: `Lost when ${rules.who} attacked the 3rd`,
        none: 'Lost with no attack by 3rd',
      },
      `Lost on ${rules.their} serve`,
      '49%',
      serves,
      usual?.receive ?? null,
    ),
    attackCard(all, videos, rules, usual?.attack ?? null),
    endCard(all, videos, rules, usual?.endErrors ?? 0, usual?.endPoints ?? 0),
  ]
}

/**
 * The five cards for one match or a pool of matches.
 * `usualFrom` is every tagged match on the global page, and every other tagged match on a match page.
 */
export function insightsFor(matches: MatchRecord[], rules: InsightRules, usualFrom: MatchRecord[]): MatchInsightsModel {
  const videos = new Set(matches.flatMap((match) => match.videos.map((video) => video.id)))
  const all = countedOf(matches)
  const coverage = coverageLine(matches, all.length, rules)
  if (all.length === 0) {
    if (rules.scope === 'match') return { empty: true, coverage, videoLine: null, cards: [], marked: null }
    return {
      empty: false,
      coverage,
      videoLine: null,
      cards: buildCards([], videos, rules, null),
      marked: null,
    }
  }
  const usual =
    usualFrom.length > 0 ? packFrom(buildCards(countedOf(usualFrom), new Set(), rules, null)) : null
  return {
    empty: false,
    coverage,
    videoLine: videoLineFor(all, videos, rules),
    cards: buildCards(all, videos, rules, usual),
    marked: markedCard(all, videos, rules),
  }
}

/** One match, with the match thresholds. Pass the other tagged matches so Usual can show. */
export function matchInsights(match: MatchRecord, usualFrom: MatchRecord[] = []): MatchInsightsModel {
  return insightsFor([match], insightRules('match', match.opponent, true), usualFrom)
}

