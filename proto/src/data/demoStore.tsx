import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { type Draft, type RallyData, type Side } from '@/features/tagging/rally'
import {
  buildScripts,
  matchScript,
  ralliesFromScript,
  setWinners,
  type VideoScript,
} from '@/features/tagging/script'
import {
  countPoints,
  firstServerForSet,
  leader,
  scoreAtSetEnd,
  type Points,
} from '@/features/tagging/score'
import { markState, migrateSetMark, setIncomplete } from '@/features/tagging/setMark'

export type { RallyData } from '@/features/tagging/rally'

export type DemoMode = 'filled' | 'empty'

export type Score = Points

/** Typed on Details. Strings so a half-typed score survives. */
export type EnteredScore = { me: string; them: string }

/** One end of a set on a video. `t` is seconds in that video. */
export type MarkPoint = { videoId: string; t: number }

/**
 * Where the set sits on video. `complete` means the whole set is there,
 * from the first serve. Null means the set is not on video.
 */
export type SetMark = {
  from: MarkPoint
  to: MarkPoint
  complete: boolean
}

export type SetData = {
  setId: number
  /** Entered on Details. */
  entered: EnteredScore
  /** Legacy skip. No longer written: no mark means the set is not on video. */
  skipped: boolean
  /** The user pressed Finish set. */
  finished: boolean
  firstServer: Side
  /** Saved rallies, in order. The tagged score is counted from them. */
  rallies: RallyData[]
  /** The rally being tagged, kept without asking. */
  draft: Draft | null
  /** The set's hard bounds on video. Null when it is not on video. */
  mark: SetMark | null
}

/**
 * One source video. A match's videos play in list order; no set mapping.
 * demo = the scripted stand-in. file = a local file through a blob URL,
 * in memory only, never uploaded or stored.
 */
export type VideoAsset = {
  id: string
  fileName: string
  sizeMb: number
  /** Rallies only, joined, lower quality. Cannot be undone. */
  archived: boolean
  kind: 'demo' | 'file'
  durationS: number
  script?: VideoScript
  src?: string
}

/** Sets won by each side. Both set means the result is entered. */
export type MatchResult = { me: number | null; them: number | null }

export type MatchRecord = {
  id: string
  opponent: string
  event: string
  date: string
  result: MatchResult
  videos: VideoAsset[]
  sets: SetData[]
  /** Older matches could be marked finished. Nothing on Tag sets this now. */
  tagDone: boolean
}

/**
 * new = no video and nothing tagged
 * ready = video added, nothing tagged
 * partial = tagging started, match not finished
 * complete = Tagged: with a result, every set it lists is saved or counted
 *   from Details. With no result, an older match can still carry tagDone.
 */
export type MatchPhase = 'new' | 'ready' | 'partial' | 'complete'

/** Counted from the saved rallies; null until the set has one. A set that was won, then tagged past that rally, counts the score at the win. */
export function taggedScore(s: SetData): Score | null {
  if (s.rallies.length === 0) return null
  const winners = s.rallies.map((r) => r.winner)
  return scoreAtSetEnd(winners) ?? countPoints(winners)
}

export function setHasTagProgress(s: SetData): boolean {
  return s.rallies.length > 0 || s.draft !== null || s.finished
}

export type SetState = 'skipped' | 'finished' | 'progress' | 'none'

export function setState(s: SetData): SetState {
  if (s.skipped) return 'skipped'
  if (s.finished) return 'finished'
  return setHasTagProgress(s) ? 'progress' : 'none'
}

/** Number of sets the result dictates (3 - 2 means 5), or null if not entered. */
export function resultSetCount(match: MatchRecord): number | null {
  const { me, them } = match.result
  if (me === null || them === null) return null
  const total = me + them
  return total > 0 ? total : null
}

function lastSetId(sets: SetData[], test: (s: SetData) => boolean): number {
  return sets.reduce((max, s) => (test(s) ? Math.max(max, s.setId) : max), 0)
}

