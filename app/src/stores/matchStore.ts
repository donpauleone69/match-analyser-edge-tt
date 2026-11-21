/**
 * The matches on screen. With a database open, that database is loaded before
 * the first paint and every action writes through the repositories. The store
 * stays what the screens read. A refused write is rolled back and a short
 * notice is set. Without a database (tests) this is the in-memory seed.
 * Demo mode starts from the device preference in settingsStore.
 */
import { create, createStore, type StateCreator } from 'zustand'
import { bootDatabase, openMode } from '@/data/boot'
import type { MatchDb } from '@/data/db'
import { createRowId } from '@/data/ids'
import { deriveMatchFileName, exportMatchFile, importMatchFile, serializeMatchFile } from '@/data/matchFile'
import { deleteMatch as deleteMatchRow, loadAll, loadNames, saveDraft, saveMatch } from '@/data/matchRepo'
import { buildSeed } from '@/data/seed/buildSeed'
import { matchScript } from '@/data/seed/script'
import { readStorageInfo, requestPersistentStorage, type StorageInfo } from '@/data/storage'
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
import { afterWrite, draftOnly, invalidateWrites, writeEpoch } from './matchPersistence'
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
import type { EventRow, OpponentRow } from '@/types/db'
import type { VideoScript } from '@/types/video'
import { useSettingsStore } from './settingsStore'

const EMPTY_STORAGE: StorageInfo = { persisted: null, usage: null, quota: null }
const SAVE_NOTICE = 'Could not save'

let askedPersist = false

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
  /** The open database. Null in tests and until boot. */
  db: MatchDb | null
  /** True once a database has been loaded into this store. */
  dbBacked: boolean
  /** Created matches not written yet (G9). */
  pendingIds: string[]
  opponents: OpponentRow[]
  events: EventRow[]
  /** A refused write. Null when there is nothing to say. */
  notice: string | null
  storage: StorageInfo
  dismissNotice: () => void
  /** Match files for every saved match in the open database. */
  exportSavedMatches: () => Promise<{ ok: true; files: { name: string; text: string }[] } | { ok: false }>
  /** One match file. The caller reloads when the batch is done. */
  importSavedMatch: (text: string) => Promise<boolean>
  /** Reads the open database back, keeping matches that were never saved. */
  reloadDb: () => Promise<boolean>
  /** Asks the browser to keep this site's data, then refreshes the storage line. */
  askPersistent: () => Promise<void>
  /** Replaces the lists from a database read. Null means the open failed. */
  hydrateFromDb: (payload: DbHydration | null) => void
}

type DbHydration = {
  mode: DemoMode
  db: MatchDb
  records: MatchRecord[]
  removedVideos: Record<string, RemovedVideo>
  opponents: OpponentRow[]
  events: EventRow[]
  storage: StorageInfo
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
  if (s.dbBacked) return s.catalog.find((m) => m.id === id)
  if (s.mode === 'empty') {
    if (s.seedIds.has(id)) return undefined
    return s.extra.find((m) => m.id === id)
  }
  return s.catalog.find((m) => m.id === id)
}

