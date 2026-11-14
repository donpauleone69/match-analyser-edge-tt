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

export type SetData = {
  setId: number
  /** Optional; filled in by tagging. */
  score: string
  /** Skipped / not filmed: never blocks Tagged. */
  skipped: boolean
  contacts: boolean
  keyMoments: boolean
  shotDetails: boolean
  optionalExtras: boolean
  rallies: RallyData[]
}

/** One source video that may cover one or more sets. */
export type VideoAsset = {
  id: string
  fileName: string
  /** Set ids this video covers; empty means none. */
  setIds: number[]
}

export type MatchRecord = {
  id: string
  name: string
  opponent: string
  event: string
  date: string
  /** True until the user edits identity, videos, or sets. */
  pristine?: boolean
  videos: VideoAsset[]
  sets: SetData[]
}

/**
 * new = no video
 * ready = video attached, nothing tagged
 * partial = at least one rally tagged
 * complete = every non-skipped set fully tagged
 */
export type MatchPhase = 'new' | 'ready' | 'partial' | 'complete'

function setFullyTagged(s: SetData): boolean {
  return s.contacts && s.keyMoments && s.shotDetails
}

function setHasTagProgress(s: SetData): boolean {
  return (
    s.rallies.length > 0 ||
    s.contacts ||
    s.keyMoments ||
    s.shotDetails ||
    s.optionalExtras
  )
}

export function videoForSet(match: MatchRecord, setId: number): VideoAsset | undefined {
  return match.videos.find((v) => v.setIds.includes(setId))
}

export function setHasVideo(match: MatchRecord, setId: number): boolean {
  return Boolean(videoForSet(match, setId))
}

