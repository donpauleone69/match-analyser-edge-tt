/**
 * Recompute the running score through a set's rallies.
 * Pure — no React, no IO.
 *
 * Used after a single rally is edited: if its winner changed, every later
 * rally's before/after score shifts. Stored servers are left alone (they are
 * what the video showed), only scores are re-chained.
 *
 * winner_id === player1Id → player 1 scores; any other winner on a scoring
 * rally (including null = unnamed Villain) → player 2 scores.
 */

export interface ScoreChainRally {
  id: string
  rally_index: number
  is_scoring: boolean
  winner_id: string | null
  player1_score_before: number
  player2_score_before: number
  player1_score_after: number
  player2_score_after: number
}

export interface ScoreChainEntry {
  id: string
  player1_score_before: number
  player2_score_before: number
  player1_score_after: number
  player2_score_after: number
  /** True when any of the four scores differs from what is stored */
  changed: boolean
}

export interface ScoreChainResult {
  entries: ScoreChainEntry[]
  final: { player1: number; player2: number }
}

export function deriveRallyScoreChain(input: {
  rallies: ScoreChainRally[]
  player1Id: string
  start?: { player1: number; player2: number }
}): ScoreChainResult {
  const { player1Id } = input
  let p1 = input.start?.player1 ?? 0
  let p2 = input.start?.player2 ?? 0

  const sorted = [...input.rallies].sort((a, b) => a.rally_index - b.rally_index)
  const entries: ScoreChainEntry[] = sorted.map((r) => {
    const before1 = p1
    const before2 = p2
    if (r.is_scoring) {
      if (r.winner_id === player1Id) p1++
      else p2++
    }
    const changed =
      r.player1_score_before !== before1 ||
      r.player2_score_before !== before2 ||
      r.player1_score_after !== p1 ||
      r.player2_score_after !== p2
    return {
      id: r.id,
      player1_score_before: before1,
      player2_score_before: before2,
      player1_score_after: p1,
      player2_score_after: p2,
      changed,
    }
  })

  return { entries, final: { player1: p1, player2: p2 } }
}