/** Highest set with tagging in it. Never dropped, even if the result says fewer. */
export function lastTaggedSetId(match: MatchRecord): number {
  return lastSetId(match.sets, setHasTagProgress)
}

export function emptySet(setId: number): SetData {
  return {
    setId,
    entered: { me: '', them: '' },
    skipped: false,
    finished: false,
    firstServer: firstServerForSet('me', setId),
    rallies: [],
    draft: null,
    mark: null,
  }
}

/**
 * The result dictates the set list. With no result, list every set that is
 * tagged, not filmed or has an entered score, then one spare set to start
 * next. An older tagDone flag drops the spare, and only holds while every
 * set that is left is finished or not filmed.
 */
function normalizeMatch(match: MatchRecord): MatchRecord {
  const fromResult = resultSetCount(match)
  const used = Math.max(
    lastSetId(match.sets, (s) => setHasTagProgress(s) || s.skipped || s.mark !== null),
    lastSetId(match.sets, (s) => s.entered.me !== '' || s.entered.them !== '')
  )
  const loose = match.sets.some((s) => s.setId <= used && !setSettled(s))
  const tagDone = match.tagDone && !loose && match.sets.some((s) => setState(s) === 'finished')
  const count =
    fromResult !== null
      ? Math.max(fromResult, lastTaggedSetId(match))
      : Math.max(1, tagDone ? used : used + 1)
  const listed =
    count === match.sets.length
      ? match.sets
      : Array.from(
          { length: count },
          (_, i) => match.sets.find((s) => s.setId === i + 1) ?? emptySet(i + 1)
        )
  const sets = listed.map((s) => migrateSetMark(match.videos, s))
  const sameSets = sets.length === match.sets.length && sets.every((s, i) => s === match.sets[i])
  return sameSets && tagDone === match.tagDone ? match : { ...match, sets, tagDone }
}

/** With no result the last listed set is a spare: it can be started, not skipped. */
export function isSpareSet(match: MatchRecord, s: SetData): boolean {
  return (
    resultSetCount(match) === null &&
    s.setId === match.sets.length &&
    s.mark === null &&
    setState(s) === 'none' &&
    s.entered.me === '' &&
    s.entered.them === ''
  )
}

/**
 * Saved and won, or unmarked / incomplete once Details has a score.
 * A legacy not-filmed flag still counts. Ready and tagging do not.
 */
export function setSettled(s: SetData): boolean {
  if (setIncomplete(s)) return parseEntered(s.entered) !== null
  if (s.finished || s.skipped) return true
  if (markState(s) === 'off') return parseEntered(s.entered) !== null
  return false
}

/** A won set uses its tagged score. Incomplete, skipped and unmarked sets use Details. */
function countedScore(s: SetData): Score | null {
  if (setIncomplete(s)) return parseEntered(s.entered)
  if (s.finished) {
    const atEnd = scoreAtSetEnd(s.rallies.map((r) => r.winner))
    return atEnd ?? taggedScore(s)
  }
  if (s.skipped || markState(s) === 'off') return parseEntered(s.entered)
  return null
}

/**
 * The one sets count, used wherever the app says "sets X - Y". A saved set
 * counts from its tagged score. Skipped and unmarked sets count from the
 * Details score. A set still to tag counts for nobody.
 */
export function matchSetsWon(match: MatchRecord): Score {
  const won = { me: 0, them: 0 }
  for (const s of match.sets) {
    const score = countedScore(s)
    const side = score ? leader(score) : null
    if (side) won[side] += 1
  }
  return won
}

/**
 * Tagged comes from tagging. With a result entered, every set it lists is
 * saved or counted from Details. With no result, only an older tagDone flag
 * counts. Never while a set is still being tagged.
 */
export function isMatchTagged(match: MatchRecord): boolean {
  if (match.sets.some((s) => setState(s) === 'progress')) return false
  if (!match.sets.some((s) => s.finished)) return false
  const count = resultSetCount(match)
  if (count === null) return match.tagDone
  return match.sets.filter((s) => s.setId <= count).every(setSettled)
}