export function derivePhase(match: MatchRecord): MatchPhase {
  if (match.videos.length === 0) return 'new'
  const anyTagged = match.sets.some((s) => !s.skipped && setHasTagProgress(s))
  if (!anyTagged) return 'ready'
  const active = match.sets.filter((s) => !s.skipped)
  const allDone =
    active.length > 0 &&
    active.every((s) => setHasVideo(match, s.setId) && setFullyTagged(s))
  if (allDone) return 'complete'
  return 'partial'
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

function emptySet(setId: number): SetData {
  return {
    setId,
    score: '',
    skipped: false,
    contacts: false,
    keyMoments: false,
    shotDetails: false,
    optionalExtras: false,
    rallies: [],
  }
}

const SEED: MatchRecord[] = [
  {
    id: 'm-new',
    name: 'Open trial vs Lee',
    opponent: 'Lee',
    event: '',
    date: '',
    videos: [],
    sets: [emptySet(1)],
  },
  {
    id: 'm-partial',
    name: 'Club night vs Sam',
    opponent: 'Sam',
    event: 'Club night',
    date: '2026-11-11',
    // One video per set; set 3 has no video (Not filmed / skip path).
    videos: [
      { id: 'v-club-1', fileName: 'club-s1.mp4', setIds: [1] },
      { id: 'v-club-2', fileName: 'club-s2.mp4', setIds: [2] },
    ],
    sets: [
      {
        setId: 1,
        score: '11-7',
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
        score: 'In progress',
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
      {
        setId: 3,
        score: '',
        skipped: false,
        contacts: false,
        keyMoments: false,
        shotDetails: false,
        optionalExtras: false,
        rallies: [],
      },
    ],
  },
  {
    id: 'm-complete',
    name: 'League final vs Pat',
    opponent: 'Pat',
    event: 'Club league',
    date: '2026-11-08',
    // One video covering every set.
    videos: [
      { id: 'v-final', fileName: 'league-final.mp4', setIds: [1, 2, 3] },
    ],
    sets: [
      {
        setId: 1,
        score: '11-7',
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
        score: '9-11',
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
        score: '11-5',
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

type DemoContextValue = {
  mode: DemoMode
  setMode: (mode: DemoMode) => void
  matches: MatchRecord[]
  getMatch: (id: string) => MatchRecord | undefined
  createMatch: () => MatchRecord
  discardMatch: (id: string) => void
  updateMatch: (
    id: string,
    patch: Partial<Omit<MatchRecord, 'id' | 'sets' | 'videos'>> & {
      sets?: SetData[]
      videos?: VideoAsset[]
    }
  ) => void
  addSet: (matchId: string) => void
  addVideo: (matchId: string) => void
  toggleVideoSet: (matchId: string, videoId: string, setId: number) => void
  removeVideo: (matchId: string, videoId: string) => void
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

function mergeMatches(extra: MatchRecord[]): MatchRecord[] {
  const overrides = new Map(extra.map((m) => [m.id, m]))
  const merged = SEED.map((s) => overrides.get(s.id) ?? s)
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

  const setMode = useCallback((next: DemoMode) => {
    setModeState(next)
    try {
      localStorage.setItem(MODE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const catalog = useMemo(() => mergeMatches(extra), [extra])

  const matches = useMemo(() => {
    if (mode === 'empty') return extra.filter((m) => !SEED_IDS.has(m.id))
    return catalog
  }, [mode, extra, catalog])

  const getMatch = useCallback(
    (id: string) => findCurrent(mode, extra, catalog, id),
    [catalog, extra, mode]
  )

  const upsert = useCallback((next: MatchRecord) => {
    setExtra((prev) => {
      const without = prev.filter((m) => m.id !== next.id)
      return [...without, next]
    })
  }, [])

  const createMatch = useCallback(() => {
    const id = `m-new-${Date.now()}`
    const created: MatchRecord = {
      id,
      name: '',
      opponent: '',
      event: '',
      date: '',
      pristine: true,
      videos: [],
      sets: [emptySet(1)],
    }
    upsert(created)
    return created
  }, [upsert])

  const discardMatch = useCallback((id: string) => {
    setExtra((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const updateMatch = useCallback(
    (
      id: string,
      patch: Partial<Omit<MatchRecord, 'id' | 'sets' | 'videos'>> & {
        sets?: SetData[]
        videos?: VideoAsset[]
      }
    ) => {
      const current = findCurrent(mode, extra, catalog, id)
      if (!current) return
      upsert({ ...current, ...patch, id, pristine: false })
    },
    [catalog, extra, mode, upsert]
  )

  const addSet = useCallback(
    (matchId: string) => {
      const current = findCurrent(mode, extra, catalog, matchId)
      if (!current) return
      const nextId = Math.max(0, ...current.sets.map((s) => s.setId)) + 1
      const nextSets = [...current.sets, emptySet(nextId)]
      // New set is covered by every video that already covers all previous sets.
      const allPrev = current.sets.map((s) => s.setId)
      const videos = current.videos.map((v) => {
        const coversAllPrev =
          allPrev.length > 0 && allPrev.every((id) => v.setIds.includes(id))
        return coversAllPrev ? { ...v, setIds: [...v.setIds, nextId] } : v
      })
      upsert({ ...current, pristine: false, sets: nextSets, videos })
    },
    [catalog, extra, mode, upsert]
  )

  const addVideo = useCallback(
    (matchId: string) => {
      const current = findCurrent(mode, extra, catalog, matchId)
      if (!current) return
      const n = current.videos.length + 1
      const video: VideoAsset = {
        id: `v-${matchId}-${Date.now()}`,
        fileName: `match-video-${n}.mp4`,
        // Default: covers all sets.
        setIds: current.sets.map((s) => s.setId),
      }
      upsert({
        ...current,
        pristine: false,
        videos: [...current.videos, video],
      })
    },
    [catalog, extra, mode, upsert]
  )

  const toggleVideoSet = useCallback(
    (matchId: string, videoId: string, setId: number) => {
      const current = findCurrent(mode, extra, catalog, matchId)
      if (!current) return
      upsert({
        ...current,
        pristine: false,
        videos: current.videos.map((v) => {
          if (v.id !== videoId) return v
          const has = v.setIds.includes(setId)
          return {
            ...v,
            setIds: has ? v.setIds.filter((id) => id !== setId) : [...v.setIds, setId],
          }
        }),
      })
    },
    [catalog, extra, mode, upsert]
  )

  const removeVideo = useCallback(
    (matchId: string, videoId: string) => {
      const current = findCurrent(mode, extra, catalog, matchId)
      if (!current) return
      upsert({
        ...current,
        pristine: false,
        videos: current.videos.filter((v) => v.id !== videoId),
      })
    },
    [catalog, extra, mode, upsert]
  )

  const patchSet = useCallback(
    (matchId: string, setId: number, patch: Partial<SetData>) => {
      const current = findCurrent(mode, extra, catalog, matchId)
      if (!current) return
      upsert({
        ...current,
        pristine: false,
        sets: current.sets.map((s) => (s.setId === setId ? { ...s, ...patch } : s)),
      })
    },
    [catalog, extra, mode, upsert]
  )

  const value = useMemo(
    () => ({
      mode,
      setMode,
      matches,
      getMatch,
      createMatch,
      discardMatch,
      updateMatch,
      addSet,
      addVideo,
      toggleVideoSet,
      removeVideo,
      patchSet,
    }),
    [
      mode,
      setMode,
      matches,
      getMatch,
      createMatch,
      discardMatch,
      updateMatch,
      addSet,
      addVideo,
      toggleVideoSet,
      removeVideo,
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
