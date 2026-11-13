/**
 * Mid-point Simple tagging draft — localStorage (separate key from Pass 1).
 * Pure IO helpers — no React.
 */

import type { RallyTimelineState } from './pass1FocusModel'
import { normalizeOffensiveShots } from './simpleTaggingModel'

const STORAGE_PREFIX = 'edge-tt-simple-draft:v1:'

export interface SimpleOpenRallyDraft {
  serveTimestamp: number
  endTimestamp: number
  timeline: RallyTimelineState
  isHighlight: boolean
  offensiveShots: number[]
}

export interface SimpleTaggingDraftSnapshot {
  version: 1
  setId: string
  matchId: string
  setNumber: number
  phase: 'tapping' | 'form'
  contactTimes: number[]
  openRally: SimpleOpenRallyDraft | null
  selectedShot: number | null
  reviewDetailFocused: boolean
  savedAt: string
}

function storageKey(setId: string): string {
  return `${STORAGE_PREFIX}${setId}`
}

function isTimeline(value: unknown): value is RallyTimelineState {
  if (!value || typeof value !== 'object') return false
  const t = value as RallyTimelineState
  return (
    typeof t.shotCount === 'number' &&
    typeof t.noFirstAttack === 'boolean' &&
    (t.fos === null || typeof t.fos === 'number') &&
    (t.end === null || typeof t.end === 'number') &&
    typeof t.shots === 'object' &&
    t.shots !== null
  )
}

function isOpenRally(value: unknown): value is SimpleOpenRallyDraft {
  if (!value || typeof value !== 'object') return false
  const o = value as SimpleOpenRallyDraft
  return (
    typeof o.serveTimestamp === 'number' &&
    typeof o.endTimestamp === 'number' &&
    typeof o.isHighlight === 'boolean' &&
    isTimeline(o.timeline) &&
    Array.isArray(o.offensiveShots) &&
    o.offensiveShots.every((n) => typeof n === 'number')
  )
}

function isSnapshot(value: unknown): value is SimpleTaggingDraftSnapshot {
  if (!value || typeof value !== 'object') return false
  const s = value as SimpleTaggingDraftSnapshot
  if (s.version !== 1) return false
  if (typeof s.setId !== 'string' || typeof s.matchId !== 'string') return false
  if (typeof s.setNumber !== 'number') return false
  if (s.phase !== 'tapping' && s.phase !== 'form') return false
  if (!Array.isArray(s.contactTimes) || !s.contactTimes.every((t) => typeof t === 'number')) {
    return false
  }
  if (s.openRally !== null && !isOpenRally(s.openRally)) return false
  if (s.selectedShot !== null && typeof s.selectedShot !== 'number') return false
  if (typeof s.reviewDetailFocused !== 'boolean') return false
  return true
}

export function simpleDraftHasWork(draft: SimpleTaggingDraftSnapshot): boolean {
  if (draft.phase === 'form' && draft.openRally) return true
  if (draft.phase === 'tapping' && draft.contactTimes.length > 0) return true
  return false
}

export function loadSimpleTaggingDraft(
  setId: string
): SimpleTaggingDraftSnapshot | null {
  try {
    const raw = localStorage.getItem(storageKey(setId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isSnapshot(parsed) || parsed.setId !== setId) return null
    if (!simpleDraftHasWork(parsed)) return null
    if (parsed.openRally) {
      parsed.openRally = {
        ...parsed.openRally,
        offensiveShots: normalizeOffensiveShots(parsed.openRally.offensiveShots),
      }
    }
    return parsed
  } catch {
    return null
  }
}

export function saveSimpleTaggingDraft(snapshot: SimpleTaggingDraftSnapshot): void {
  try {
    if (!simpleDraftHasWork(snapshot)) {
      clearSimpleTaggingDraft(snapshot.setId)
      return
    }
    localStorage.setItem(
      storageKey(snapshot.setId),
      JSON.stringify({
        ...snapshot,
        version: 1 as const,
        savedAt: new Date().toISOString(),
      })
    )
  } catch {
    // Quota / private mode — tagging must keep working.
  }
}

export function clearSimpleTaggingDraft(setId: string): void {
  try {
    localStorage.removeItem(storageKey(setId))
  } catch {
    // ignore
  }
}

/** True when a Simple mid-draft exists for this set (for mode resume). */
export function hasSimpleTaggingDraft(setId: string): boolean {
  return loadSimpleTaggingDraft(setId) !== null
}
