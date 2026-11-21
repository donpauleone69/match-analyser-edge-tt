import { useEffect, useSyncExternalStore } from 'react'
import { useDemo } from '@/data/demoStore'

export const ARCHIVE_STEPS = ['Making archive', 'Checking archive', 'Removing original'] as const
const ARCHIVE_STEP_MS = 1100

/**
 * Archive jobs live outside any page, so leaving Details does not cancel one.
 * matchId maps to the step that is running; ARCHIVE_STEPS.length means done
 * and waiting for ArchiveRunner to write it to the match.
 */
const jobs = new Map<string, number>()
const listeners = new Set<() => void>()
let snapshot: ReadonlyMap<string, number> = new Map()

function emit() {
  snapshot = new Map(jobs)
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function tick(matchId: string) {
  setTimeout(() => {
    const step = jobs.get(matchId)
    if (step === undefined) return
    jobs.set(matchId, step + 1)
    emit()
    if (step + 1 < ARCHIVE_STEPS.length) tick(matchId)
  }, ARCHIVE_STEP_MS)
}

export function startArchive(matchId: string) {
  if (jobs.has(matchId)) return
  jobs.set(matchId, 0)
  emit()
  tick(matchId)
}

function clearArchive(matchId: string) {
  if (jobs.delete(matchId)) emit()
}

/** The archive step running for this match, or null when none is. */
export function useArchiveStep(matchId: string): number | null {
  const all = useSyncExternalStore(subscribe, () => snapshot)
  const step = all.get(matchId)
  // A finished job reads as its last step until ArchiveRunner has written it.
  return step === undefined ? null : Math.min(step, ARCHIVE_STEPS.length - 1)
}

/** Mounted once for the whole app: writes each finished archive to its match. */
export function ArchiveRunner() {
  const all = useSyncExternalStore(subscribe, () => snapshot)
  const { archiveVideos } = useDemo()

  useEffect(() => {
    for (const [matchId, step] of all) {
      if (step < ARCHIVE_STEPS.length) continue
      archiveVideos(matchId)
      clearArchive(matchId)
    }
  }, [all, archiveVideos])

  return null
}
