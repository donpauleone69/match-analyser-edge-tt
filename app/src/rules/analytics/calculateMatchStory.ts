/**
 * Match Story (Match Review — Section A, cards A1 + A2)
 *
 * Hero vs Villain comparison of the score and how points ended.
 *
 * - Only is_scoring rallies count.
 * - Rally winner_id null = Villain won (unnamed opponent).
 * - Anyone who is not the hero is on the Villain side.
 * - Errors = last hitter missed (error_net / error_long / error_wide). NOT lucky.
 * - Winners = point_ending === 'winner'. NOT lucky.
 * - "Points from opponent error" = points won because the opponent missed.
 */

import type { DBMatch, DBSet, DBRally, DBShot } from '@/data'
import { isErrorEnding } from '@/rules/derive/rally/derivePointEndClass'

export type StorySide = 'hero' | 'villain'

export interface MatchStoryInput {
  match: DBMatch
  sets: DBSet[]
  rallies: DBRally[]
  shots: DBShot[]
  /** Usually match.player1_id */
  heroId: string
  /** null = unnamed Villain */
  villainId: string | null
}

/** Count plus its share (0–1) of a denominator. share is 0 when denominator is 0. */
export interface CountShare {
  count: number
  share: number
  denominator: number
  /** Rallies that make up the count (evidence). */
  rallyIds: string[]
  /** Rallies that make up the denominator, when it is its own set of points. */
  denominatorRallyIds?: string[]
}

export interface SidePair<T> {
  hero: T
  villain: T
}

export interface SetScoreLine {
  setNumber: number
  hero: number
  villain: number
}

export interface MatchStoryResult {
  /** True when at least one scoring rally exists */
  hasPointData: boolean
  /** Scoring rallies counted */
  totalPoints: number

  // A1 — The score
  /** Sets won, from the match result (hero-oriented). null when no result is entered. */
  matchScore: SidePair<number> | null
  /** Winner of the match from match.winner_id; null if not decided */
  matchWinner: StorySide | null
  /** Sets that have a score entered, hero-oriented */
  setScores: SetScoreLine[]
  /** Points won (share of all points) */
  pointsWon: SidePair<CountShare>
  /** Points won on own serve (share of points that player served) */
  pointsWonOnServe: SidePair<CountShare>

  // A2 — How points ended
  /** Own errors (share of all points) */
  errors: SidePair<CountShare>
  /** Own winners (share of all points) */
  winners: SidePair<CountShare>
  /** Points won because the opponent missed (share of own points won) */
  pointsFromOpponentError: SidePair<CountShare>
}

export function shareOf(
  rallyIds: string[],
  denominator: number,
  denominatorRallyIds?: string[]
): CountShare {
  const count = rallyIds.length
  return {
    count,
    share: denominator > 0 ? count / denominator : 0,
    denominator,
    rallyIds,
    ...(denominatorRallyIds ? { denominatorRallyIds } : {}),
  }
}

function emptyIds(): SidePair<string[]> {
  return { hero: [], villain: [] }
}

/** Villain side = anyone who is not the hero (null id = unnamed Villain). */
function sideOf(playerId: string | null, heroId: string): StorySide {
  return playerId === heroId ? 'hero' : 'villain'
}

function otherSide(side: StorySide): StorySide {
  return side === 'hero' ? 'villain' : 'hero'
}

/**
 * Who hit the last ball.
 * Prefers the last tagged shot; falls back to the ending + winner
 * (winner/lucky → winner hit last, error → loser hit last), matching deriveRally_winner_id.
 */
function lastHitterSide(
  rally: DBRally,
  lastShotPlayerId: string | null | undefined,
  hasLastShot: boolean,
  winnerSide: StorySide,
  heroId: string
): StorySide {
  if (hasLastShot) return sideOf(lastShotPlayerId ?? null, heroId)
  const winnerHitLast = rally.point_ending === 'winner' || rally.point_ending === 'lucky'
  return winnerHitLast ? winnerSide : otherSide(winnerSide)
}

