import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type DemoMode = 'filled' | 'empty'

export type RallyData = {
  id: string
  label: string
  meta: string
  start: string
  end: string
  shots: { id: string; label: string; t: string }[]
}

export type Score = { me: number; them: number }

/** Typed on Details. Strings so a half-typed score survives. */
export type EnteredScore = { me: string; them: string }

export type SetData = {
  setId: number
  /** Entered on Details. */
  entered: EnteredScore
  /** Counted from tagging; null until the set has tagged points. */
  tagged: Score | null
  /** "Not filmed": the user chose to skip this set on the Tag checklist. */
  skipped: boolean
  contacts: boolean
  keyMoments: boolean
  shotDetails: boolean
  optionalExtras: boolean
  rallies: RallyData[]
}

/** One source video. A match's videos play in list order; no set mapping. */
export type VideoAsset = {
  id: string
  fileName: string
  sizeMb: number
  /** Rallies only, joined, lower quality. Cannot be undone. */
  archived: boolean
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
}

/**
 * new = no video yet
 * ready = video added, nothing tagged
 * partial = at least one rally tagged
 * complete = every set is fully tagged or marked not filmed
 */
export type MatchPhase = 'new' | 'ready' | 'partial' | 'complete'

export function setFullyTagged(s: SetData): boolean {
  return s.contacts && s.keyMoments && s.shotDetails
}

