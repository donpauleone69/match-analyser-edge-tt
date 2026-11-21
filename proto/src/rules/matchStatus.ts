/** Pure checks on a match that Details, Home and the match header share. */

import {
  derivePhase,
  formatScore,
  isArchived,
  deriveLastTaggedSetId,
  calculateMatchSetsWon,
  formatMatchTitle,
  parseEntered,
  resultDiffers,
  calculateResultSetCount,
  setScoresDiffer,
  setSettled,
} from './match'
import type { MatchRecord, MatchResult, Score, SetData } from '@/types/match'
import { setInProgress } from './matchOps'
import { setIncomplete } from './marks'

/** Sets needed to win a best of 3, 5 or 7. */
const SETS_TO_WIN = [2, 3, 4]

/** Every way a match can end, grouped by its length. Wins first. */
export const REAL_RESULTS: { label: string; results: Score[] }[] = SETS_TO_WIN.map((n) => {
  const losing = Array.from({ length: n }, (_, k) => k)
  return {
    label: `Best of ${n * 2 - 1}`,
    results: [
      ...losing.map((k) => ({ me: n, them: k })),
      ...losing.reverse().map((k) => ({ me: k, them: n })),
    ],
  }
})

/** A result a best of 3, 5 or 7 can end on. 1 - 1 and 1 - 0 are not. */
export function isRealResult(score: Score): boolean {
  const high = Math.max(score.me, score.them)
  return score.me !== score.them && SETS_TO_WIN.includes(high)
}

/** Sets won by each side, counted from the entered set scores. */
export function calculateEnteredSetsWon(match: MatchRecord): Score {
  const won = { me: 0, them: 0 }
  for (const s of match.sets) {
    const score = parseEntered(s.entered)
    if (!score || score.me === score.them) continue
    won[score.me > score.them ? 'me' : 'them'] += 1
  }
  return won
}

/** The entered set scores cannot add up to the entered result. */
export function enteredScoresMissResult(match: MatchRecord): boolean {
  const { me, them } = match.result
  if (me === null || them === null || calculateResultSetCount(match) === null) return false
  const won = calculateEnteredSetsWon(match)
  return won.me > me || won.them > them
}

/**
 * Tagging disagrees with what was entered: a set score or the result. Shown
 * as a Differs mark outside Details. Nothing else earns the mark.
 */
export function matchDiffers(match: MatchRecord): boolean {
  return match.sets.some(setScoresDiffer) || resultDiffers(match)
}

/** Some tagged rally sits on a video that is still in the match. */
export function hasPlayableRallies(match: MatchRecord): boolean {
  const have = new Set(match.videos.map((v) => v.id))
  return match.sets.some((s) => !s.skipped && s.rallies.some((r) => have.has(r.videoId)))
}

function hasEntered(s: SetData): boolean {
  return s.entered.me !== '' || s.entered.them !== ''
}

/**
 * Sets a new result would stop listing that hold an entered score or a
 * Not filmed mark. Tagged sets are never dropped, so they are not in here.
 */
export function deriveSetsLostByResult(match: MatchRecord, next: MatchResult): SetData[] {
  if (next.me === null || next.them === null || next.me + next.them === 0) return []
  const keep = Math.max(next.me + next.them, deriveLastTaggedSetId(match))
  return match.sets.filter((s) => s.setId > keep && (hasEntered(s) || s.skipped))
}

/** Saved rallies that were tagged on this video. An open rally is not counted. */
export function calculateVideoRallyCount(match: MatchRecord, videoId: string): number {
  return match.sets.reduce(
    (n, s) => n + s.rallies.filter((r) => r.videoId === videoId).length,
    0
  )
}

/** Past New with nobody named as the opponent. */
export function needsOpponent(match: MatchRecord): boolean {
  return !match.opponent.trim() && derivePhase(match) !== 'new'
}

/** "New match" stops being true once there is video or tagging. */
export function formatMatchLabel(match: MatchRecord): string {
  const title = formatMatchTitle(match)
  return title === 'New match' && derivePhase(match) !== 'new' ? 'Unnamed match' : title
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** vs Sam, else the event, else New match until the match has video or tagging. */
export function formatMatchName(match: MatchRecord): string {
  const opponent = match.opponent.trim()
  if (opponent) return `vs ${opponent}`
  const event = match.event.trim()
  if (event) return event
  return derivePhase(match) === 'new' ? 'New match' : 'Unnamed match'
}

/** 11 Nov. The year is added when it is not this year. Empty when there is no date. */
export function formatMatchDate(date: string, today = new Date()): string {
  if (!date) return ''
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day || month < 1 || month > 12) return ''
  const text = `${day} ${MONTHS[month - 1]}`
  return year === today.getFullYear() ? text : `${text} ${year}`
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

/**
 * The same test Details uses before it offers Use tagged result.
 * Every set up to the deciding one is settled, and none of them is incomplete.
 */
export function taggedResultReady(match: MatchRecord): boolean {
  const fromTagging = calculateMatchSetsWon(match)
  if (!isRealResult(fromTagging)) return false
  const deciding = fromTagging.me + fromTagging.them
  return Array.from({ length: deciding }, (_, i) => match.sets.find((s) => s.setId === i + 1)).every(
    (s) => Boolean(s && setSettled(s) && !setIncomplete(s))
  )
}

export type MatchRowStatus = {
  kind: 'no-video' | 'not-tagged' | 'continue' | 'no-result' | 'part' | 'tagged'
  text: string
  setId: number | null
  tab: 'tag' | 'details' | 'insights'
}

/** The one thing in the row's status slot, and where the row opens. */
export function deriveMatchRowStatus(match: MatchRecord): MatchRowStatus {
  const phase = derivePhase(match)
  if (phase === 'new') return { kind: 'no-video', text: 'No video', setId: null, tab: 'tag' }
  if (phase === 'ready') return { kind: 'not-tagged', text: 'Not tagged', setId: null, tab: 'tag' }
  if (phase === 'complete') return { kind: 'tagged', text: 'Tagged', setId: null, tab: 'insights' }
  const open = match.videos.length > 0 && !isArchived(match) ? setInProgress(match) : null
  if (open) return { kind: 'continue', text: `Continue set ${open.setId}`, setId: open.setId, tab: 'tag' }
  const noResult = match.result.me === null || match.result.them === null
  if (noResult && taggedResultReady(match)) {
    return { kind: 'no-result', text: 'No result', setId: null, tab: 'details' }
  }
  return { kind: 'part', text: 'Part tagged', setId: null, tab: 'tag' }
}
