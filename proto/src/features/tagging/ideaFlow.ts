/**
 * Rally Spine (`?flow=spine`).
 * A live pass records contacts and the result. Later sweeps ask the rows.
 * The other flows do not use this file.
 */

import {
  hitterOf,
  rallyEnd,
  rallyStart,
  winnerOf,
  type Draft,
  type Ending,
  type IdeaTag,
  type RallyData,
  type Side,
} from './rally'

/** Spine closes after this much video, not wall time. */
export const SPINE_IDLE_S = 1.2

export const SPINE_RESULTS = ['Winner', 'Net', 'Long', 'Wide'] as const
export const SPINE_SERVE = ['Short', 'Half-long', 'Long'] as const
export const SPINE_STROKES = ['Short', 'Push', 'Flick', 'Loop', 'Hit', 'Block', 'Defend'] as const

export type Sweep = 'serve' | 'receive' | 'third' | 'finish'

export type QKind = 'serve' | 'receive' | 'third' | 'wing' | 'stroke'

export type DetailQ = {
  index: number
  contact: number
  kind: QKind
  shot?: number
  title: string
  hint: string
  options: string[]
}

export function spineEnding(result: string): Ending | null {
  if (result === 'Winner' || result === 'Net' || result === 'Long' || result === 'Wide') return result
  return null
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

/** Change the result token on a saved Rally Spine rally. The winner follows the token. */
export function correctResult(r: RallyData, result: string): RallyData | null {
  const ending = spineEnding(result)
  if (!ending || !r.idea) return null
  const winner = winnerOf({ server: r.server, contacts: r.contacts, ending })
  if (!winner) return null
  return { ...r, winner, ending, idea: { ...r.idea, result } }
}

/** Write one sweep answer. The point winner stays as the live pass set it. */
export function applyDetail(r: RallyData, q: DetailQ, code: string): RallyData {
  const idea: IdeaTag = { ...(r.idea ?? { flow: 'spine' }) }
  if (q.kind === 'serve') idea.serve = code
  if ((q.kind === 'receive' || q.kind === 'third') && q.contact) idea.shots = { ...idea.shots, [q.contact]: code }
  if (q.kind === 'wing') idea.wing = code
  if (q.kind === 'stroke') idea.finish = code
  return { ...r, idea }
}
