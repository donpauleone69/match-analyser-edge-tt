/**
 * The matches in memory: the seed, what changed on it, and what was created.
 * Resets on reload. Every change runs a pure op from rules/ on the latest copy
 * of a match (mutateMatch). Demo mode starts from the device preference in
 * settingsStore, and setDemoMode writes it back there.
 */
import { create, createStore, type StateCreator } from 'zustand'
import { createRowId } from '@/data/ids'
import { buildSeed } from '@/data/seed/buildSeed'
import { matchScript } from '@/data/seed/script'
import { formatTodayDate } from '@/rules/format'
import {
  deriveMissingVideoIds,
  emptySet,
  isUntouched,
  mergeMatches,
  normalizeMatch,
  parseEntered,
  sortNewestFirst,
} from '@/rules/match'
import { archiveVideos, insertVideo, moveVideo, patchSet, withoutVideo } from '@/rules/matchOps'
import {
  ARCHIVE_STEPS,
  type DemoMode,
  type EnteredScore,
  type LocalVideo,
  type MatchRecord,
  type MatchResult,
  type RemovedVideo,
  type SetData,
  type VideoAsset,
} from '@/types/match'
import type { VideoScript } from '@/types/video'
import { useSettingsStore } from './settingsStore'

/** Fourteen matches. Dates are days before the day the app loaded. */
export const SEED: MatchRecord[] = buildSeed(new Date())

type MatchFields = Partial<Pick<MatchRecord, 'opponent' | 'event' | 'date'>>

export type MatchState = {
  /** Ids of the seed this store started from. */
  seedIds: ReadonlySet<string>
  mode: DemoMode
  /** Seed matches that changed, and created matches, in the order they were first written. */
  extra: MatchRecord[]
  /** Seed ids deleted while filled. Filled again brings them back. */
  deleted: string[]
  /**
   * Removed videos by id, kept so tags that still point at one line up again
   * when it is added back.
   */
  removedVideos: Record<string, RemovedVideo>
  /** The seed merged with extra, normalized. */
  catalog: MatchRecord[]
  /** What the Matches list shows: newest first, only created ones when empty. */
  matches: MatchRecord[]
  setDemoMode: (mode: DemoMode) => void
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
  updateVideoPosition: (matchId: string, videoId: string, by: -1 | 1) => void
  removeVideo: (matchId: string, videoId: string) => void
  setVideosArchived: (matchId: string) => void
  updateSet: (matchId: string, setId: number, patch: Partial<SetData>) => void
  /** matchId maps to the step that is running. Absent means no job. */
  archiveSteps: Record<string, number>
  /** Starts an archive job. A second call for the same match does nothing. */
  addArchiveJob: (matchId: string) => void
}

const ARCHIVE_STEP_MS = 1100

