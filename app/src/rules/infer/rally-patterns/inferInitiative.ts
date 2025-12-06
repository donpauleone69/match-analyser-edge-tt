/**
 * Initiative Inference (Level 2)
 * 
 * Determines who held initiative in a rally and whether it was stolen.
 * Initiative = first player to attack gains control.
 * Stealing initiative = defender successfully counters and wins.
 */

import type { DBShot, DBRally } from '@/data'

export interface InitiativeAnalysis {
  initiativeHolder: string | null // player_id who attacked first
  initiativeStolen: boolean
  stolenBy: string | null // player_id who stole it
  initiativeShotIndex: number | null // which shot established initiative
  stealShotIndex: number | null // which shot stole it
}

/**
 * Infer who held initiative in a rally.
 * 
 * Initiative holder = first player to use aggressive intent.
 * If opponent counters and wins, initiative was stolen.
 */
export function inferInitiative(
  rally: DBRally,
  shots: DBShot[]
): InitiativeAnalysis {
  if (shots.length === 0 || !rally.winner_id) {
    return {
      initiativeHolder: null,
      initiativeStolen: false,
      stolenBy: null,
      initiativeShotIndex: null,
      stealShotIndex: null,
    }
  }
  
  // Find first aggressive shot (this establishes initiative)
  const firstAggressiveShot = shots.find(s => s.intent === 'aggressive')
  
  if (!firstAggressiveShot) {
    // No aggressive shots - purely defensive rally
    return {
      initiativeHolder: null,
      initiativeStolen: false,
      stolenBy: null,
      initiativeShotIndex: null,
      stealShotIndex: null,
    }
  }
  
  const initiativeHolder = firstAggressiveShot.player_id
  const initiativeShotIndex = firstAggressiveShot.shot_index
  
  // Check if opponent successfully countered (stole initiative)
  // Look for opponent's aggressive shot after initiative shot
  const counterShot = shots
    .filter(s => s.shot_index > initiativeShotIndex)
    .find(s => s.player_id !== initiativeHolder && s.intent === 'aggressive')
  
  if (counterShot && rally.winner_id !== initiativeHolder) {
    // Opponent countered and won = initiative stolen
    return {
      initiativeHolder,
      initiativeStolen: true,
      stolenBy: rally.winner_id,
      initiativeShotIndex,
      stealShotIndex: counterShot.shot_index,
    }
  }
  
  return {
    initiativeHolder,
    initiativeStolen: false,
    stolenBy: null,
    initiativeShotIndex,
    stealShotIndex: null,
  }
}

/**
 * Calculate initiative win rate for a player across multiple rallies.
 * Returns % of rallies where player held initiative and won.
 */
export function calculateInitiativeWinRate(
  playerId: string,
  rallies: DBRally[],
  allShots: DBShot[]
): {
  initiativeCount: number
  initiativeWins: number
  initiativeWinRate: number
  initiativeStolenCount: number
  initiativeStealRate: number
} {
  let initiativeCount = 0
  let initiativeWins = 0
  let initiativeStolenCount = 0
  
  for (const rally of rallies) {
    const rallyShots = allShots.filter(s => s.rally_id === rally.id)
    const analysis = inferInitiative(rally, rallyShots)
    
    if (analysis.initiativeHolder === playerId) {
      initiativeCount++
      if (rally.winner_id === playerId) {
        initiativeWins++
      }
    }
    
    if (analysis.initiativeStolen && analysis.stolenBy === playerId) {
      initiativeStolenCount++
    }
  }
  
  return {
    initiativeCount,
    initiativeWins,
    initiativeWinRate: initiativeCount > 0 ? (initiativeWins / initiativeCount) * 100 : 0,
    initiativeStolenCount,
    initiativeStealRate: rallies.length > 0 ? (initiativeStolenCount / rallies.length) * 100 : 0,
  }
}