export function derivePhase(match: MatchRecord): MatchPhase {
  const tagged = match.sets.some((s) => !s.skipped && setHasTagProgress(s))
  if (!tagged) return match.videos.length === 0 ? 'new' : 'ready'
  return isMatchTagged(match) ? 'complete' : 'partial'
}

export function phaseLabel(phase: MatchPhase): string {
  if (phase === 'new') return 'New'
  if (phase === 'ready') return 'Ready to tag'
  if (phase === 'partial') return 'Part tagged'
  return 'Tagged'
}

export function defaultMatchTab(
  phase: MatchPhase
): 'insights' | 'details' | 'tag' {
  if (phase === 'new') return 'tag'
  if (phase === 'ready' || phase === 'partial') return 'tag'
  return 'insights'
}

export function taggedSetIds(match: MatchRecord): number[] {
  return match.sets
    .filter((s) => !s.skipped && setHasTagProgress(s))
    .map((s) => s.setId)
}

export function hasTaggedRallies(match: MatchRecord): boolean {
  return match.sets.some((s) => !s.skipped && s.rallies.length > 0)
}

/**
 * The title is made from event and opponent; there is no separate name.
 * "Club night vs Sam". With no event it reads "Match vs Sam".
 */
export function matchTitle(match: MatchRecord): string {
  const event = match.event.trim()
  const opponent = match.opponent.trim()
  if (!opponent) return event || 'New match'
  return `${event || 'Match'} vs ${opponent}`
}

export function formatScore(score: Score): string {
  return `${score.me} - ${score.them}`
}

export function matchMeta(match: MatchRecord): string {
  const { me, them } = match.result
  // The entered result, or for a tagged match with none, what the sets give.
  const sets =
    me !== null && them !== null
      ? formatScore({ me, them })
      : isMatchTagged(match)
        ? formatScore(matchSetsWon(match))
        : ''
  return [match.date, sets].filter(Boolean).join(' · ') || 'No date'
}

export function formatSize(sizeMb: number): string {
  return sizeMb >= 1000 ? `${(sizeMb / 1000).toFixed(1)} GB` : `${sizeMb} MB`
}

export function parseEntered(entered: EnteredScore): Score | null {
  if (entered.me === '' || entered.them === '') return null
  return { me: Number(entered.me), them: Number(entered.them) }
}

/** Entered and tagged scores are only compared once the set is finished. */
export function setScoresDiffer(s: SetData): boolean {
  const entered = parseEntered(s.entered)
  const tagged = taggedScore(s)
  if (!entered || !tagged || s.skipped || !s.finished) return false
  return entered.me !== tagged.me || entered.them !== tagged.them
}

/**
 * matchSetsWon, but only once every listed set gives a winner. Null while a
 * set is still to tag, or is not on video with no Details score.
 */
export function taggedResult(match: MatchRecord): Score | null {
  const won = { me: 0, them: 0 }
  for (const s of match.sets) {
    if (isSpareSet(match, s)) continue
    const side = leader(countedScore(s) ?? { me: 0, them: 0 })
    if (!side) return null
    won[side] += 1
  }
  return won.me + won.them > 0 ? won : null
}

/** The entered result disagrees with the set winners from tagging. */
export function resultDiffers(match: MatchRecord): boolean {
  const { me, them } = match.result
  if (me === null || them === null || !isMatchTagged(match)) return false
  const tagged = taggedResult(match)
  return tagged !== null && (tagged.me !== me || tagged.them !== them)
}

/**
 * An archive keeps only the tagged rallies, so once any video is the archived
 * copy the match cannot be tagged further.
 */
export function isArchived(match: MatchRecord): boolean {
  return match.videos.some((v) => v.archived)
}