export function setHasTagProgress(s: SetData): boolean {
  return (
    s.rallies.length > 0 ||
    s.contacts ||
    s.keyMoments ||
    s.shotDetails ||
    s.optionalExtras
  )
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

function emptySet(setId: number): SetData {
  return {
    setId,
    entered: { me: '', them: '' },
    tagged: null,
    skipped: false,
    contacts: false,
    keyMoments: false,
    shotDetails: false,
    optionalExtras: false,
    rallies: [],
  }
}

/**
 * The result dictates the set list. With no result yet, list every set that
 * has been tagged or marked not filmed, plus the next one. Sets that already
 * hold an entered score are kept.
 */
function normalizeSets(match: MatchRecord): MatchRecord {
  const fromResult = resultSetCount(match)
  const count =
    fromResult !== null
      ? Math.max(fromResult, lastTaggedSetId(match))
      : Math.max(
          lastSetId(match.sets, (s) => setHasTagProgress(s) || s.skipped) + 1,
          lastSetId(match.sets, (s) => s.entered.me !== '' || s.entered.them !== '')
        )
  if (count === match.sets.length) return match
  const sets = Array.from(
    { length: count },
    (_, i) => match.sets.find((s) => s.setId === i + 1) ?? emptySet(i + 1)
  )
  return { ...match, sets }
}

export function derivePhase(match: MatchRecord): MatchPhase {
  if (match.videos.length === 0) return 'new'
  const active = match.sets.filter((s) => !s.skipped)
  if (!active.some(setHasTagProgress)) return 'ready'
  return active.every(setFullyTagged) ? 'complete' : 'partial'
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
  if (phase === 'new') return 'details'
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

/** The title is made from event and opponent; there is no separate name. */
export function matchTitle(match: MatchRecord): string {
  const opponent = match.opponent.trim()
  return (
    [match.event.trim(), opponent ? `vs ${opponent}` : '']
      .filter(Boolean)
      .join(' ') || 'New match'
  )
}

export function formatScore(score: Score): string {
  return `${score.me} - ${score.them}`
}

export function matchMeta(match: MatchRecord): string {
  const { me, them } = match.result
  return (
    [match.date, me !== null && them !== null ? formatScore({ me, them }) : '']
      .filter(Boolean)
      .join(' · ') || 'No date'
  )
}

export function formatSize(sizeMb: number): string {
  return sizeMb >= 1000 ? `${(sizeMb / 1000).toFixed(1)} GB` : `${sizeMb} MB`
}

export function parseEntered(entered: EnteredScore): Score | null {
  if (entered.me === '' || entered.them === '') return null
  return { me: Number(entered.me), them: Number(entered.them) }
}

/** Entered and tagged scores are only compared once the set is fully tagged. */
export function setScoresDiffer(s: SetData): boolean {
  const entered = parseEntered(s.entered)
  if (!entered || !s.tagged || s.skipped || !setFullyTagged(s)) return false
  return entered.me !== s.tagged.me || entered.them !== s.tagged.them
}

/** A new match nobody has put anything into. Discarded when left. */
export function isUntouched(match: MatchRecord): boolean {
  return (
    !match.opponent.trim() &&
    !match.event.trim() &&
    !match.date.trim() &&
    match.result.me === null &&
    match.result.them === null &&
    match.videos.length === 0 &&
    match.sets.every(
      (s) =>
        !s.skipped && !setHasTagProgress(s) && s.entered.me === '' && s.entered.them === ''
    )
  )
}

const ARCHIVE_RATIO = 0.12

const SEED: MatchRecord[] = [
  {
    id: 'm-new',
    opponent: 'Lee',
    event: 'Open trial',
    date: '',
    result: { me: null, them: null },
    videos: [],
    sets: [emptySet(1)],
  },
  {
    id: 'm-partial',
    opponent: 'Sam',
    event: 'Club night',
    date: '2026-11-11',
    result: { me: 3, them: 1 },
    // Two videos in order. Set 4 was skipped by choice (Not filmed).
    videos: [
      { id: 'v-club-1', fileName: 'club-night-part-1.mp4', sizeMb: 1600, archived: false },
      { id: 'v-club-2', fileName: 'club-night-part-2.mp4', sizeMb: 1200, archived: false },
    ],
    sets: [
      {
        setId: 1,
        entered: { me: '11', them: '7' },
        tagged: { me: 11, them: 7 },
        skipped: false,
        contacts: true,
        keyMoments: true,
        shotDetails: true,
        optionalExtras: true,
        rallies: [
          {
            id: 'r1',
            label: 'R1 · 0-0',
            meta: 'Won · FA',
            start: '04:12.0',
            end: '04:18.2',
            shots: [
              { id: 's1', label: 'Contact 1', t: '04:12.3' },
              { id: 's2', label: 'Contact 2', t: '04:13.8' },
              { id: 's3', label: 'End', t: '04:18.0' },
            ],
          },
        ],
      },
      {
        setId: 2,
        entered: { me: '9', them: '11' },
        tagged: { me: 4, them: 3 },
        skipped: false,
        contacts: true,
        keyMoments: false,
        shotDetails: false,
        optionalExtras: false,
        rallies: [
          {
            id: 'r1',
            label: 'R1 · 0-0',
            meta: 'Open',
            start: '01:02.0',
            end: '01:05.0',
            shots: [{ id: 's1', label: 'Contact 1', t: '01:02.4' }],
          },
        ],
      },
      { ...emptySet(3), entered: { me: '11', them: '8' } },
      { ...emptySet(4), entered: { me: '11', them: '6' }, skipped: true },
    ],
  },
  {
    id: 'm-complete',
    opponent: 'Pat',
    event: 'League final',
    date: '2026-11-08',
    result: { me: 2, them: 1 },
    videos: [{ id: 'v-final', fileName: 'league-final.mp4', sizeMb: 2400, archived: false }],
    sets: [
      {
        setId: 1,
        entered: { me: '11', them: '7' },
        tagged: { me: 11, them: 7 },
        skipped: false,
        contacts: true,
        keyMoments: true,
        shotDetails: true,
        optionalExtras: true,
        rallies: [
          {
            id: 'r1',
            label: 'R1 · 0-0',
            meta: 'Won · FA',
            start: '02:10.0',
            end: '02:14.0',
            shots: [
              { id: 's1', label: 'Contact 1', t: '02:10.2' },
              { id: 's2', label: 'End', t: '02:13.8' },
            ],
          },
        ],
      },
      {
        setId: 2,
        // Entered and tagged disagree on purpose, to show the flag.
        entered: { me: '9', them: '11' },
        tagged: { me: 8, them: 11 },
        skipped: false,
        contacts: true,
        keyMoments: true,
        shotDetails: true,
        optionalExtras: false,
        rallies: [
          {
            id: 'r1',
            label: 'R1 · 0-0',
            meta: 'Lost',
            start: '03:01.0',
            end: '03:06.0',
            shots: [
              { id: 's1', label: 'Contact 1', t: '03:01.3' },
              { id: 's2', label: 'End', t: '03:05.7' },
            ],
          },
        ],
      },
      {
        setId: 3,
        entered: { me: '11', them: '5' },
        tagged: { me: 11, them: 5 },
        skipped: false,
        contacts: true,
        keyMoments: true,
        shotDetails: true,
        optionalExtras: true,
        rallies: [
          {
            id: 'r1',
            label: 'R1 · 0-0',
            meta: 'Won · FA',
            start: '05:20.0',
            end: '05:24.0',
            shots: [
              { id: 's1', label: 'Contact 1', t: '05:20.1' },
              { id: 's2', label: 'End', t: '05:23.6' },
            ],
          },
        ],
      },
    ],
  },
]

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
  addVideo: (matchId: string) => void
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
  return [...merged, ...onlyExtra]
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
    if (mode === 'empty') return extra.filter((m) => !SEED_IDS.has(m.id))
    return catalog
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
        const current =
          prev.find((m) => m.id === id) ?? (isSeed ? SEED.find((m) => m.id === id) : undefined)
        if (!current) return prev
        const next = normalizeSets(fn(current))
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
      date: '',
      result: { me: null, them: null },
      videos: [],
      sets: [emptySet(1)],
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

  const addVideo = useCallback(
    (matchId: string) =>
      change(matchId, (m) => ({
        ...m,
        videos: [
          ...m.videos,
          {
            id: `v-${matchId}-${Date.now()}`,
            fileName: `match-video-${m.videos.length + 1}.mp4`,
            sizeMb: 1400,
            archived: false,
          },
        ],
      })),
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
      change(matchId, (m) => ({
        ...m,
        videos: m.videos.filter((v) => v.id !== videoId),
      })),
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
