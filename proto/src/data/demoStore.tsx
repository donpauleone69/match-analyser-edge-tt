import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type DemoMode = 'filled' | 'empty'

export type SetData = {
  setId: number
  score: string
  videoFile: string | null
  contacts: boolean
  keyMoments: boolean
  shotDetails: boolean
}

export type MatchRecord = {
  id: string
  name: string
  opponent: string
  event: string
  date: string
  sets: SetData[]
}

/** new = no video, nothing tagged; partial = video, not fully tagged; complete = fully tagged. */
export type MatchPhase = 'new' | 'partial' | 'complete'

export function derivePhase(match: MatchRecord): MatchPhase {
  const hasVideo = match.sets.some((s) => Boolean(s.videoFile))
  const anyTagged = match.sets.some(
    (s) => s.contacts || s.keyMoments || s.shotDetails
  )
  const scored = match.sets.filter((s) => s.score !== '-' && s.score.trim() !== '')
  const targets = scored.length > 0 ? scored : match.sets
  const fullyTagged =
    targets.length > 0 &&
    targets.every((s) => s.contacts && s.keyMoments && s.shotDetails)
  if (!hasVideo && !anyTagged) return 'new'
  if (fullyTagged) return 'complete'
  return 'partial'
}

export function phaseLabel(phase: MatchPhase): string {
  if (phase === 'new') return 'New'
  if (phase === 'partial') return 'Part tagged'
  return 'Tagged'
}

export function defaultMatchTab(phase: MatchPhase): 'insights' | 'details' | 'tag' {
  if (phase === 'new') return 'details'
  if (phase === 'partial') return 'tag'
  return 'insights'
}

const SEED: MatchRecord[] = [
  {
    id: 'm-new',
    name: 'Open trial vs Lee',
    opponent: '',
    event: '',
    date: '',
    sets: [
      {
        setId: 1,
        score: '-',
        videoFile: null,
        contacts: false,
        keyMoments: false,
        shotDetails: false,
      },
    ],
  },
  {
    id: 'm-partial',
    name: 'Club night vs Sam',
    opponent: 'Sam',
    event: 'Club night',
    date: '2026-11-11',
    sets: [
      {
        setId: 1,
        score: '11-7',
        videoFile: 'club-s1.mp4',
        contacts: true,
        keyMoments: true,
        shotDetails: true,
      },
      {
        setId: 2,
        score: 'In progress',
        videoFile: 'club-s2.mp4',
        contacts: true,
        keyMoments: false,
        shotDetails: false,
      },
      {
        setId: 3,
        score: '-',
        videoFile: null,
        contacts: false,
        keyMoments: false,
        shotDetails: false,
      },
    ],
  },
  {
    id: 'm-complete',
    name: 'League final vs Pat',
    opponent: 'Pat',
    event: 'Club league',
    date: '2026-11-08',
    sets: [
      {
        setId: 1,
        score: '11-7',
        videoFile: 'final-s1.mp4',
        contacts: true,
        keyMoments: true,
        shotDetails: true,
      },
      {
        setId: 2,
        score: '9-11',
        videoFile: 'final-s2.mp4',
        contacts: true,
        keyMoments: true,
        shotDetails: true,
      },
      {
        setId: 3,
        score: '11-5',
        videoFile: 'final-s3.mp4',
        contacts: true,
        keyMoments: true,
        shotDetails: true,
      },
    ],
  },
]

type DemoContextValue = {
  mode: DemoMode
  setMode: (mode: DemoMode) => void
  matches: MatchRecord[]
  getMatch: (id: string) => MatchRecord | undefined
  createMatch: () => MatchRecord
  updateMatch: (id: string, patch: Partial<Omit<MatchRecord, 'id' | 'sets'>> & { sets?: SetData[] }) => void
  toggleSetVideo: (matchId: string, setId: number) => void
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
  const onlyExtra = extra.filter((m) => !SEED.some((s) => s.id === m.id))
  return [...merged, ...onlyExtra]
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

  const matches = useMemo(
    () => (mode === 'empty' ? [] : catalog),
    [mode, catalog]
  )

  const getMatch = useCallback(
    (id: string) => {
      if (mode === 'empty') return undefined
      return catalog.find((m) => m.id === id)
    },
    [catalog, mode]
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
      name: 'New match',
      opponent: '',
      event: '',
      date: '',
      sets: [
        {
          setId: 1,
          score: '-',
          videoFile: null,
          contacts: false,
          keyMoments: false,
          shotDetails: false,
        },
      ],
    }
    upsert(created)
    if (mode === 'empty') setMode('filled')
    return created
  }, [mode, setMode, upsert])

  const updateMatch = useCallback(
    (
      id: string,
      patch: Partial<Omit<MatchRecord, 'id' | 'sets'>> & { sets?: SetData[] }
    ) => {
      const current = catalog.find((m) => m.id === id)
      if (!current) return
      upsert({ ...current, ...patch, id })
    },
    [catalog, upsert]
  )

  const toggleSetVideo = useCallback(
    (matchId: string, setId: number) => {
      const current = catalog.find((m) => m.id === matchId)
      if (!current) return
      upsert({
        ...current,
        sets: current.sets.map((s) =>
          s.setId === setId
            ? { ...s, videoFile: s.videoFile ? null : `set-${s.setId}.mp4` }
            : s
        ),
      })
    },
    [catalog, upsert]
  )

  const value = useMemo(
    () => ({
      mode,
      setMode,
      matches,
      getMatch,
      createMatch,
      updateMatch,
      toggleSetVideo,
    }),
    [mode, setMode, matches, getMatch, createMatch, updateMatch, toggleSetVideo]
  )

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemo() {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo must be used within DemoProvider')
  return ctx
}