/** Removed videos that saved or open rallies still point at, in set order. */
export function missingVideoIds(match: MatchRecord): string[] {
  const have = new Set(match.videos.map((v) => v.id))
  const out: string[] = []
  for (const s of match.sets) {
    const ids = s.rallies.map((r) => r.videoId)
    if (s.draft) ids.push(s.draft.videoId)
    for (const id of ids) if (!have.has(id) && !out.includes(id)) out.push(id)
  }
  return out
}

/** How many of a set's rallies (saved or open) sit on a removed video. */
export function setRalliesWithoutVideo(match: MatchRecord, s: SetData): number {
  const have = new Set(match.videos.map((v) => v.id))
  return (
    s.rallies.filter((r) => !have.has(r.videoId)).length +
    (s.draft && !have.has(s.draft.videoId) ? 1 : 0)
  )
}

/** Today as the date field holds it. A new match starts with it. */
export function todayDate(): string {
  const d = new Date()
  const two = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
}

/** A new match nobody has put anything into. Discarded when left. */
export function isUntouched(match: MatchRecord): boolean {
  return (
    !match.opponent.trim() &&
    !match.event.trim() &&
    // The date a new match starts with does not count as put in.
    (!match.date.trim() || match.date === todayDate()) &&
    match.result.me === null &&
    match.result.them === null &&
    match.videos.length === 0 &&
    match.sets.every(
      (s) =>
        !s.mark &&
        !s.skipped &&
        !setHasTagProgress(s) &&
        s.entered.me === '' &&
        s.entered.them === ''
    )
  )
}

const ARCHIVE_RATIO = 0.12

/** Use demo video: a whole decided match that follows what Details says. */
function demoScriptFor(m: MatchRecord): VideoScript {
  const { me, them } = m.result
  return matchScript(
    Date.now() % 9973,
    me === null || them === null ? null : { me, them },
    m.sets.map((s) => ({ firstServer: s.firstServer, score: parseEntered(s.entered), filmed: !s.skipped }))
  )
}

function demoVideo(id: string, fileName: string, script: VideoScript): VideoAsset {
  return {
    id,
    fileName,
    sizeMb: Math.round(script.duration * 6),
    archived: false,
    kind: 'demo',
    durationS: script.duration,
    script,
  }
}

/** Club night vs Sam: two videos. The second starts ten points into set 2. */
const CLUB_SETS = [
  { firstServer: 'me' as Side, winners: setWinners(11, 11, 7) },
  { firstServer: 'them' as Side, winners: setWinners(12, 9, 11) },
  { firstServer: 'me' as Side, winners: setWinners(13, 11, 8) },
]
const CLUB_SCRIPTS = buildScripts(101, CLUB_SETS, [28])
const CLUB_VIDEOS = [
  demoVideo('v-club-1', 'club-night-part-1.mp4', CLUB_SCRIPTS[0]),
  demoVideo('v-club-2', 'club-night-part-2.mp4', CLUB_SCRIPTS[1]),
]
/** League final vs Pat: one video, three sets. Set 2 is tagged 8 - 11. */
const FINAL_SETS = [
  { firstServer: 'me' as Side, winners: setWinners(21, 11, 7) },
  { firstServer: 'them' as Side, winners: setWinners(22, 8, 11) },
  { firstServer: 'me' as Side, winners: setWinners(23, 11, 5) },
]
const FINAL_SCRIPT = buildScripts(202, FINAL_SETS)[0]
const FINAL_VIDEO = demoVideo('v-final', 'league-final.mp4', FINAL_SCRIPT)
const finalSet = (from: number, count: number) =>
  ralliesFromScript('v-final', FINAL_SCRIPT, from, count)

