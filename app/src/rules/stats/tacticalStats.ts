/**
 * Tactical Statistics (3rd/4th Ball, Initiative, Opening Quality)
 * Medium-High accuracy (70-90%) - requires inference
 */

import type { DBRally, DBShot } from '@/data'
import { inferInitiative } from './inferInitiative'
import { inferOpeningQuality } from './inferTacticalPatterns'

export interface TacticalStats {
  // 3rd ball (server's opening attack)
  thirdBallAttacks: number
  thirdBallWinners: number
  thirdBallWinnerRate: number // %
  thirdBallForcedErrors: number
  thirdBallForcedErrorRate: number // %
  thirdBallSuccess: number
  thirdBallSuccessRate: number // %
  
  // 4th ball (receiver's counter/block)
  fourthBallCounterAttacks: number
  fourthBallCounterSuccess: number
  fourthBallCounterSuccessRate: number // %
  fourthBallBlocks: number
  fourthBallBlockSuccess: number
  fourthBallBlockSuccessRate: number // %
  
  // Opening quality
  excellentOpenings: number
  goodOpenings: number
  poorOpenings: number
  openingQualityAverage: number // 0-100
  
  // Initiative
  initiativeCount: number
  initiativeWins: number
  initiativeWinRate: number // %
  initiativeStolenCount: number
  initiativeStealRate: number // %
}

/**
 * Calculate tactical stats for a player.
 */
export function calculateTacticalStats(
  playerId: string,
  rallies: DBRally[],
  allShots: DBShot[]
): TacticalStats {
  const scoringRallies = rallies.filter(r => r.is_scoring)
  
  // 3rd ball stats (player is server, shot_index = 3)
  const thirdBallShots = allShots.filter(s =>
    s.shot_index === 3 &&
    s.player_id === playerId
  )
  
  const thirdBallAttacks = thirdBallShots.filter(s => s.intent === 'aggressive')
  const thirdBallWinners = thirdBallShots.filter(s => s.rally_end_role === 'winner')
  const thirdBallWinnerRate = thirdBallAttacks.length > 0
    ? (thirdBallWinners.length / thirdBallAttacks.length) * 100
    : 0
  
  // Forced errors: 3rd ball was good, opponent's 4th ball is error
  const thirdBallForcedErrors = thirdBallShots.filter(s => {
    if (s.shot_result !== 'good') return false
    
    const fourthBall = allShots.find(shot =>
      shot.rally_id === s.rally_id &&
      shot.shot_index === 4 &&
      shot.player_id !== playerId
    )
    
    return fourthBall && (
      fourthBall.rally_end_role === 'forced_error' ||
      fourthBall.rally_end_role === 'unforced_error' ||
      fourthBall.shot_result === 'in_net' ||
      fourthBall.shot_result === 'missed_long'
    )
  })
  
  const thirdBallForcedErrorRate = thirdBallAttacks.length > 0
    ? (thirdBallForcedErrors.length / thirdBallAttacks.length) * 100
    : 0
  
  // Success = winner OR forced error OR rally won
  const thirdBallSuccess = thirdBallShots.filter(s => {
    const rally = rallies.find(r => r.id === s.rally_id)
    return (
      s.rally_end_role === 'winner' ||
      thirdBallForcedErrors.some(fe => fe.id === s.id) ||
      (rally && rally.winner_id === playerId)
    )
  })
  
  const thirdBallSuccessRate = thirdBallAttacks.length > 0
    ? (thirdBallSuccess.length / thirdBallAttacks.length) * 100
    : 0
  
  // 4th ball stats (player is receiver, shot_index = 4)
  const fourthBallShots = allShots.filter(s =>
    s.shot_index === 4 &&
    s.player_id === playerId
  )
  
  const fourthBallCounterAttacks = fourthBallShots.filter(s => s.intent === 'aggressive')
  const fourthBallCounterSuccess = fourthBallCounterAttacks.filter(s => {
    const rally = rallies.find(r => r.id === s.rally_id)
    return (
      s.rally_end_role === 'winner' ||
      s.shot_result === 'good' ||
      (rally && rally.winner_id === playerId)
    )
  })
  
  const fourthBallCounterSuccessRate = fourthBallCounterAttacks.length > 0
    ? (fourthBallCounterSuccess.length / fourthBallCounterAttacks.length) * 100
    : 0
  
  const fourthBallBlocks = fourthBallShots.filter(s =>
    s.intent === 'defensive' || s.intent === 'neutral'
  )
  
  const fourthBallBlockSuccess = fourthBallBlocks.filter(s => {
    const rally = rallies.find(r => r.id === s.rally_id)
    return (
      s.shot_result === 'good' ||
      s.shot_result === 'average' ||
      (rally && rally.winner_id === playerId)
    )
  })
  
  const fourthBallBlockSuccessRate = fourthBallBlocks.length > 0
    ? (fourthBallBlockSuccess.length / fourthBallBlocks.length) * 100
    : 0
  
  // Opening quality (when player is server)
  const serverRallies = scoringRallies.filter(r => r.server_id === playerId)
  let excellentOpenings = 0
  let goodOpenings = 0
  let poorOpenings = 0
  
  for (const rally of serverRallies) {
    const thirdBall = allShots.find(s =>
      s.rally_id === rally.id && s.shot_index === 3 && s.player_id === playerId
    )
    const fourthBall = allShots.find(s =>
      s.rally_id === rally.id && s.shot_index === 4 && s.player_id !== playerId
    )
    
    if (thirdBall) {
      const quality = inferOpeningQuality(thirdBall, fourthBall || null)
      if (quality === 'excellent') excellentOpenings++
      else if (quality === 'good') goodOpenings++
      else if (quality === 'poor') poorOpenings++
    }
  }
  
  const totalOpenings = excellentOpenings + goodOpenings + poorOpenings
  const openingQualityAverage = totalOpenings > 0
    ? ((excellentOpenings * 100 + goodOpenings * 50 + poorOpenings * 0) / totalOpenings)
    : 0
  
  // Initiative stats
  let initiativeCount = 0
  let initiativeWins = 0
  let initiativeStolenCount = 0
  
  for (const rally of scoringRallies) {
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
  
  const initiativeWinRate = initiativeCount > 0
    ? (initiativeWins / initiativeCount) * 100
    : 0
  
  const initiativeStealRate = scoringRallies.length > 0
    ? (initiativeStolenCount / scoringRallies.length) * 100
    : 0
  
  return {
    thirdBallAttacks: thirdBallAttacks.length,
    thirdBallWinners: thirdBallWinners.length,
    thirdBallWinnerRate,
    thirdBallForcedErrors: thirdBallForcedErrors.length,
    thirdBallForcedErrorRate,
    thirdBallSuccess: thirdBallSuccess.length,
    thirdBallSuccessRate,
    fourthBallCounterAttacks: fourthBallCounterAttacks.length,
    fourthBallCounterSuccess: fourthBallCounterSuccess.length,
    fourthBallCounterSuccessRate,
    fourthBallBlocks: fourthBallBlocks.length,
    fourthBallBlockSuccess: fourthBallBlockSuccess.length,
    fourthBallBlockSuccessRate,
    excellentOpenings,
    goodOpenings,
    poorOpenings,
    openingQualityAverage,
    initiativeCount,
    initiativeWins,
    initiativeWinRate,
    initiativeStolenCount,
    initiativeStealRate,
  }
}

