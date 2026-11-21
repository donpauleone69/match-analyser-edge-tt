/** Best timing on this device. Step 3 folds this into settingsStore. */

import { DEFAULT_BEST_TIMING, type BestTiming } from '@/rules/bestFa'

/** v0.15.0 defaults, including the old minimum. A device that saved only these moves to the new defaults. */
const PREVIOUS_DEFAULT_BEST_TIMING = {
  reaction: 300,
  lead: 200,
  end: 200,
  min: 1000,
}

const TIMING_KEY = 'edge-tt.best-timing'

function timingNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 10000) return fallback
  return Math.round(n)
}

/** True only for the untouched v0.15.0 save. A different minimum is a custom timing and stays. */
function savedIsPreviousDefault(parsed: { reaction?: unknown; lead?: unknown; end?: unknown; min?: unknown }): boolean {
  const prev = PREVIOUS_DEFAULT_BEST_TIMING
  return (
    timingNumber(parsed.reaction, -1) === prev.reaction &&
    timingNumber(parsed.lead, -1) === prev.lead &&
    timingNumber(parsed.end, -1) === prev.end &&
    timingNumber(parsed.min, -1) === prev.min
  )
}

export function loadBestTiming(): BestTiming {
  try {
    const raw = localStorage.getItem(TIMING_KEY)
    if (!raw) return DEFAULT_BEST_TIMING
    const parsed = JSON.parse(raw) as { reaction?: unknown; lead?: unknown; end?: unknown; min?: unknown }
    const loaded: BestTiming = {
      reaction: timingNumber(parsed.reaction, DEFAULT_BEST_TIMING.reaction),
      lead: timingNumber(parsed.lead, DEFAULT_BEST_TIMING.lead),
      end: timingNumber(parsed.end, DEFAULT_BEST_TIMING.end),
    }
    if (!savedIsPreviousDefault(parsed)) return loaded
    saveBestTiming(DEFAULT_BEST_TIMING)
    return DEFAULT_BEST_TIMING
  } catch {
    return DEFAULT_BEST_TIMING
  }
}

export function saveBestTiming(timing: BestTiming) {
  try {
    localStorage.setItem(TIMING_KEY, JSON.stringify(timing))
  } catch {
    // A private browser can refuse the write. The values still apply for this visit.
  }
}

