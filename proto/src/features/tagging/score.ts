/** Score, server and set-end rules, ported from the real app (pure). */

import type { Points } from '@/types/match'
import type { Side } from '@/types/rally'
import { otherSide } from './rally'

export const ZERO: Points = { me: 0, them: 0 }

export function addPoint(score: Points, winner: Side): Points {
  return winner === 'me' ? { ...score, me: score.me + 1 } : { ...score, them: score.them + 1 }
}

export function countPoints(winners: Side[]): Points {
  return winners.reduce(addPoint, ZERO)
}

/** Two serves each, then one each from 10 all. */
export function serverAt(firstServer: Side, score: Points): Side {
  const total = score.me + score.them
  if (score.me >= 10 && score.them >= 10) {
    return (total - 20) % 2 === 0 ? firstServer : otherSide(firstServer)
  }
  return Math.floor(total / 2) % 2 === 0 ? firstServer : otherSide(firstServer)
}

/** 11 or more, two clear. Also true of a score play has already passed, such as 12 - 9. */
export function isSetWon(score: Points): boolean {
  return Math.max(score.me, score.them) >= 11 && Math.abs(score.me - score.them) >= 2
}

/**
 * A score a set is allowed to end on.
 * 11 with the other on 9 or less, or both on 10 or more and exactly two clear.
 */
export function isLegalEnd(score: Points): boolean {
  const hi = Math.max(score.me, score.them)
  const lo = Math.min(score.me, score.them)
  if (hi === 11 && lo <= 9) return true
  return lo >= 10 && hi - lo === 2
}

/** One side is ahead, so a short set is saved as ended early. A level score is not. */
export function canSaveEarly(score: Points): boolean {
  return leader(score) !== null
}

export function leader(score: Points): Side | null {
  if (score.me === score.them) return null
  return score.me > score.them ? 'me' : 'them'
}

/** Who served first in a set, given who serves at `score`. */
export function firstServerAt(server: Side, score: Points): Side {
  return serverAt('me', score) === server ? 'me' : 'them'
}

/** The rally at which the set first reaches a winning score, or -1. */
export function setEndIndex(winners: Side[]): number {
  let score = ZERO
  for (let i = 0; i < winners.length; i++) {
    score = addPoint(score, winners[i])
    if (isSetWon(score)) return i
  }
  return -1
}

/**
 * Set over fires on the rule only: the last rally is the first winning score.
 * Counted one point at a time, that score is always a legal end.
 * A Details score is not consulted.
 */
export function setOverOnRule(winners: Side[]): boolean {
  if (winners.length === 0) return false
  return setEndIndex(winners) === winners.length - 1
}

/**
 * The score at the rally that first wins the set. Null when the rallies never
 * get there. Rallies after that win do not change it.
 */
export function scoreAtSetEnd(winners: Side[]): Points | null {
  const end = setEndIndex(winners)
  if (end < 0) return null
  return countPoints(winners.slice(0, end + 1))
}

/** Later sets alternate the first server from set 1. */
export function firstServerForSet(setOneServer: Side, setId: number): Side {
  return setId % 2 === 1 ? setOneServer : otherSide(setOneServer)
}