const SEED: MatchRecord[] = [
  {
    id: 'm-new',
    opponent: 'Lee',
    event: 'Open trial',
    date: '',
    result: { me: null, them: null },
    videos: [],
    sets: [emptySet(1)],
    tagDone: false,
  },
  {
    // Video added, nothing tagged.
    id: 'm-ready',
    opponent: 'Kim',
    event: 'County open',
    date: '2026-11-13',
    result: { me: null, them: null },
    videos: [demoVideo('v-county', 'county-open.mp4', matchScript(31))],
    sets: [emptySet(1)],
    tagDone: false,
  },
  {
    // Part way through set 2. Set 4 skipped by choice.
    id: 'm-partial',
    opponent: 'Sam',
    event: 'Club night',
    date: '2026-11-11',
    result: { me: 3, them: 1 },
    videos: CLUB_VIDEOS,
    sets: [
      {
        ...emptySet(1),
        entered: { me: '11', them: '7' },
        finished: true,
        rallies: ralliesFromScript('v-club-1', CLUB_SCRIPTS[0], 0, 18),
      },
      {
        ...emptySet(2),
        entered: { me: '9', them: '11' },
        rallies: ralliesFromScript('v-club-1', CLUB_SCRIPTS[0], 18, 7),
      },
      { ...emptySet(3), entered: { me: '11', them: '8' } },
      { ...emptySet(4), entered: { me: '11', them: '6' }, skipped: true },
    ],
    tagDone: false,
  },
  {
    id: 'm-complete',
    opponent: 'Pat',
    event: 'League final',
    date: '2026-10-04',
    result: { me: 2, them: 1 },
    videos: [FINAL_VIDEO],
    sets: [
      {
        ...emptySet(1),
        entered: { me: '11', them: '7' },
        finished: true,
        rallies: finalSet(0, 18),
      },
      {
        // Entered and tagged disagree on purpose, to show the flag.
        ...emptySet(2),
        entered: { me: '9', them: '11' },
        finished: true,
        rallies: finalSet(18, 19),
      },
      {
        ...emptySet(3),
        entered: { me: '11', them: '5' },
        finished: true,
        rallies: finalSet(37, 16),
      },
    ],
    tagDone: false,
  },
]

/** A local file picked by the user. Held in memory only; never uploaded. */
export type LocalVideo = { fileName: string; sizeMb: number; durationS: number; src: string }

const SEED_IDS = new Set(SEED.map((s) => s.id))

type MatchFields = Partial<Pick<MatchRecord, 'opponent' | 'event' | 'date'>>

type DemoContextValue = {
  mode: DemoMode
  setMode: (mode: DemoMode) => void
  matches: MatchRecord[]
  getMatch: (id: string) => MatchRecord | undefined
  createMatch: () => MatchRecord
  deleteMatch: (id: string) => void
  /** Drops new matches nobody filled in, except the one that is open. */
  removeUntouchedMatches: (exceptId?: string) => void
  updateMatch: (id: string, patch: MatchFields) => void
  setResult: (matchId: string, result: MatchResult) => void
  setEnteredScore: (matchId: string, setId: number, entered: EnteredScore) => void
  /** Adds the scripted demo video, or the given local file video. */
  addVideo: (matchId: string, file?: LocalVideo) => void
  /** Applies any change to the latest copy of a match (tagging uses this). */
  mutateMatch: (id: string, fn: (current: MatchRecord) => MatchRecord) => void
  moveVideo: (matchId: string, videoId: string, by: -1 | 1) => void
  removeVideo: (matchId: string, videoId: string) => void
  archiveVideos: (matchId: string) => void
  patchSet: (matchId: string, setId: number, patch: Partial<SetData>) => void
}

const DemoContext = createContext<DemoContextValue | null>(null)
const MODE_KEY = 'proto-demo-mode'

function readMode(): DemoMode {
  try {
    const v = localStorage.getItem(MODE_KEY)
    if (v === 'empty' || v === 'filled') return v
  } catch {
    /* ignore */
  }
  return 'filled'
}

