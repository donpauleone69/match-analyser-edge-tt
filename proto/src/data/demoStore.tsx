import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { buildSeed } from '@/data/buildSeed'
import { matchScript } from '@/features/tagging/script'
import {
  emptySet,
  isUntouched,
  missingVideoIds,
  normalizeMatch,
  parseEntered,
  todayDate,
} from '@/rules/match'
import type {
  DemoMode,
  EnteredScore,
  LocalVideo,
  MatchRecord,
  MatchResult,
  SetData,
  VideoAsset,
} from '@/types/match'
import type { VideoScript } from '@/types/video'

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

/** Fourteen matches. Dates are days before the day the app loaded. */
export const SEED: MatchRecord[] = buildSeed(new Date())

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
