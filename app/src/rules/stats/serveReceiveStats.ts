/**
 * Serve & Receive Statistics
 * High accuracy (90-100%) - direct from captured data
 */

import type { DBRally, DBShot } from '@/data'

export interface ServeStats {
  // Overall
  servesAttempted: number
  serveWins: number
  serveLosses: number
  serveWinRate: number // %
  serveFaults: number
  serveFaultRate: number // %
  
  // By spin family
  bySpinFamily: Record<string, {
    count: number
    wins: number
    winRate: number
  }>
  
  // By length
  byLength: Record<string, {
    count: number
    wins: number
    winRate: number
  }>
  
  // By score situation
  byScoreSituation: {
    normal: { count: number; wins: number; winRate: number }
    clutch: { count: number; wins: number; winRate: number } // 9-9+
    gamePoint: { count: number; wins: number; winRate: number }
  }
}

export interface ReceiveStats {
  // Overall
  receivesAttempted: number
  receiveWins: number
  receiveLosses: number
  receiveWinRate: number // %
  receiveErrors: number
  receiveErrorRate: number // %
  
  // Aggressive receives
  aggressiveReceives: number
  aggressiveReceiveSuccessRate: number
  
  // By opponent spin
  vsUnderSpin: { count: number; wins: number; errors: number; winRate: number }
  vsTopSpin: { count: number; wins: number; errors: number; winRate: number }
  vsSideSpin: { count: number; wins: number; errors: number; winRate: number }
  vsNoSpin: { count: number; wins: number; errors: number; winRate: number }
}

/**
 * Calculate serve statistics for a player.
 */
export function calculateServeStats(
  playerId: string,
  rallies: DBRally[],
  allShots: DBShot[]
): ServeStats {
  const serveRallies = rallies.filter(r => r.is_scoring && r.server_id === playerId)
  const serves = allShots.filter(s => s.shot_index === 1 && s.player_id === playerId)
  
  const servesAttempted = serveRallies.length
  const serveWins = serveRallies.filter(r => r.winner_id === playerId).length
  const serveLosses = servesAttempted - serveWins
  const serveWinRate = servesAttempted > 0 ? (serveWins / servesAttempted) * 100 : 0
  
  const serveFaults = serveRallies.filter(r => r.point_end_type === 'serviceFault').length
  const serveFaultRate = servesAttempted > 0 ? (serveFaults / servesAttempted) * 100 : 0
  
  // By spin family
  const bySpinFamily: Record<string, { count: number; wins: number; winRate: number }> = {}
  
  for (const serve of serves) {
    const spinFamily = serve.serve_spin_family || 'unknown'
    if (!bySpinFamily[spinFamily]) {
      bySpinFamily[spinFamily] = { count: 0, wins: 0, winRate: 0 }
    }
    
    bySpinFamily[spinFamily].count++
    
    const rally = rallies.find(r => r.id === serve.rally_id)
    if (rally && rally.winner_id === playerId) {
      bySpinFamily[spinFamily].wins++
    }
  }
  
  for (const spin in bySpinFamily) {
    const stats = bySpinFamily[spin]
    stats.winRate = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0
  }
  
  // By length
  const byLength: Record<string, { count: number; wins: number; winRate: number }> = {}
  
  for (const serve of serves) {
    const length = serve.shot_length || 'unknown'
    if (!byLength[length]) {
      byLength[length] = { count: 0, wins: 0, winRate: 0 }
    }
    
    byLength[length].count++
    
    const rally = rallies.find(r => r.id === serve.rally_id)
    if (rally && rally.winner_id === playerId) {
      byLength[length].wins++
    }
  }
  
  for (const length in byLength) {
    const stats = byLength[length]
    stats.winRate = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0
  }
  
  // By score situation
  const normalServes: DBRally[] = []
  const clutchServes: DBRally[] = []
  const gamePointServes: DBRally[] = []
  
  for (const rally of serveRallies) {
    const p1ScoreBefore = rally.player1_score_after - (rally.winner_id === rally.server_id ? 1 : 0)
    const p2ScoreBefore = rally.player2_score_after - (rally.winner_id === rally.receiver_id ? 1 : 0)
    
    const isGamePoint = (p1ScoreBefore >= 10 && p1ScoreBefore >= p2ScoreBefore - 1) ||
                        (p2ScoreBefore >= 10 && p2ScoreBefore >= p1ScoreBefore - 1)
    const isClutch = p1ScoreBefore >= 9 || p2ScoreBefore >= 9
    
    if (isGamePoint) {
      gamePointServes.push(rally)
    } else if (isClutch) {
      clutchServes.push(rally)
    } else {
      normalServes.push(rally)
    }
  }
  
  const byScoreSituation = {
    normal: {
      count: normalServes.length,
      wins: normalServes.filter(r => r.winner_id === playerId).length,
      winRate: normalServes.length > 0 
        ? (normalServes.filter(r => r.winner_id === playerId).length / normalServes.length) * 100 
        : 0,
    },
    clutch: {
      count: clutchServes.length,
      wins: clutchServes.filter(r => r.winner_id === playerId).length,
      winRate: clutchServes.length > 0
        ? (clutchServes.filter(r => r.winner_id === playerId).length / clutchServes.length) * 100
        : 0,
    },
    gamePoint: {
      count: gamePointServes.length,
      wins: gamePointServes.filter(r => r.winner_id === playerId).length,
      winRate: gamePointServes.length > 0
        ? (gamePointServes.filter(r => r.winner_id === playerId).length / gamePointServes.length) * 100
        : 0,
    },
  }
  
  return {
    servesAttempted,
    serveWins,
    serveLosses,
    serveWinRate,
    serveFaults,
    serveFaultRate,
    bySpinFamily,
    byLength,
    byScoreSituation,
  }
}

