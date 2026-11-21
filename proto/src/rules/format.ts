/** Text for scores, dates, clocks and match titles. No phase logic: that stays in matchStatus. */

import type { MatchRecord, Score } from '@/types/match'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * The title is made from event and opponent; there is no separate name.
 * "Club night vs Sam". With no event it reads "Match vs Sam".
 */
export function formatMatchTitle(match: MatchRecord): string {
  const event = match.event.trim()
  const opponent = match.opponent.trim()
  if (!opponent) return event || 'New match'
  return `${event || 'Match'} vs ${opponent}`
}

export function formatScore(score: Score): string {
  return `${score.me} - ${score.them}`
}

export function formatSize(sizeMb: number): string {
  return sizeMb >= 1000 ? `${(sizeMb / 1000).toFixed(1)} GB` : `${sizeMb} MB`
}

/** Days before today, as YYYY-MM-DD. Zero days is today. */
export function isoDaysBefore(today: Date, days: number): string {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days)
  const two = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
}

/** Today as the date field holds it. A new match starts with it. */
export function formatTodayDate(today = new Date()): string {
  return isoDaysBefore(today, 0)
}

type DayParts = { year: number; month: number; day: number }

function dayParts(iso: string): DayParts | null {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return null
  return { year, month, day }
}

function renderDay(parts: DayParts, today: Date): string {
  const text = `${parts.day} ${MONTHS[parts.month - 1]}`
  return parts.year === today.getFullYear() ? text : `${text} ${parts.year}`
}

/** 11 Nov. The year is added when it is not this year. Empty when there is no date. */
export function formatMatchDate(date: string, today = new Date()): string {
  if (!date) return ''
  const parts = dayParts(date)
  if (!parts || parts.month < 1 || parts.month > 12) return ''
  return renderDay(parts, today)
}

/**
 * The filter chip's date. An empty or unparseable value stays the raw string.
 * A month outside 1-12 is still rendered, which is how the chip always worked.
 */
export function formatChipDate(iso: string, today: Date): string {
  const parts = dayParts(iso)
  if (!parts) return iso
  return renderDay(parts, today)
}

/** Won 3 - 1 or Lost 1 - 3, your sets first. Empty when no result is entered. */
export function formatMatchResultLine(match: MatchRecord): string {
  const { me, them } = match.result
  if (me === null || them === null) return ''
  const score = formatScore({ me, them })
  if (me > them) return `Won ${score}`
  if (them > me) return `Lost ${score}`
  return score
}

/** Date, result, then the event when the name is the opponent. The event is last so it truncates. */
export function formatMatchRowLine(match: MatchRecord): string {
  const event = match.opponent.trim() ? match.event.trim() : ''
  return [formatMatchDate(match.date), formatMatchResultLine(match), event].filter(Boolean).join(' · ')
}

export function formatClock(seconds: number, tenths = false): string {
  // Whole tenths first, so 7.3 never reads as 7.2 through float error.
  const t = Math.floor(Math.max(0, seconds) * 10 + 1e-6)
  const m = Math.floor(t / 600)
  const whole = Math.floor((t % 600) / 10)
  const base = `${String(m).padStart(2, '0')}:${String(whole).padStart(2, '0')}`
  return tenths ? `${base}.${t % 10}` : base
}
