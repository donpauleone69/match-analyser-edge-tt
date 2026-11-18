import {
  addContact,
  blankDraft,
  canOpen,
  deleteContact,
  nOf,
  other,
  questionFor,
  scoreOf,
  serverFor,
  setPoint,
  settle,
  togglePart,
  tossInstead,
  type Code,
  type Depth,
  type Draft,
  type EndKind,
  type Part,
  type Side,
  type Who,
} from '@/rules/rally'
import { SCENARIOS, draftOf } from '@/rules/scenarios'
import { liveTruth, seedMatch, type MatchSet } from '@/rules/seed'

export type Screen = 'tag' | 'overview'

export type TagState = {
  screen: Screen
  sets: MatchSet[]
  cur: number
  mode: 'live' | 'questions'
  draft: Draft | null
  draftTruth: number[]
  truthServer: Side
  liveTruth: number[]
  liveServer: Side
  liveKey: number
  taps: number[]
  playing: boolean
  lastSaved: Draft | null
  truths: Record<string, number[]>
  returnTo: Screen | null
  nextId: number
  toast: string | null
  sheet: boolean
}

export type Action =
  | { type: 'end'; e: EndKind }
  | { type: 'point'; s: Side }
  | { type: 'stroke'; k: number; c: Code }
  | { type: 'first'; w: Who }
  | { type: 'serve'; v: Depth }
  | { type: 'server'; s: Side }
  | { type: 'deleteLast' }
  | { type: 'deleteFirst' }
  | { type: 'toss' }
  | { type: 'check' }
  | { type: 'minus'; k: number }
  | { type: 'more' }
  | { type: 'addStart' }
  | { type: 'addTap'; t: number }
  | { type: 'addCancel' }
  | { type: 'switchServer' }
  | { type: 'keep' }
  | { type: 'open'; k: number }
  | { type: 'part'; p: Part }
  | { type: 'star' }
  | { type: 'tap'; t: number }
  | { type: 'idle' }
  | { type: 'play'; on: boolean }
  | { type: 'nextLive' }
  | { type: 'scenario'; key: string }
  | { type: 'edit'; set: number; no: number; k?: number }
  | { type: 'markRally'; set: number; no: number; p: Part | 'Star' }
  | { type: 'screen'; s: Screen }
  | { type: 'sheet'; on: boolean }
  | { type: 'toast'; text: string | null }

const key = (d: Pick<Draft, 'set' | 'no'>) => `${d.set}-${d.no}`

function curSet(s: TagState) {
  return s.sets.find((x) => x.no === s.cur)!
}

function nextServer(s: TagState): Side {
  const set = curSet(s)
  const [a, b] = scoreOf(set.rallies)
  return serverFor(set.first ?? 'me', a + b)
}

export function initState(): TagState {
  const sets = seedMatch()
  const truths: Record<string, number[]> = {}
  sets.forEach((set) => set.rallies.forEach((r) => (truths[key(r)] = r.contacts.map((c) => c.t))))
  const base: TagState = {
    screen: 'tag',
    sets,
    cur: 2,
    mode: 'live',
    draft: null,
    draftTruth: [],
    truthServer: 'me',
    liveTruth: liveTruth(1),
    liveServer: 'me',
    liveKey: 1,
    taps: [],
    playing: false,
    lastSaved: null,
    truths,
    returnTo: null,
    nextId: 1000,
    toast: null,
    sheet: false,
  }
  const last = curSet(base).rallies[curSet(base).rallies.length - 1] ?? null
  return { ...base, liveServer: nextServer(base), lastSaved: last }
}

function putRally(s: TagState, d: Draft): MatchSet[] {
  return s.sets.map((set) => {
    if (set.no !== d.set) return set
    const has = set.rallies.some((r) => r.no === d.no)
    const rallies = has ? set.rallies.map((r) => (r.no === d.no ? d : r)) : [...set.rallies, d].sort((a, b) => a.no - b.no)
    const first = set.first ?? (d.one ? d.server : null)
    return { ...set, rallies, first }
  })
}

/** The last answer saves: the rally goes into the set and the video plays on. */
function commit(s: TagState, d: Draft): TagState {
  if (!d.saved) return { ...s, draft: d }
  const sets = putRally(s, d)
  const truths = { ...s.truths, [key(d)]: s.draftTruth }
  const next: TagState = { ...s, sets, truths, draft: null, mode: 'live', lastSaved: d, taps: [], playing: true }
  const live = { ...next, liveServer: nextServer(next), liveKey: s.liveKey + 1, liveTruth: liveTruth(s.liveKey + 1) }
  if (s.returnTo === 'overview') return { ...live, screen: 'overview', returnTo: null, playing: false, toast: `Rally ${d.no} saved` }
  return live
}

function onDraft(s: TagState, fn: (d: Draft) => Draft): TagState {
  if (!s.draft) return s
  return commit(s, fn(s.draft))
}

function onSaved(s: TagState, fn: (d: Draft) => Draft): TagState {
  if (s.mode === 'questions' && s.draft) return { ...s, draft: fn(s.draft) }
  if (!s.lastSaved) return s
  const d = fn(s.lastSaved)
  return { ...s, lastSaved: d, sets: putRally(s, d) }
}