function dbSlice(seedIds: ReadonlySet<string>, catalog: MatchRecord[]) {
  return {
    catalog,
    matches: sortNewestFirst(catalog, seedIds),
    extra: [] as MatchRecord[],
    deleted: [] as string[],
  }
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
    const queueSave = (before: MatchState, run: (epochAt: number) => Promise<boolean>) => {
      const epochAt = writeEpoch()
      afterWrite(epochAt, async () => {
        if (writeEpoch() !== epochAt) return true
        const ok = await run(epochAt)
        if (!ok) set({ ...before, notice: SAVE_NOTICE })
        return ok
      })
    }

    const saveChange = (
      before: MatchState,
      prev: MatchRecord,
      next: MatchRecord,
      removed: MatchState['removedVideos'],
    ) => {
      const db = before.db
      if (!db) return
      const wasPending = before.pendingIds.includes(next.id)
      if (wasPending && isUntouched(next)) return
      const delta = wasPending ? null : draftOnly(prev, next)
      const namesChanged = prev.opponent !== next.opponent || prev.event !== next.event
      queueSave(before, async (epochAt) => {
        const result = delta
          ? await saveDraft(db, next.id, delta.setId, delta.draft)
          : await saveMatch(db, next, { removedVideos: removed })
        if (!result.ok) return false
        if (writeEpoch() !== epochAt) return true
        if (wasPending) set((s) => ({ pendingIds: s.pendingIds.filter((id) => id !== next.id) }))
        if (!delta && namesChanged) {
          const names = await loadNames(db)
          if (names.ok && writeEpoch() === epochAt) {
            set({ opponents: names.value.opponents, events: names.value.events })
          }
        }
        if (!askedPersist) {
          askedPersist = true
          void get().askPersistent()
        }
        return true
      })
    }

    const applyDb = (s: MatchState, id: string, fn: (current: MatchRecord) => MatchRecord): MatchRecord[] | null => {
      const base = s.catalog.find((m) => m.id === id)
      if (!base) return null
      try {
        const next = normalizeMatch(fn(base))
        return s.catalog.map((m) => (m.id === id ? next : m))
      } catch (error) {
        console.error(`matchStore: change to ${id} failed`, error)
        return null
      }
    }

    const mutateMatch = (id: string, fn: (current: MatchRecord) => MatchRecord) => {
      const before = get()
      if (!before.dbBacked) {
        set((s) => {
          const extra = changed(s, id, fn)
          return extra ? lists(s, s.mode, extra, s.deleted) : s
        })
        return
      }
      const catalog = applyDb(before, id, fn)
      if (!catalog) return
      const prev = before.catalog.find((m) => m.id === id)
      const next = catalog.find((m) => m.id === id)
      if (!prev || !next) return
      set(dbSlice(before.seedIds, catalog))
      saveChange(before, prev, next, before.removedVideos)
    }

    const updateSet = (matchId: string, setId: number, patch: Partial<SetData>) =>
      mutateMatch(matchId, (m) => patchSet(m, setId, patch))

    return {
      seedIds,
      ...lists(null, initialMode, [], []),
      removedVideos: {},
      archiveSteps: {},
      db: null,
      dbBacked: false,
      pendingIds: [],
      opponents: [],
      events: [],
      notice: null,
      storage: EMPTY_STORAGE,
      dismissNotice: () => set({ notice: null }),

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
        useSettingsStore.getState().setDemoMode(next)
        const before = get()
        if (!before.dbBacked) {
          // Filled restores the seed matches, including any that were deleted.
          set((s) => lists(s, next, s.extra, next === 'filled' ? [] : s.deleted))
          return
        }
        invalidateWrites()
        void (async () => {
          const result = await openMode(next, seed, next === 'filled')
          if (!result.ok) {
            set({ notice: SAVE_NOTICE })
            return
          }
          const records = result.value.loaded.matches.map(normalizeMatch)
          set({
            mode: next,
            db: result.value.db,
            dbBacked: true,
            ...dbSlice(seedIds, records),
            removedVideos: result.value.loaded.removedVideos,
            opponents: result.value.loaded.opponents,
            events: result.value.loaded.events,
            pendingIds: [],
          })
        })()
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
        const before = get()
        if (before.dbBacked) {
          // Not written until something is filled in (G9).
          const catalog = [...before.catalog, created]
          set({ ...dbSlice(before.seedIds, catalog), pendingIds: [...before.pendingIds, created.id] })
          return created
        }
        set((s) => lists(s, s.mode, [...s.extra, created], s.deleted))
        return created
      },

      deleteMatch: (id) => {
        const before = get()
        if (!before.dbBacked) {
          set((s) => {
            const extra = s.extra.filter((m) => m.id !== id)
            const deleted = seedIds.has(id) && !s.deleted.includes(id) ? [...s.deleted, id] : s.deleted
            return lists(s, s.mode, extra, deleted)
          })
          return
        }
        const pending = before.pendingIds.includes(id)
        const catalog = before.catalog.filter((m) => m.id !== id)
        set({
          ...dbSlice(before.seedIds, catalog),
          pendingIds: before.pendingIds.filter((item) => item !== id),
        })
        if (pending || !before.db) return
        const db = before.db
        queueSave(before, async () => {
          const result = await deleteMatchRow(db, id)
          return result.ok
        })
      },

      removeUntouchedMatches: (exceptId) => {
        const before = get()
        if (!before.dbBacked) {
          set((s) => {
            const drop = (m: MatchRecord) => m.id !== exceptId && !seedIds.has(m.id) && isUntouched(m)
            return s.extra.some(drop) ? lists(s, s.mode, s.extra.filter((m) => !drop(m)), s.deleted) : s
          })
          return
        }
        const drop = (m: MatchRecord) => m.id !== exceptId && !seedIds.has(m.id) && isUntouched(m)
        const gone = before.catalog.filter(drop)
        if (gone.length === 0) return
        const catalog = before.catalog.filter((m) => !drop(m))
        set({
          ...dbSlice(before.seedIds, catalog),
          pendingIds: before.pendingIds.filter((id) => !gone.some((m) => m.id === id)),
        })
        const saved = gone.filter((m) => !before.pendingIds.includes(m.id))
        if (saved.length === 0 || !before.db) return
        const db = before.db
        queueSave(before, async () => {
          for (const match of saved) {
            const result = await deleteMatchRow(db, match.id)
            if (!result.ok) return false
          }
          return true
        })
      },

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
                sizeBytes: file.sizeBytes,
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

      removeVideo: (matchId, videoId) => {
        const before = get()
        const seen: { removed?: RemovedVideo } = {}
        const strip = (m: MatchRecord) => {
          const index = m.videos.findIndex((v) => v.id === videoId)
          if (index >= 0) seen.removed = { video: m.videos[index], index }
          return withoutVideo(m, videoId)
        }
        if (!before.dbBacked) {
          set((s) => {
            const extra = changed(s, matchId, strip)
            if (!extra) return s
            const removedVideos = seen.removed ? { ...s.removedVideos, [videoId]: seen.removed } : s.removedVideos
            return { ...lists(s, s.mode, extra, s.deleted), removedVideos }
          })
          return
        }
        const catalog = applyDb(before, matchId, strip)
        if (!catalog) return
        const prev = before.catalog.find((m) => m.id === matchId)
        const next = catalog.find((m) => m.id === matchId)
        if (!prev || !next) return
        const removedVideos = seen.removed ? { ...before.removedVideos, [videoId]: seen.removed } : before.removedVideos
        set({ ...dbSlice(before.seedIds, catalog), removedVideos })
        saveChange(before, prev, next, removedVideos)
      },

      setVideosArchived: (matchId) => mutateMatch(matchId, archiveVideos),

      updateSet,

      exportSavedMatches: async () => {
        const db = get().db
        if (!db) return { ok: false }
        const pending = new Set(get().pendingIds)
        const files: { name: string; text: string }[] = []
        for (const match of get().catalog) {
          if (pending.has(match.id)) continue
          const result = await exportMatchFile(db, match.id)
          if (!result.ok) {
            set({ notice: 'Could not export' })
            return { ok: false }
          }
          files.push({ name: deriveMatchFileName(result.value), text: serializeMatchFile(result.value) })
        }
        useSettingsStore.getState().setLastExportAt(Date.now())
        return { ok: true, files }
      },

      importSavedMatch: async (text) => {
        const db = get().db
        if (!db) return false
        const result = await importMatchFile(db, text)
        return result.ok
      },

      reloadDb: async () => {
        const db = get().db
        if (!db) return false
        invalidateWrites()
        const loaded = await loadAll(db)
        if (!loaded.ok) {
          set({ notice: SAVE_NOTICE })
          return false
        }
        const pending = get().catalog.filter((m) => get().pendingIds.includes(m.id))
        const records = [
          ...loaded.value.matches.map(normalizeMatch),
          ...pending.filter((m) => !loaded.value.matches.some((row) => row.id === m.id)),
        ]
        set({
          db,
          dbBacked: true,
          ...dbSlice(get().seedIds, records),
          removedVideos: loaded.value.removedVideos,
          opponents: loaded.value.opponents,
          events: loaded.value.events,
          pendingIds: pending.map((m) => m.id),
        })
        return true
      },

      askPersistent: async () => {
        await requestPersistentStorage()
        set({ storage: await readStorageInfo() })
      },

      hydrateFromDb: (payload) => {
        if (!payload) {
          set({ notice: SAVE_NOTICE })
          return
        }
        set({
          mode: payload.mode,
          db: payload.db,
          dbBacked: true,
          ...dbSlice(seedIds, payload.records),
          removedVideos: payload.removedVideos,
          opponents: payload.opponents,
          events: payload.events,
          pendingIds: [],
          storage: payload.storage,
        })
      },
    }
  }
}

/** A store of its own, for tests and probes. The app uses useMatchStore. */
export function createMatchStore(seed: MatchRecord[], mode: DemoMode) {
  return createStore<MatchState>()(matchState(seed, mode))
}

export const useMatchStore = create<MatchState>()(matchState(SEED, useSettingsStore.getState().demoMode))

/** Opens the database for the saved mode and loads it. Call once, before the first paint. */
export async function bootMatches() {
  const mode = useSettingsStore.getState().demoMode
  const result = await bootDatabase(mode, SEED)
  if (!result.ok) {
    console.error('match database', result.error)
    useMatchStore.getState().hydrateFromDb(null)
    return
  }
  useMatchStore.getState().hydrateFromDb({
    mode,
    db: result.value.db,
    records: result.value.loaded.matches.map(normalizeMatch),
    removedVideos: result.value.loaded.removedVideos,
    opponents: result.value.loaded.opponents,
    events: result.value.loaded.events,
    storage: result.value.storage,
  })
}

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
