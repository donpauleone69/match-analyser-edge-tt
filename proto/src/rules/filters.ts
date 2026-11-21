/** Which matches a filter keeps, and the labels for that filter. Pure. */

import type { MatchRecord } from '@/types/match'

export type InsightsFilters = {
  dates: string
  from: string
  to: string
  opponent: string
  event: string
}

export const DATE_CHOICES = ['Any', 'Last 5 matches', 'Last 30 days', 'Last 3 months', 'Last 12 months', 'From and to'] as const

export const DEFAULT_INSIGHTS_FILTERS: InsightsFilters = {
  dates: 'Any',
  from: '',
  to: '',
  opponent: 'Any',
  event: 'Any',
}

export type SavedFilters = Partial<InsightsFilters> & { matches?: string; tournament?: string }

/** An old Matches picker folds into Dates. An old Tournament value is Event. */
export function migrateFilters(saved: SavedFilters): InsightsFilters {
  let dates = saved.dates ?? 'Any'
  if (saved.matches === 'Last 3') dates = 'Last 5 matches'
  else if (saved.matches === 'This month') dates = 'Last 30 days'
  if (dates === 'This week') dates = 'Last 30 days'
  if (!DATE_CHOICES.includes(dates as (typeof DATE_CHOICES)[number])) dates = 'Any'
  return {
    dates,
    from: saved.from ?? '',
    to: saved.to ?? '',
    opponent: saved.opponent && saved.opponent !== 'All' ? saved.opponent : 'Any',
    event: saved.event ?? saved.tournament ?? 'Any',
  }
}

const dayStamp = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function todayStamp(today: Date): number {
  return Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
}

function shiftDays(today: Date, days: number): number {
  return Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - days)
}

function shiftMonths(today: Date, months: number): number {
  return Date.UTC(today.getFullYear(), today.getMonth() - months, today.getDate())
}

function newestFirst(matches: MatchRecord[]): MatchRecord[] {
  return [...matches].sort((a, b) => {
    if (!a.date !== !b.date) return a.date ? 1 : -1
    return b.date.localeCompare(a.date)
  })
}

/**
 * The matches a filter keeps. Dates count back from today. A match with no
 * date is kept only by Any and by Last 5 matches, where it counts as newest.
 */
export function filterMatches(matches: MatchRecord[], f: InsightsFilters, today = new Date()): MatchRecord[] {
  let out = matches
  if (f.opponent !== 'Any') out = out.filter((m) => m.opponent.trim() === f.opponent)
  if (f.event !== 'Any') out = out.filter((m) => m.event.trim() === f.event)
  if (f.dates === 'Any') return out
  if (f.dates === 'Last 5 matches') {
    const last = new Set(newestFirst(out).slice(0, 5).map((m) => m.id))
    return out.filter((m) => last.has(m.id))
  }
  if (f.dates === 'From and to') {
    const from = f.from ? dayStamp(f.from) : null
    const to = f.to ? dayStamp(f.to) : null
    return out.filter((m) => {
      if (!m.date) return false
      const day = dayStamp(m.date)
      if (from !== null && day < from) return false
      if (to !== null && day > to) return false
      return true
    })
  }
  const todayDay = todayStamp(today)
  const since =
    f.dates === 'Last 30 days'
      ? shiftDays(today, 30)
      : f.dates === 'Last 3 months'
        ? shiftMonths(today, 3)
        : f.dates === 'Last 12 months'
          ? shiftMonths(today, 12)
          : null
  if (since === null) return out
  return out.filter((m) => m.date && dayStamp(m.date) >= since && dayStamp(m.date) <= todayDay)
}

/** Opponents and events to pick from: the ones the given matches have. */
export function filterChoices(matches: MatchRecord[]): { opponents: string[]; events: string[] } {
  const unique = (values: string[]) => [...new Set(values.map((v) => v.trim()).filter(Boolean))]
  return {
    opponents: unique(matches.map((m) => m.opponent)),
    events: unique(matches.map((m) => m.event)),
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function chipDate(iso: string, today: Date): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  const text = `${day} ${MONTHS[month - 1]}`
  return year === today.getFullYear() ? text : `${text} ${year}`
}

export function datesChip(filters: InsightsFilters, today = new Date()): string | null {
  if (filters.dates === 'Any') return null
  if (filters.dates !== 'From and to') return `Dates: ${filters.dates}`
  const from = filters.from ? chipDate(filters.from, today) : ''
  const to = filters.to ? chipDate(filters.to, today) : ''
  if (from && to) return `Dates: ${from} to ${to}`
  if (from) return `Dates: from ${from}`
  if (to) return `Dates: to ${to}`
  return 'Dates: From and to'
}

export function activeFilterLabels(filters: InsightsFilters, today = new Date()): string[] {
  return [
    datesChip(filters, today),
    filters.opponent !== 'Any' ? `Opponent: ${filters.opponent}` : null,
    filters.event !== 'Any' ? `Event: ${filters.event}` : null,
  ].filter(Boolean) as string[]
}

export function filterIsSet(filters: InsightsFilters): boolean {
  return filters.dates !== 'Any' || filters.opponent !== 'Any' || filters.event !== 'Any'
}
