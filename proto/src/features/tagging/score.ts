/** Score, server and set-end rules, ported from the real app (pure). */

import { otherSide, type Side } from './rally'

export type Points = { me: number; them: number }

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

/** 11 or more, two clear. */
export function isSetWon(score: Points): boolean {
  return Math.max(score.me, score.them) >= 11 && Math.abs(score.me - score.them) >= 2
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

/** Later sets alternate the first server from set 1. */
export function firstServerForSet(setOneServer: Side, setId: number): Side {
  return setId % 2 === 1 ? setOneServer : otherSide(setOneServer)
}