/**
 * Calculate receive statistics for a player.
 */
export function calculateReceiveStats(
  playerId: string,
  rallies: DBRally[],
  allShots: DBShot[]
): ReceiveStats {
  const receiveRallies = rallies.filter(r => r.is_scoring && r.receiver_id === playerId)
  const receives = allShots.filter(s => s.shot_index === 2 && s.player_id === playerId)
  
  const receivesAttempted = receiveRallies.length
  const receiveWins = receiveRallies.filter(r => r.winner_id === playerId).length
  const receiveLosses = receivesAttempted - receiveWins
  const receiveWinRate = receivesAttempted > 0 ? (receiveWins / receivesAttempted) * 100 : 0
  
  const receiveErrors = receiveRallies.filter(r => r.point_end_type === 'receiveError').length
  const receiveErrorRate = receivesAttempted > 0 ? (receiveErrors / receivesAttempted) * 100 : 0
  
  // Aggressive receives
  const aggressiveReceives = receives.filter(r => r.intent === 'aggressive')
  const aggressiveSuccesses = aggressiveReceives.filter(r => {
    const rally = rallies.find(ra => ra.id === r.rally_id)
    return rally && (rally.winner_id === playerId || r.shot_result === 'good')
  })
  const aggressiveReceiveSuccessRate = aggressiveReceives.length > 0
    ? (aggressiveSuccesses.length / aggressiveReceives.length) * 100
    : 0
  
  // By opponent serve spin
  const vsUnderSpin = { count: 0, wins: 0, errors: 0, winRate: 0 }
  const vsTopSpin = { count: 0, wins: 0, errors: 0, winRate: 0 }
  const vsSideSpin = { count: 0, wins: 0, errors: 0, winRate: 0 }
  const vsNoSpin = { count: 0, wins: 0, errors: 0, winRate: 0 }
  
  for (const receive of receives) {
    const rally = rallies.find(r => r.id === receive.rally_id)
    if (!rally) continue
    
    // Find opponent's serve
    const serve = allShots.find(s =>
      s.rally_id === receive.rally_id &&
      s.shot_index === 1 &&
      s.player_id !== playerId
    )
    
    if (!serve || !serve.serve_spin_family) continue
    
    let stats
    if (serve.serve_spin_family === 'under') stats = vsUnderSpin
    else if (serve.serve_spin_family === 'top') stats = vsTopSpin
    else if (serve.serve_spin_family === 'side') stats = vsSideSpin
    else if (serve.serve_spin_family === 'no_spin') stats = vsNoSpin
    else continue
    
    stats.count++
    if (rally.winner_id === playerId) {
      stats.wins++
    }
    if (rally.point_end_type === 'receiveError') {
      stats.errors++
    }
  }
  
  vsUnderSpin.winRate = vsUnderSpin.count > 0 ? (vsUnderSpin.wins / vsUnderSpin.count) * 100 : 0
  vsTopSpin.winRate = vsTopSpin.count > 0 ? (vsTopSpin.wins / vsTopSpin.count) * 100 : 0
  vsSideSpin.winRate = vsSideSpin.count > 0 ? (vsSideSpin.wins / vsSideSpin.count) * 100 : 0
  vsNoSpin.winRate = vsNoSpin.count > 0 ? (vsNoSpin.wins / vsNoSpin.count) * 100 : 0
  
  return {
    receivesAttempted,
    receiveWins,
    receiveLosses,
    receiveWinRate,
    receiveErrors,
    receiveErrorRate,
    aggressiveReceives: aggressiveReceives.length,
    aggressiveReceiveSuccessRate,
    vsUnderSpin,
    vsTopSpin,
    vsSideSpin,
    vsNoSpin,
  }
}

