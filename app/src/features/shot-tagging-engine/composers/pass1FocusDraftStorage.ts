/**
 * Mid-point Pass 1 draft — localStorage so a reload can recover the open rally
 * (contacts mid-tap or form tags mid-edit). Cleared on save / discard / finish.
 * Pure IO helpers — no React.
 */

import type { RallyTimelineState } from './pass1FocusModel'

const STORAGE_PREFIX = 'edge-tt-pass1-draft:v1:'

export interface Pass1OpenRallyDraft {
  serveTimestamp: number
  endTimestamp: number
  timeline: RallyTimelineState
  isHighlight: boolean
}

export interface Pass1FocusDraftSnapshot {
  version: 1
  setId: string
  matchId: string
  setNumber: number
  phase: 'tapping' | 'form'
  contactTimes: number[]
  openRally: Pass1OpenRallyDraft | null
  selectedShot: number | null
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

function isOpenRally(value: unknown): value is Pass1OpenRallyDraft {
  if (!value || typeof value !== 'object') return false
  const o = value as Pass1OpenRallyDraft
  return (
    typeof o.serveTimestamp === 'number' &&
    typeof o.endTimestamp === 'number' &&
    typeof o.isHighlight === 'boolean' &&
    isTimeline(o.timeline)
  )
}

function isSnapshot(value: unknown): value is Pass1FocusDraftSnapshot {
  if (!value || typeof value !== 'object') return false
  const s = value as Pass1FocusDraftSnapshot
  if (s.version !== 1) return false
  if (typeof s.setId !== 'string' || typeof s.matchId !== 'string') return false
  if (typeof s.setNumber !== 'number') return false
  if (s.phase !== 'tapping' && s.phase !== 'form') return false
  if (!Array.isArray(s.contactTimes) || !s.contactTimes.every((t) => typeof t === 'number')) {
    return false
  }
  if (s.openRally !== null && !isOpenRally(s.openRally)) return false
  if (s.selectedShot !== null && typeof s.selectedShot !== 'number') return false
  return true
}

/** True when the snapshot holds recoverable in-progress work. */
export function draftHasWork(draft: Pass1FocusDraftSnapshot): boolean {
  if (draft.phase === 'form' && draft.openRally) return true
  if (draft.phase === 'tapping' && draft.contactTimes.length > 0) return true
  return false
}

export function loadPass1FocusDraft(setId: string): Pass1FocusDraftSnapshot | null {
  try {
    const raw = localStorage.getItem(storageKey(setId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isSnapshot(parsed) || parsed.setId !== setId) return null
    if (!draftHasWork(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export function savePass1FocusDraft(snapshot: Pass1FocusDraftSnapshot): void {
  try {
    if (!draftHasWork(snapshot)) {
      clearPass1FocusDraft(snapshot.setId)
      return
    }
    localStorage.setItem(
      storageKey(snapshot.setId),
      JSON.stringify({ ...snapshot, version: 1 as const, savedAt: new Date().toISOString() })
    )
  } catch {
    // Quota / private mode — tagging must keep working.
  }
}

export function clearPass1FocusDraft(setId: string): void {
  try {
    localStorage.removeItem(storageKey(setId))
  } catch {
    // ignore
  }
}