export function calculateMatchStory(input: MatchStoryInput): MatchStoryResult {
  const { match, sets, rallies, shots, heroId, villainId } = input

  const heroIsPlayer1 =
    heroId === match.player1_id ||
    (villainId !== null && villainId === match.player2_id)

  // Last shot per rally
  const lastShotByRally = new Map<string, DBShot>()
  for (const shot of shots) {
    const current = lastShotByRally.get(shot.rally_id)
    if (!current || shot.shot_index > current.shot_index) {
      lastShotByRally.set(shot.rally_id, shot)
    }
  }

  const scoring = rallies.filter((r) => r.is_scoring)
  const totalPoints = scoring.length

  const pointsWon = emptyIds()
  const served = emptyIds()
  const wonOnServe = emptyIds()
  const errors = emptyIds()
  const winners = emptyIds()

  for (const rally of scoring) {
    // null winner_id on a scoring rally = Villain won
    const winnerSide = sideOf(rally.winner_id, heroId)
    pointsWon[winnerSide].push(rally.id)

    const serverSide = sideOf(rally.server_id, heroId)
    served[serverSide].push(rally.id)
    if (winnerSide === serverSide) wonOnServe[serverSide].push(rally.id)

    const lastShot = lastShotByRally.get(rally.id)
    const hitterSide = lastHitterSide(
      rally,
      lastShot?.player_id,
      lastShot !== undefined,
      winnerSide,
      heroId
    )

    if (isErrorEnding(rally.point_ending)) {
      errors[hitterSide].push(rally.id)
    } else if (rally.point_ending === 'winner') {
      winners[hitterSide].push(rally.id)
    }
    // 'lucky' is neither an error nor a winner
  }

  // Points from opponent error: my points won where the opponent was the one who missed
  const pointsFromOpponentError: SidePair<string[]> = {
    hero: errors.villain,
    villain: errors.hero,
  }

  // A1 — match and set scores (hero-oriented)
  const hasMatchResult =
    match.winner_id !== null ||
    match.player1_sets_final > 0 ||
    match.player2_sets_final > 0

  const matchScore: SidePair<number> | null = hasMatchResult
    ? heroIsPlayer1
      ? { hero: match.player1_sets_final, villain: match.player2_sets_final }
      : { hero: match.player2_sets_final, villain: match.player1_sets_final }
    : null

  const matchWinner: StorySide | null =
    match.winner_id === null ? null : sideOf(match.winner_id, heroId)

  const setScores: SetScoreLine[] = [...sets]
    .filter((s) => s.player1_score_final > 0 || s.player2_score_final > 0)
    .sort((a, b) => a.set_number - b.set_number)
    .map((s) => ({
      setNumber: s.set_number,
      hero: heroIsPlayer1 ? s.player1_score_final : s.player2_score_final,
      villain: heroIsPlayer1 ? s.player2_score_final : s.player1_score_final,
    }))

  return {
    hasPointData: totalPoints > 0,
    totalPoints,
    matchScore,
    matchWinner,
    setScores,
    pointsWon: {
      hero: shareOf(pointsWon.hero, totalPoints),
      villain: shareOf(pointsWon.villain, totalPoints),
    },
    pointsWonOnServe: {
      hero: shareOf(wonOnServe.hero, served.hero.length, served.hero),
      villain: shareOf(wonOnServe.villain, served.villain.length, served.villain),
    },
    errors: {
      hero: shareOf(errors.hero, totalPoints),
      villain: shareOf(errors.villain, totalPoints),
    },
    winners: {
      hero: shareOf(winners.hero, totalPoints),
      villain: shareOf(winners.villain, totalPoints),
    },
    pointsFromOpponentError: {
      hero: shareOf(pointsFromOpponentError.hero, pointsWon.hero.length, pointsWon.hero),
      villain: shareOf(
        pointsFromOpponentError.villain,
        pointsWon.villain.length,
        pointsWon.villain
      ),
    },
  }
}