export function reduce(s: TagState, a: Action): TagState {
  switch (a.type) {
    case 'end':
      return onDraft(s, (d) => settle({ ...d, end: a.e, note: null }, true))
    case 'point':
      return onDraft(s, (d) => setPoint(d, a.s))
    case 'stroke':
      return onDraft(s, (d) => settle({ ...d, tags: { ...d.tags, [d.contacts[a.k - 1].id]: a.c } }, true))
    case 'first':
      return onDraft(s, (d) => settle({ ...d, first: d.first === a.w ? null : a.w }, false))
    case 'serve':
      return onDraft(s, (d) => settle({ ...d, depth: { ...d.depth, [d.contacts[0].id]: a.v }, cut: null }, true))
    case 'server':
      return onDraft(s, (d) => (d.server === a.s ? d : settle({ ...d, server: a.s, kept: false }, false)))
    case 'deleteLast':
      return onDraft(s, (d) => settle(deleteContact(d, nOf(d)), true))
    case 'deleteFirst':
      return onDraft(s, (d) => settle(deleteContact(d, 1), true))
    case 'toss':
      return onDraft(s, (d) => tossInstead(d))
    case 'check':
      return onDraft(s, (d) => (d.check ? settle({ ...d, check: false }, true) : { ...d, check: true, add: false, more: false, q: 'end' }))
    case 'minus':
      return onDraft(s, (d) => ({ ...deleteContact(d, a.k), check: true }))
    case 'more':
      return onDraft(s, (d) => ({ ...d, more: !d.more }))
    case 'addStart':
      return onDraft(s, (d) => ({ ...d, add: true, more: false }))
    case 'addTap':
      return { ...onDraft(s, (d) => addContact(d, a.t, s.nextId)), nextId: s.nextId + 1 }
    case 'addCancel':
      return onDraft(s, (d) => ({ ...d, add: false }))
    case 'switchServer':
      return onDraft(s, (d) => settle({ ...d, server: other(d.server), kept: false }, true))
    case 'keep':
      return onDraft(s, (d) => settle({ ...d, kept: true }, true))
    case 'open': {
      if (s.mode === 'questions' && s.draft) {
        const d = s.draft
        if (d.check || d.add || !canOpen(d, a.k)) return s
        return { ...s, draft: { ...d, q: questionFor(d, a.k) } }
      }
      const d = s.lastSaved
      if (!d || !canOpen(d, a.k)) return s
      return {
        ...s,
        mode: 'questions',
        draft: { ...d, saved: false, q: questionFor(d, a.k) },
        draftTruth: s.truths[key(d)] ?? d.contacts.map((c) => c.t),
        truthServer: d.server,
        playing: true,
      }
    }
    case 'part':
      return onSaved(s, (d) => togglePart(d, a.p))
    case 'star':
      return onSaved(s, (d) => ({ ...d, star: !d.star }))
    case 'tap':
      return { ...s, taps: [...s.taps, a.t], lastSaved: null }
    case 'idle': {
      if (!s.taps.length) return s
      const set = curSet(s)
      const no = set.rallies.length + 1
      const one = set.first === null
      const contacts = s.taps.map((t, i) => ({ id: s.nextId + i, t }))
      const d = blankDraft({ set: set.no, no, one, server: s.liveServer, contacts, score: scoreOf(set.rallies) })
      return { ...s, mode: 'questions', draft: d, draftTruth: s.liveTruth, truthServer: s.liveServer, taps: [], nextId: s.nextId + contacts.length, playing: true }
    }
    case 'play':
      return { ...s, playing: a.on }
    case 'nextLive':
      return { ...s, liveKey: s.liveKey + 1, liveTruth: liveTruth(s.liveKey + 1), taps: [] }
    case 'scenario': {
      if (a.key === 'live') return { ...s, sheet: false, mode: 'live', draft: null, screen: 'tag', taps: [], playing: false }
      const sc = SCENARIOS.find((x) => x.key === a.key)
      if (!sc) return s
      const set = curSet(s)
      return {
        ...s,
        sheet: false,
        screen: 'tag',
        mode: 'questions',
        draft: { ...draftOf(sc, s.cur), no: set.rallies.length + 1, score: scoreOf(set.rallies) },
        draftTruth: sc.truth,
        truthServer: sc.server,
        playing: true,
        returnTo: null,
        toast: sc.line,
      }
    }
    case 'edit': {
      const set = s.sets.find((x) => x.no === a.set)
      const d = set?.rallies.find((r) => r.no === a.no)
      if (!d) return s
      const q = a.k !== undefined && canOpen(d, a.k) ? questionFor(d, a.k) : 'end'
      return {
        ...s,
        screen: 'tag',
        mode: 'questions',
        draft: { ...d, saved: false, q },
        draftTruth: s.truths[key(d)] ?? d.contacts.map((c) => c.t),
        truthServer: d.server,
        playing: true,
        returnTo: 'overview',
      }
    }
    case 'markRally': {
      const d = s.sets.find((x) => x.no === a.set)?.rallies.find((r) => r.no === a.no)
      if (!d) return s
      const next = a.p === 'Star' ? { ...d, star: !d.star } : togglePart(d, a.p)
      const lastSaved = s.lastSaved && key(s.lastSaved) === key(next) ? next : s.lastSaved
      return { ...s, sets: putRally(s, next), lastSaved }
    }
    case 'screen':
      return { ...s, screen: a.s, playing: a.s === 'tag' ? s.playing : false }
    case 'sheet':
      return { ...s, sheet: a.on }
    case 'toast':
      return { ...s, toast: a.text }
  }
}