function mergeMatches(extra: MatchRecord[], deleted: string[]): MatchRecord[] {
  const overrides = new Map(extra.map((m) => [m.id, m]))
  const merged = SEED.filter((s) => !deleted.includes(s.id)).map(
    (s) => overrides.get(s.id) ?? s
  )
  const onlyExtra = extra.filter((m) => !SEED_IDS.has(m.id))
  return [...merged, ...onlyExtra].map(normalizeMatch)
}

/**
 * Newest first, with no date sorting as newest. On the same date a created
 * match comes before a seed, and the latest created comes first.
 */
function newestFirst(list: MatchRecord[]): MatchRecord[] {
  const at = new Map(list.map((m, i) => [m.id, i]))
  const index = (m: MatchRecord) => at.get(m.id) ?? 0
  return [...list].sort((a, b) => {
    if (a.date !== b.date) {
      if (!a.date || !b.date) return a.date ? 1 : -1
      return b.date.localeCompare(a.date)
    }
    const created = !SEED_IDS.has(a.id) || !SEED_IDS.has(b.id)
    return created ? index(b) - index(a) : index(a) - index(b)
  })
}

function findCurrent(
  mode: DemoMode,
  extra: MatchRecord[],
  catalog: MatchRecord[],
  id: string
): MatchRecord | undefined {
  if (mode === 'empty') {
    if (SEED_IDS.has(id)) return undefined
    return extra.find((m) => m.id === id)
  }
  return catalog.find((m) => m.id === id)
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<DemoMode>(() => readMode())
  const [extra, setExtra] = useState<MatchRecord[]>([])
  const [deleted, setDeleted] = useState<string[]>([])

  const setMode = useCallback((next: DemoMode) => {
    setModeState(next)
    // Filled restores the seed matches, including any that were deleted.
    if (next === 'filled') setDeleted([])
    try {
      localStorage.setItem(MODE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const catalog = useMemo(() => mergeMatches(extra, deleted), [extra, deleted])

  const matches = useMemo(() => {
    return newestFirst(mode === 'empty' ? extra.filter((m) => !SEED_IDS.has(m.id)) : catalog)
  }, [mode, extra, catalog])

  const getMatch = useCallback(
    (id: string) => findCurrent(mode, extra, catalog, id),
    [catalog, extra, mode]
  )

  /** Applies a change to the latest copy of a match; does nothing if it is gone. */
  const change = useCallback(
    (id: string, fn: (current: MatchRecord) => MatchRecord) => {
      setExtra((prev) => {
        const isSeed = SEED_IDS.has(id)
        if (isSeed && mode === 'empty') return prev
        const stored = prev.find((m) => m.id === id)
        const base = stored ?? (isSeed ? SEED.find((m) => m.id === id) : undefined)
        if (!base) return prev
        // The first write of a seed starts from its migrated mark, so a saved
        // set stays complete when something else on the match changes.
        const current = stored ? base : normalizeMatch(base)
        const next = normalizeMatch(fn(current))
        return prev.some((m) => m.id === id)
          ? prev.map((m) => (m.id === id ? next : m))
          : [...prev, next]
      })
    },
    [mode]
  )

  const createMatch = useCallback(() => {
    const created: MatchRecord = {
      id: `m-new-${Date.now()}`,
      opponent: '',
      event: '',
      date: todayDate(),
      result: { me: null, them: null },
      videos: [],
      sets: [emptySet(1)],
      tagDone: false,
    }
    setExtra((prev) => [...prev, created])
    return created
  }, [])

  const deleteMatch = useCallback((id: string) => {
    setExtra((prev) => prev.filter((m) => m.id !== id))
    if (SEED_IDS.has(id)) setDeleted((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const removeUntouchedMatches = useCallback((exceptId?: string) => {
    setExtra((prev) => {
      const drop = (m: MatchRecord) =>
        m.id !== exceptId && !SEED_IDS.has(m.id) && isUntouched(m)
      return prev.some(drop) ? prev.filter((m) => !drop(m)) : prev
    })
  }, [])

  const updateMatch = useCallback(
    (id: string, patch: MatchFields) => change(id, (m) => ({ ...m, ...patch })),
    [change]
  )

  const setResult = useCallback(
    (matchId: string, result: MatchResult) => change(matchId, (m) => ({ ...m, result })),
    [change]
  )

  const patchSet = useCallback(
    (matchId: string, setId: number, patch: Partial<SetData>) =>
      change(matchId, (m) => ({
        ...m,
        sets: m.sets.map((s) => (s.setId === setId ? { ...s, ...patch } : s)),
      })),
    [change]
  )

  const setEnteredScore = useCallback(
    (matchId: string, setId: number, entered: EnteredScore) =>
      patchSet(matchId, setId, { entered }),
    [patchSet]
  )

  /**
   * Removed videos, kept in memory so tags that still point at one line up
   * again when it is added back.
   */
  const removedVideos = useRef(new Map<string, { video: VideoAsset; index: number }>())

  /**
   * While rallies point at a removed video, the next video added takes its
   * place (same id and position), so those rallies play again. The demo video
   * comes back as it was; a chosen file is trusted to be the same footage.
   */
  const addVideo = useCallback(
    (matchId: string, file?: LocalVideo) =>
      change(matchId, (m) => {
        const lostId = missingVideoIds(m)[0]
        const lost = lostId ? removedVideos.current.get(lostId) : undefined
        const id = lostId ?? `v-${matchId}-${Date.now()}`
        const video: VideoAsset = file
          ? {
              id,
              fileName: file.fileName,
              sizeMb: file.sizeMb,
              archived: false,
              kind: 'file',
              durationS: file.durationS,
              src: file.src,
            }
          : lost && lost.video.kind === 'demo'
            ? { ...lost.video, archived: false }
            : demoVideo(id, `demo-video-${m.videos.length + 1}.mp4`, demoScriptFor(m))
        const videos = [...m.videos]
        videos.splice(lostId ? Math.min(lost?.index ?? 0, videos.length) : videos.length, 0, video)
        return { ...m, videos }
      }),
    [change]
  )

  const moveVideo = useCallback(
    (matchId: string, videoId: string, by: -1 | 1) =>
      change(matchId, (m) => {
        const from = m.videos.findIndex((v) => v.id === videoId)
        const to = from + by
        if (from < 0 || to < 0 || to >= m.videos.length) return m
        const videos = [...m.videos]
        ;[videos[from], videos[to]] = [videos[to], videos[from]]
        return { ...m, videos }
      }),
    [change]
  )

  const removeVideo = useCallback(
    (matchId: string, videoId: string) =>
      change(matchId, (m) => {
        const index = m.videos.findIndex((v) => v.id === videoId)
        if (index >= 0) removedVideos.current.set(videoId, { video: m.videos[index], index })
        return { ...m, videos: m.videos.filter((v) => v.id !== videoId) }
      }),
    [change]
  )

  const archiveVideos = useCallback(
    (matchId: string) =>
      change(matchId, (m) => ({
        ...m,
        videos: m.videos.map((v) =>
          v.archived
            ? v
            : { ...v, archived: true, sizeMb: Math.round(v.sizeMb * ARCHIVE_RATIO) }
        ),
      })),
    [change]
  )

  const value = useMemo(
    () => ({
      mode,
      setMode,
      matches,
      getMatch,
      createMatch,
      deleteMatch,
      removeUntouchedMatches,
      updateMatch,
      setResult,
      setEnteredScore,
      addVideo,
      mutateMatch: change,
      moveVideo,
      removeVideo,
      archiveVideos,
      patchSet,
    }),
    [
      mode,
      setMode,
      matches,
      getMatch,
      createMatch,
      deleteMatch,
      removeUntouchedMatches,
      updateMatch,
      setResult,
      setEnteredScore,
      addVideo,
      change,
      moveVideo,
      removeVideo,
      archiveVideos,
      patchSet,
    ]
  )

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemo() {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo must be used within DemoProvider')
  return ctx
}
