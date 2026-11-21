/**
 * Device preferences. Each one is read from browser storage when the app
 * starts and written back by its action. A storage that refuses (a private
 * browser, say) leaves the default or the value for this visit.
 */
import { create } from 'zustand'
import { DEFAULT_BEST_TIMING, type BestTiming } from '@/rules/bestFa'
import { DEFAULT_INSIGHTS_FILTERS, migrateFilters, type InsightsFilters, type SavedFilters } from '@/rules/filters'
import type { Handedness } from '@/types/db'
import type { DemoMode } from '@/types/match'
import { DEFAULT_MATCH_LIST_FILTERS, MATCH_STATUSES, type MatchListFilters, type MatchStatus } from '@/types/filters'
import { DEFAULT_THEME, THEME_PACKS, type ThemeId } from '@/types/theme'

const THEME_KEY = 'proto-theme'
const DEMO_MODE_KEY = 'proto-demo-mode'
const BEST_TIMING_KEY = 'edge-tt.best-timing'
const TEST_SPEED_KEY = 'proto-test-speed'
const MATCHES_FILTERS_KEY = 'proto-matches-filters'
const INSIGHTS_FILTERS_KEY = 'proto-insights-filters'

/** Every browser storage key this store reads. Old-storage cleanup must keep them. */
export const SETTINGS_STORAGE_KEYS = {
  local: [THEME_KEY, DEMO_MODE_KEY, BEST_TIMING_KEY, TEST_SPEED_KEY],
  session: [MATCHES_FILTERS_KEY, INSIGHTS_FILTERS_KEY],
} as const

function write(storage: () => Storage, key: string, value: string) {
  try {
    storage().setItem(key, value)
  } catch {
    /* ignore */
  }
}

const local = () => localStorage
const session = () => sessionStorage

function isThemeId(value: string | null): value is ThemeId {
  return THEME_PACKS.some((pack) => pack.id === value)
}

function readTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (isThemeId(stored)) return stored
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME
}

function readDemoMode(): DemoMode {
  try {
    const v = localStorage.getItem(DEMO_MODE_KEY)
    if (v === 'empty' || v === 'filled') return v
  } catch {
    /* ignore */
  }
  return 'filled'
}

/** v0.15.0 defaults, including the old minimum. A device that saved only these moves to the new defaults. */
const PREVIOUS_DEFAULT_BEST_TIMING = {
  reaction: 300,
  lead: 200,
  end: 200,
  min: 1000,
}

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

function writeBestTiming(timing: BestTiming) {
  // A private browser can refuse the write. The values still apply for this visit.
  write(local, BEST_TIMING_KEY, JSON.stringify(timing))
}

function readBestTiming(): BestTiming {
  try {
    const raw = localStorage.getItem(BEST_TIMING_KEY)
    if (!raw) return DEFAULT_BEST_TIMING
    const parsed = JSON.parse(raw) as { reaction?: unknown; lead?: unknown; end?: unknown; min?: unknown }
    const loaded: BestTiming = {
      reaction: timingNumber(parsed.reaction, DEFAULT_BEST_TIMING.reaction),
      lead: timingNumber(parsed.lead, DEFAULT_BEST_TIMING.lead),
      end: timingNumber(parsed.end, DEFAULT_BEST_TIMING.end),
    }
    if (!savedIsPreviousDefault(parsed)) return loaded
    writeBestTiming(DEFAULT_BEST_TIMING)
    return DEFAULT_BEST_TIMING
  } catch {
    return DEFAULT_BEST_TIMING
  }
}

/** Test-only clock speed: a number from 2 to 16 set before the page loads, otherwise 1. */
function readTestSpeed(): number {
  try {
    const n = Number(localStorage.getItem(TEST_SPEED_KEY))
    if (n >= 2 && n <= 16) return n
  } catch {
    /* no storage */
  }
  return 1
}

function readMatchesFilters(): MatchListFilters {
  try {
    const raw = sessionStorage.getItem(MATCHES_FILTERS_KEY)
    if (!raw) return DEFAULT_MATCH_LIST_FILTERS
    const parsed = JSON.parse(raw) as Partial<MatchListFilters> & { tournament?: string }
    const status = MATCH_STATUSES.includes(parsed.status as MatchStatus)
      ? (parsed.status as MatchStatus)
      : 'Any'
    return {
      opponent: parsed.opponent || 'Any',
      event: parsed.event || parsed.tournament || 'Any',
      status,
    }
  } catch {
    return DEFAULT_MATCH_LIST_FILTERS
  }
}

function readInsightsFilters(): InsightsFilters {
  try {
    const raw = sessionStorage.getItem(INSIGHTS_FILTERS_KEY)
    if (!raw) return DEFAULT_INSIGHTS_FILTERS
    return migrateFilters(JSON.parse(raw) as SavedFilters)
  } catch {
    return DEFAULT_INSIGHTS_FILTERS
  }
}

export type SettingsState = {
  theme: ThemeId
  demoMode: DemoMode
  bestTiming: BestTiming
  /** Read once; nothing in the app writes it. */
  testSpeed: number
  matchesFilters: MatchListFilters
  insightsFilters: InsightsFilters
  /** No writer and no storage key until phase 10. */
  myHandedness: Handedness | null
  setTheme: (theme: ThemeId) => void
  setDemoMode: (mode: DemoMode) => void
  setBestTiming: (timing: BestTiming) => void
  setMatchesFilters: (filters: MatchListFilters) => void
  setInsightsFilters: (filters: InsightsFilters) => void
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  theme: readTheme(),
  demoMode: readDemoMode(),
  bestTiming: readBestTiming(),
  testSpeed: readTestSpeed(),
  matchesFilters: readMatchesFilters(),
  insightsFilters: readInsightsFilters(),
  myHandedness: null,
  setTheme: (theme) => {
    set({ theme })
    write(local, THEME_KEY, theme)
  },
  setDemoMode: (demoMode) => {
    set({ demoMode })
    write(local, DEMO_MODE_KEY, demoMode)
  },
  setBestTiming: (bestTiming) => {
    set({ bestTiming })
    writeBestTiming(bestTiming)
  },
  setMatchesFilters: (matchesFilters) => {
    set({ matchesFilters })
    write(session, MATCHES_FILTERS_KEY, JSON.stringify(matchesFilters))
  },
  setInsightsFilters: (insightsFilters) => {
    set({ insightsFilters })
    write(session, INSIGHTS_FILTERS_KEY, JSON.stringify(insightsFilters))
  },
}))
