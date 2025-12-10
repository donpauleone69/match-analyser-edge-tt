/**
 * Finalize match-level data after Phase 2 completion
 * Calculates sets_before/after and match winner
 */

import { setDb, matchDb } from '@/data'
import { calculateSetsBeforeAfter } from './dataMapping'

export async function finalizeMatchAfterPhase2(
  matchId: string,
  _setId: string,
  player1Id: string,
  player2Id: string
): Promise<void> {
  console.log('[Finalize] Starting match finalization...')
  
  try {
    // 1. Get all sets for this match
    const allSets = await setDb.getByMatchId(matchId)
    console.log(`[Finalize] Found ${allSets.length} sets in match`)
    
    // 2. Calculate sets_before/after for each set
    const setsMap = calculateSetsBeforeAfter(
      allSets.map(s => ({ set_number: s.set_number, winner_id: s.winner_id })),
      player1Id,
      player2Id
    )
    
    // 3. Update each set with its sets_before/after values
    for (const set of allSets) {
      const setsCounts = setsMap.get(set.set_number)
      if (setsCounts) {
        await setDb.update(set.id, {
          player1_sets_before: setsCounts.player1_sets_before,
          player1_sets_after: setsCounts.player1_sets_after,
          player2_sets_before: setsCounts.player2_sets_before,
          player2_sets_after: setsCounts.player2_sets_after,
        })
        console.log(`[Finalize] Set ${set.set_number}: P1 sets ${setsCounts.player1_sets_before}→${setsCounts.player1_sets_after}, P2 sets ${setsCounts.player2_sets_before}→${setsCounts.player2_sets_after}`)
      }
    }
    
    // 4. Calculate match winner
    const player1SetsWon = allSets.filter(s => s.winner_id === player1Id && s.is_tagged).length
    const player2SetsWon = allSets.filter(s => s.winner_id === player2Id && s.is_tagged).length
    const matchWinnerId = player1SetsWon > player2SetsWon 
      ? player1Id 
      : player2SetsWon > player1SetsWon
      ? player2Id
      : null
    
    // 5. Update match record
    await matchDb.update(matchId, {
      player1_sets_final: player1SetsWon,
      player2_sets_final: player2SetsWon,
      winner_id: matchWinnerId,
      match_detail_level: 'shots',
    })
    
    console.log(`[Finalize] ✓ Match finalized: P1=${player1SetsWon} sets, P2=${player2SetsWon} sets, Winner=${matchWinnerId}`)
  } catch (error) {
    console.error('[Finalize] ✗ Failed to finalize match:', error)
    throw error
  }
}