/** Use demo video: a whole decided match that follows what Details says. */
function demoScriptFor(m: MatchRecord): VideoScript {
  const { me, them } = m.result
  return matchScript(
    Date.now() % 9973,
    me === null || them === null ? null : { me, them },
    m.sets.map((s) => ({ firstServer: s.firstServer, score: parseEntered(s.entered), filmed: true }))
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

type Lists = Pick<MatchState, 'mode' | 'extra' | 'deleted' | 'catalog' | 'matches'>

/** The match a route asks for, or undefined when it is gone or hidden by empty mode. */
export function selectMatch(s: MatchState, id: string): MatchRecord | undefined {
  if (s.mode === 'empty') {
    if (s.seedIds.has(id)) return undefined
    return s.extra.find((m) => m.id === id)
  }
  return s.catalog.find((m) => m.id === id)
}

function matchState(seed: MatchRecord[], initialMode: DemoMode): StateCreator<MatchState> {
  const seedIds: ReadonlySet<string> = new Set(seed.map((s) => s.id))

  /** Recomputes the lists only when what they come from changed, so selectors keep their references. */
  const lists = (prev: Lists | null, mode: DemoMode, extra: MatchRecord[], deleted: string[]): Lists => {
    const catalog =
      prev && prev.extra === extra && prev.deleted === deleted ? prev.catalog : mergeMatches(seed, extra, deleted)
    const matches =
      prev && prev.mode === mode && prev.extra === extra && prev.catalog === catalog
        ? prev.matches
        : sortNewestFirst(mode === 'empty' ? extra.filter((m) => !seedIds.has(m.id)) : catalog, seedIds)
    return { mode, extra, deleted, catalog, matches }
  }

  /**
   * The extra list after fn runs on the latest copy of a match, or null when
   * the match is gone or hidden. An op that throws changes nothing.
   */
  const changed = (
    s: MatchState,
    id: string,
    fn: (current: MatchRecord) => MatchRecord
  ): MatchRecord[] | null => {
    const isSeed = seedIds.has(id)
    if (isSeed && s.mode === 'empty') return null
    const stored = s.extra.find((m) => m.id === id)
    const base = stored ?? (isSeed ? seed.find((m) => m.id === id) : undefined)
    if (!base) return null
    // The first write of a seed starts from its migrated mark, so a saved
    // set stays complete when something else on the match changes.
    const current = stored ? base : normalizeMatch(base)
    let next: MatchRecord
    try {
      next = normalizeMatch(fn(current))
    } catch (error) {
      console.error(`matchStore: change to ${id} failed`, error)
      return null
    }
    return s.extra.some((m) => m.id === id) ? s.extra.map((m) => (m.id === id ? next : m)) : [...s.extra, next]
  }

  return (set, get) => {
    const mutateMatch = (id: string, fn: (current: MatchRecord) => MatchRecord) =>
      set((s) => {
        const extra = changed(s, id, fn)
        return extra ? lists(s, s.mode, extra, s.deleted) : s
      })

    const updateSet = (matchId: string, setId: number, patch: Partial<SetData>) =>
      mutateMatch(matchId, (m) => patchSet(m, setId, patch))

    return {
      seedIds,
      ...lists(null, initialMode, [], []),
      removedVideos: {},
      archiveSteps: {},

      addArchiveJob: (matchId) => {
        if (get().archiveSteps[matchId] !== undefined) return
        set((s) => ({ archiveSteps: { ...s.archiveSteps, [matchId]: 0 } }))
        const tick = () => {
          setTimeout(() => {
            const step = get().archiveSteps[matchId]
            if (step === undefined) return
            const next = step + 1
            if (next < ARCHIVE_STEPS.length) {
              set((s) =>
                s.archiveSteps[matchId] === undefined
                  ? s
                  : { archiveSteps: { ...s.archiveSteps, [matchId]: next } }
              )
              tick()
            } else {
              get().setVideosArchived(matchId)
              set((s) => {
                if (s.archiveSteps[matchId] === undefined) return s
                const archiveSteps = { ...s.archiveSteps }
                delete archiveSteps[matchId]
                return { archiveSteps }
              })
            }
          }, ARCHIVE_STEP_MS)
        }
        tick()
      },

      setDemoMode: (next) => {
        // Filled restores the seed matches, including any that were deleted.
        set((s) => lists(s, next, s.extra, next === 'filled' ? [] : s.deleted))
        useSettingsStore.getState().setDemoMode(next)
      },

      createMatch: () => {
        const created: MatchRecord = {
          id: createRowId('m-new'),
          opponent: '',
          event: '',
          date: formatTodayDate(),
          result: { me: null, them: null },
          videos: [],
          sets: [emptySet(1)],
        }
        set((s) => lists(s, s.mode, [...s.extra, created], s.deleted))
        return created
      },

      deleteMatch: (id) =>
        set((s) => {
          const extra = s.extra.filter((m) => m.id !== id)
          const deleted = seedIds.has(id) && !s.deleted.includes(id) ? [...s.deleted, id] : s.deleted
          return lists(s, s.mode, extra, deleted)
        }),

      removeUntouchedMatches: (exceptId) =>
        set((s) => {
          const drop = (m: MatchRecord) => m.id !== exceptId && !seedIds.has(m.id) && isUntouched(m)
          return s.extra.some(drop) ? lists(s, s.mode, s.extra.filter((m) => !drop(m)), s.deleted) : s
        }),

      updateMatch: (id, patch) => mutateMatch(id, (m) => ({ ...m, ...patch })),

      setResult: (matchId, result) => mutateMatch(matchId, (m) => ({ ...m, result })),

      setEnteredScore: (matchId, setId, entered) => updateSet(matchId, setId, { entered }),

      /**
       * While rallies point at a removed video, the next video added takes its
       * place (same id and position), so those rallies play again. The demo video
       * comes back as it was; a chosen file is trusted to be the same footage.
       */
      addVideo: (matchId, file) =>
        mutateMatch(matchId, (m) => {
          const lostId = deriveMissingVideoIds(m)[0]
          const lost = lostId ? get().removedVideos[lostId] : undefined
          const id = lostId ?? createRowId(`v-${matchId}`)
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
          return insertVideo(m, video, lostId ? (lost?.index ?? 0) : null)
        }),

      mutateMatch,

      updateVideoPosition: (matchId, videoId, by) => mutateMatch(matchId, (m) => moveVideo(m, videoId, by)),

      removeVideo: (matchId, videoId) =>
        set((s) => {
          const seen: { removed?: RemovedVideo } = {}
          const extra = changed(s, matchId, (m) => {
            const index = m.videos.findIndex((v) => v.id === videoId)
            if (index >= 0) seen.removed = { video: m.videos[index], index }
            return withoutVideo(m, videoId)
          })
          if (!extra) return s
          const removedVideos = seen.removed ? { ...s.removedVideos, [videoId]: seen.removed } : s.removedVideos
          return { ...lists(s, s.mode, extra, s.deleted), removedVideos }
        }),

      setVideosArchived: (matchId) => mutateMatch(matchId, archiveVideos),

      updateSet,
    }
  }
}

/** A store of its own, for tests and probes. The app uses useMatchStore. */
export function createMatchStore(seed: MatchRecord[], mode: DemoMode) {
  return createStore<MatchState>()(matchState(seed, mode))
}

export const useMatchStore = create<MatchState>()(matchState(SEED, useSettingsStore.getState().demoMode))

/** The match with this id, re-read whenever it changes. */
export function useMatchRecord(id: string): MatchRecord | undefined {
  return useMatchStore((s) => selectMatch(s, id))
}

/** The archive step running for this match, or null when none is. */
export function useArchiveStep(matchId: string): number | null {
  return useMatchStore((s) => {
    const step = s.archiveSteps[matchId]
    // A finished job reads as its last step until the last tick writes it.
    return step === undefined ? null : Math.min(step, ARCHIVE_STEPS.length - 1)
  })
}
