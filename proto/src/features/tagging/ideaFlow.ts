/**
 * Opening and Ending (`?flow=openend`) and Rally Spine (`?flow=spine`).
 * A live pass records contacts and the point. A later pass asks the rows.
 * The other three flows do not use this file.
 */

import {
  hitterOf,
  otherSide,
  rallyEnd,
  rallyStart,
  type Draft,
  type Ending,
  type IdeaTag,
  type RallyData,
  type Side,
} from './rally'

/** Spine pauses this long after the last contact. Opening and Ending keeps the shared 2s pause. */
export const SPINE_IDLE_MS = 1200

export const SPINE_RESULTS = ['Winner', 'Net', 'Long', 'Wide'] as const
export const SPINE_SERVE = ['Short', 'Half-long', 'Long'] as const
export const SPINE_STROKES = ['Short', 'Push', 'Flick', 'Loop', 'Hit', 'Block', 'Defend'] as const
export const OPEN_SERVE = ['Short', 'Long'] as const
export const OPEN_LAST = ['Net', 'Off table', 'Landed'] as const
export const OPEN_ZONE = ['Wide FH', 'Middle', 'Wide BH'] as const

export type Sweep = 'serve' | 'receive' | 'third' | 'finish'

export type QKind = 'serve' | 'shot' | 'first' | 'last' | 'zone' | 'receive' | 'third' | 'wing' | 'stroke'

export type DetailQ = {
  index: number
  contact: number
  kind: QKind
  shot?: number
  title: string
  hint: string
  options: string[]
}

const isAttack = (a?: string) => a === 'FH attack' || a === 'BH attack'

/** Shots 2 and 3, then the last two that were not already in that opening. */
export function openingShots(n: number): number[] {
  const s = new Set<number>()
  for (let k = 2; k <= Math.min(3, n); k++) s.add(k)
  for (let k = Math.max(2, n - 1); k <= n; k++) s.add(k)
  return [...s].sort((a, b) => a - b)
}

/** The third button, named from the ball before. */
export function thirdLabel(serve: string | undefined, prev: string | undefined, shot: number): string {
  const incoming = shot === 2 ? serve : isAttack(prev) ? 'Attack' : prev
  if (incoming === 'Short' || incoming === 'Push') return 'Push'
  if (incoming === 'Attack' || incoming === 'Block') return 'Block'
  return 'No attack'
}

/** Landed means the last hitter won. Net or Off table means they lost. */
export function pointAgrees(server: Side, n: number, winner: Side, lastBall: string): boolean {
  const last = hitterOf(server, n)
  const implied = lastBall === 'Landed' ? last : otherSide(last)
  return implied === winner
}

function endingForLast(lastBall: string): Ending {
  if (lastBall === 'Net') return 'Net'
  if (lastBall === 'Off table') return 'Off'
  return 'Winner'
}

export function spineEnding(result: string): Ending | null {
  if (result === 'Winner' || result === 'Net' || result === 'Long' || result === 'Wide') return result
  return null
}

/** A one-contact rally the server lost. Spine reads that from the result token. */
export function isServeFault(r: RallyData): boolean {
  if (r.contacts.length !== 1) return false
  if (r.idea?.flow === 'spine') return r.idea.result !== 'Winner'
  return r.winner !== r.server
}

export function liveRally(d: Draft, id: string, winner: Side, ending: Ending | null, idea: IdeaTag): RallyData {
  return {
    id,
    videoId: d.videoId,
    server: d.server,
    contacts: [...d.contacts],
    start: rallyStart(d),
    end: rallyEnd(d),
    ending,
    fa: null,
    shots: d.shots.map(() => ({})),
    winner,
    highlight: d.highlight,
    ...(d.serveChecked ? { serveChecked: true as const } : {}),
    idea,
  }
}

function mine(rallies: RallyData[], flow: IdeaTag['flow']): RallyData[] {
  return rallies.filter((r) => r.idea?.flow === flow && !r.point && r.contacts.length > 0)
}

function openendQuestion(r: RallyData, index: number, names: Record<Side, string>): DetailQ | null {
  const n = r.contacts.length
  const idea = r.idea ?? { flow: 'openend' as const }
  const who = (shot: number) => names[hitterOf(r.server, shot)]
  if (!isServeFault(r) && !idea.serve) {
    const ace = n === 1
    return {
      index,
      contact: 1,
      kind: 'serve',
      title: `Serve, ${names[r.server]}`,
      hint: ace ? 'Short: it would bounce twice on the table.' : 'Short: over the table. Long: behind the end line.',
      options: [...OPEN_SERVE],
    }
  }
  const shots = openingShots(n)
  for (const shot of shots) {
    if (shot > 3 && n >= 6 && !idea.first) {
      const a2 = idea.shots?.[2]
      const a3 = idea.shots?.[3]
      if (a2 && a3 && !isAttack(a2) && !isAttack(a3)) {
        return {
          index,
          contact: 4,
          kind: 'first',
          title: 'Who attacked first?',
          hint: 'Shots 2 and 3 were not attacks.',
          options: [names.me, names.them, 'Nobody'],
        }
      }
    }
    if (!idea.shots?.[shot]) {
      const prev = shot === 2 ? undefined : idea.shots?.[shot - 1]
      return {
        index,
        contact: shot,
        kind: 'shot',
        shot,
        title: `Shot ${shot}${shot === n ? ', last' : ''}, ${who(shot)}`,
        hint: '',
        options: ['FH attack', 'BH attack', thirdLabel(idea.serve, prev, shot)],
      }
    }
  }
  if (n >= 6 && !idea.first) {
    const a2 = idea.shots?.[2]
    const a3 = idea.shots?.[3]
    if (a2 && a3 && !isAttack(a2) && !isAttack(a3)) {
      return {
        index,
        contact: Math.min(4, n),
        kind: 'first',
        title: 'Who attacked first?',
        hint: 'Shots 2 and 3 were not attacks.',
        options: [names.me, names.them, 'Nobody'],
      }
    }
  }
  if (!idea.result) {
    return {
      index,
      contact: n,
      kind: 'last',
      title: `Last ball, ${who(n)}`,
      hint: 'Landed: on the table, and not returned.',
      options: [...OPEN_LAST],
    }
  }
  if (idea.result === 'Landed' && !idea.zone) {
    const receiver = names[otherSide(hitterOf(r.server, n))]
    return {
      index,
      contact: n,
      kind: 'zone',
      title: `Where it landed, ${receiver}'s half`,
      hint: 'Thirds of the table, from that side.',
      options: [...OPEN_ZONE],
    }
  }
  return null
}

