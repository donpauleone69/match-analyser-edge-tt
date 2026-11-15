/** Pure checks on a match that Details, Home and the match header share. */

import {
  derivePhase,
  lastTaggedSetId,
  matchTitle,
  parseEntered,
  resultDiffers,
  resultSetCount,
  setScoresDiffer,
  type MatchRecord,
  type MatchResult,
  type Score,
  type SetData,
} from '@/data/demoStore'

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
export function enteredSetsWon(match: MatchRecord): Score {
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
  if (me === null || them === null || resultSetCount(match) === null) return false
  const won = enteredSetsWon(match)
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
export function setsLostByResult(match: MatchRecord, next: MatchResult): SetData[] {
  if (next.me === null || next.them === null || next.me + next.them === 0) return []
  const keep = Math.max(next.me + next.them, lastTaggedSetId(match))
  return match.sets.filter((s) => s.setId > keep && (hasEntered(s) || s.skipped))
}

/** Saved or open rallies that were tagged on this video. */
export function videoRallyCount(match: MatchRecord, videoId: string): number {
  return match.sets.reduce(
    (n, s) =>
      n +
      s.rallies.filter((r) => r.videoId === videoId).length +
      (s.draft?.videoId === videoId ? 1 : 0),
    0
  )
}

/** Past New with nobody named as the opponent. */
export function needsOpponent(match: MatchRecord): boolean {
  return !match.opponent.trim() && derivePhase(match) !== 'new'
}

/** "New match" stops being true once there is video or tagging. */
export function matchLabel(match: MatchRecord): string {
  const title = matchTitle(match)
  return title === 'New match' && derivePhase(match) !== 'new' ? 'Unnamed match' : title
}
