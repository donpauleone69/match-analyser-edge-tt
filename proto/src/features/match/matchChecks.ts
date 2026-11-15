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

/** Both sides picked and equal. A match cannot end level. */
export function isLevelResult(result: MatchResult): boolean {
  return result.me !== null && result.them !== null && result.me === result.them
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

/** Any score or result mismatch. Shown as a Differs mark outside Details. */
export function matchDiffers(match: MatchRecord): boolean {
  return (
    match.sets.some(setScoresDiffer) || resultDiffers(match) || enteredScoresMissResult(match)
  )
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