/** The next Opening and Ending question, in rally order. */
export function nextOpenend(rallies: RallyData[], names: Record<Side, string>): DetailQ | null {
  for (let index = 0; index < rallies.length; index++) {
    const r = rallies[index]
    if (r.idea?.flow !== 'openend' || r.point || r.contacts.length === 0) continue
    const q = openendQuestion(r, index, names)
    if (q) return q
  }
  return null
}

export function openendState(rallies: RallyData[], names: Record<Side, string>): 'empty' | 'open' | 'done' {
  const rows = mine(rallies, 'openend')
  if (rows.length === 0) return 'empty'
  return nextOpenend(rallies, names) ? 'open' : 'done'
}

function serveFaultSpine(r: RallyData): boolean {
  return r.contacts.length === 1 && r.idea?.result !== 'Winner'
}

export function nextSweep(rallies: RallyData[], sweep: Sweep, names: Record<Side, string>): DetailQ | null {
  for (let index = 0; index < rallies.length; index++) {
    const r = rallies[index]
    if (r.idea?.flow !== 'spine' || r.point || r.contacts.length === 0) continue
    const n = r.contacts.length
    const idea = r.idea
    const who = (shot: number) => names[hitterOf(r.server, shot)]
    if (sweep === 'serve') {
      if (serveFaultSpine(r) || idea.serve) continue
      return {
        index,
        contact: 1,
        kind: 'serve',
        title: `Serve, ${names[r.server]}`,
        hint: 'Where the second bounce lands.',
        options: [...SPINE_SERVE],
      }
    }
    if (sweep === 'receive') {
      if (n < 2 || idea.shots?.[2]) continue
      return {
        index,
        contact: 2,
        kind: 'receive',
        title: `Receive, ${who(2)}`,
        hint: '',
        options: [...SPINE_STROKES],
      }
    }
    if (sweep === 'third') {
      if (n < 3 || idea.shots?.[3]) continue
      return {
        index,
        contact: 3,
        kind: 'third',
        title: `Third ball, ${who(3)}`,
        hint: '',
        options: [...SPINE_STROKES],
      }
    }
    if (sweep !== 'finish') continue
    if (n < 2) continue
    if (!idea.wing) {
      return {
        index,
        contact: n,
        kind: 'wing',
        title: `Finish, ${who(n)}`,
        hint: '',
        options: ['FH', 'BH'],
      }
    }
    if (n >= 4 && !idea.finish) {
      return {
        index,
        contact: n,
        kind: 'stroke',
        title: `Finish stroke, ${who(n)}`,
        hint: '',
        options: [...SPINE_STROKES],
      }
    }
  }
  return null
}

function sweepApplies(r: RallyData, sweep: Sweep): boolean {
  const n = r.contacts.length
  if (sweep === 'serve') return !serveFaultSpine(r)
  if (sweep === 'receive') return n >= 2
  if (sweep === 'third') return n >= 3
  return n >= 2
}

function sweepAnswered(r: RallyData, sweep: Sweep): boolean {
  const idea = r.idea
  if (!idea) return false
  const n = r.contacts.length
  if (sweep === 'serve') return Boolean(idea.serve)
  if (sweep === 'receive') return Boolean(idea.shots?.[2])
  if (sweep === 'third') return Boolean(idea.shots?.[3])
  return Boolean(idea.wing) && (n < 4 || Boolean(idea.finish))
}

export function sweepState(rallies: RallyData[], sweep: Sweep): 'empty' | 'open' | 'done' {
  const rows = mine(rallies, 'spine').filter((r) => sweepApplies(r, sweep))
  if (rows.length === 0) return 'empty'
  return rows.some((r) => !sweepAnswered(r, sweep)) ? 'open' : 'done'
}

/** Write one detail answer. The point winner stays as the live pass set it. */
export function applyDetail(r: RallyData, q: DetailQ, code: string): RallyData {
  const idea: IdeaTag = { ...(r.idea ?? { flow: 'openend' }) }
  if (q.kind === 'serve') idea.serve = code
  if ((q.kind === 'shot' || q.kind === 'receive' || q.kind === 'third') && q.contact) {
    idea.shots = { ...idea.shots, [q.kind === 'shot' ? (q.shot ?? q.contact) : q.contact]: code }
  }
  if (q.kind === 'first') idea.first = code
  if (q.kind === 'wing') idea.wing = code
  if (q.kind === 'stroke') idea.finish = code
  let ending = r.ending
  if (q.kind === 'last') {
    idea.result = code
    if (code !== 'Landed') idea.zone = undefined
    idea.check = pointAgrees(r.server, r.contacts.length, r.winner, code) ? undefined : 'Check the point'
    ending = endingForLast(code)
  }
  if (q.kind === 'zone') idea.zone = code
  return { ...r, idea, ending }
}
