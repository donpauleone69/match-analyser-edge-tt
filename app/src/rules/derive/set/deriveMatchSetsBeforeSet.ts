/**
 * Derive match sets won by each side prior to a given set number.
 * Handles Villain wins where winner_id is persisted as null.
 */

import type { DBSet } from '@/data/entities/sets/set.types'

export interface MatchSetScore {
  player1: number
  player2: number
}

export type SetSummaryForMatchSets = Pick<
  DBSet,
  | 'set_number'
  | 'winner_id'
  | 'is_tagged'
  | 'tagging_phase'
  | 'player1_score_final'
  | 'player2_score_final'
  | 'player1_sets_before'
  | 'player2_sets_before'
>

export function deriveMatchSetsBeforeSet(
  sets: readonly SetSummaryForMatchSets[],
  currentSetNumber: number,
  player1Id: string
): MatchSetScore {
  let player1 = 0
  let player2 = 0

  for (const s of sets) {
    if (s.set_number >= currentSetNumber) continue
    if (s.winner_id !== null) {
      if (s.winner_id === player1Id) player1++
      else player2++
    } else if (
      (s.is_tagged || s.tagging_phase === 'phase2_complete') &&
      s.player1_score_final !== s.player2_score_final
    ) {
      if (s.player1_score_final > s.player2_score_final) player1++
      else player2++
    }
  }

  if (player1 === 0 && player2 === 0) {
    const current = sets.find((s) => s.set_number === currentSetNumber)
    if (
      current &&
      (current.player1_sets_before > 0 || current.player2_sets_before > 0)
    ) {
      return {
        player1: current.player1_sets_before,
        player2: current.player2_sets_before,
      }
    }
  }

  return { player1, player2 }
}
