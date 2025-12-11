import type { DBRally, DBShot } from '@/data'

export interface ErrorProfileMetrics {
  // Primary
  unforcedErrorRate: number // Overall UE rate (all phases)
  
  // Secondary
  forcedErrorsConcededRate: number // Forced error rate against player
  serveUEshare: number // % of UEs that are serve faults
  receiveUEshare: number // % of UEs that are receive errors
  rallyUEshare: number // % of UEs that are rally errors (4+ shots)
  opponentUErate: number // Rate opponent gives away points via UE
  
  // Counts for insight generation
  totalUnforcedErrors: number
  totalRalliesPlayed: number
  serveUEcount: number
  receiveUEcount: number
  rallyUEcount: number
}

export interface ErrorProfileResult {
  metrics: ErrorProfileMetrics
  status: 'good' | 'average' | 'poor'
  insight: string
  recommendation: string
  footerText: string
}

/**
 * Calculate error profile for a player
 * Shows where errors happen and impact on points
 */
export function calculateErrorProfile(
  rallies: DBRally[],
  shots: DBShot[],
  playerId: string,
  opponentId?: string
): ErrorProfileResult {
  const totalRallies = rallies.length
  
  if (totalRallies === 0) {
    return {
      metrics: {
        unforcedErrorRate: 0,
        forcedErrorsConcededRate: 0,
        serveUEshare: 0,
        receiveUEshare: 0,
        rallyUEshare: 0,
        opponentUErate: 0,
        totalUnforcedErrors: 0,
        totalRalliesPlayed: 0,
        serveUEcount: 0,
        receiveUEcount: 0,
        rallyUEcount: 0,
      },
      status: 'average',
      insight: 'Not enough data to analyze error profile.',
      recommendation: '',
      footerText: 'No data',
    }
  }
  
  // Count player unforced errors by type
  let serveUEs = 0
  let receiveUEs = 0
  let rallyUEs = 0
  
  // Service faults
  serveUEs = rallies.filter(
    (r) => r.server_id === playerId && r.point_end_type === 'serviceFault'
  ).length
  
  // Receive errors
  receiveUEs = rallies.filter(
    (r) => r.receiver_id === playerId && r.point_end_type === 'receiveError'
  ).length
  
  // Rally unforced errors (shot_index >= 4)
  rallyUEs = shots.filter(
    (s) =>
      s.player_id === playerId &&
      s.shot_index >= 4 &&
      s.is_rally_end &&
      s.rally_end_role === 'unforced_error'
  ).length
  
  // Also check for 3rd ball UEs (shot_index === 3)
  const thirdBallUEs = shots.filter(
    (s) =>
      s.player_id === playerId &&
      s.shot_index === 3 &&
      s.is_rally_end &&
      s.rally_end_role === 'unforced_error'
  ).length
  
  // Total player UEs
  const totalUEs = serveUEs + receiveUEs + rallyUEs + thirdBallUEs
  const unforcedErrorRate = totalUEs / totalRallies
  
  // UE shares (% of all UEs)
  const serveUEshare = totalUEs > 0 ? serveUEs / totalUEs : 0
  const receiveUEshare = totalUEs > 0 ? receiveUEs / totalUEs : 0
  const rallyUEshare = totalUEs > 0 ? (rallyUEs + thirdBallUEs) / totalUEs : 0
  
  // Forced errors conceded (opponent forces player into error)
  const forcedErrorsAgainst = shots.filter(
    (s) =>
      s.player_id !== playerId && // Opponent's shot
      s.is_rally_end &&
      s.rally_end_role === 'forced_error'
  ).length
  const forcedErrorsConcededRate = forcedErrorsAgainst / totalRallies
  
  // Opponent unforced errors (player benefits)
  let opponentUEs = 0
  
  // Opponent service faults
  if (opponentId) {
    opponentUEs += rallies.filter(
      (r) => r.server_id === opponentId && r.point_end_type === 'serviceFault'
    ).length
    
    // Opponent receive errors
    opponentUEs += rallies.filter(
      (r) => r.receiver_id === opponentId && r.point_end_type === 'receiveError'
    ).length
  }
  
  // Opponent rally UEs
  opponentUEs += shots.filter(
    (s) =>
      s.player_id !== playerId &&
      s.is_rally_end &&
      s.rally_end_role === 'unforced_error'
  ).length
  
  const opponentUErate = opponentUEs / totalRallies
  
  // Determine status (based on player UE rate)
  const status: 'good' | 'average' | 'poor' =
    unforcedErrorRate < 0.10 ? 'good' : unforcedErrorRate <= 0.15 ? 'average' : 'poor'
  
  // Generate insight
  const insight = generateErrorInsight({
    unforcedErrorRate,
    forcedErrorsConcededRate,
    serveUEshare,
    receiveUEshare,
    rallyUEshare,
    opponentUErate,
    totalUnforcedErrors: totalUEs,
  })
  
  // Generate recommendation
  const recommendation = generateErrorRecommendation({
    unforcedErrorRate,
    forcedErrorsConcededRate,
    serveUEshare,
    receiveUEshare,
    rallyUEshare,
  })
  
  // Footer text
  const matchCount = new Set(rallies.map((r) => r.match_id)).size
  const footerText = `Based on ${matchCount} match${matchCount !== 1 ? 'es' : ''} (${totalRallies} points)`
  
  return {
    metrics: {
      unforcedErrorRate,
      forcedErrorsConcededRate,
      serveUEshare,
      receiveUEshare,
      rallyUEshare,
      opponentUErate,
      totalUnforcedErrors: totalUEs,
      totalRalliesPlayed: totalRallies,
      serveUEcount: serveUEs,
      receiveUEcount: receiveUEs,
      rallyUEcount: rallyUEs + thirdBallUEs,
    },
    status,
    insight,
    recommendation,
    footerText,
  }
}

function generateErrorInsight(metrics: Partial<ErrorProfileMetrics>): string {
  const {
    unforcedErrorRate = 0,
    forcedErrorsConcededRate = 0,
    serveUEshare = 0,
    receiveUEshare = 0,
    rallyUEshare = 0,
    opponentUErate = 0,
  } = metrics
  
  const uePct = Math.round(unforcedErrorRate * 100)
  const oppUEpct = Math.round(opponentUErate * 100)
  
  // Find dominant error phase
  let dominantPhase = 'rallies'
  let maxShare = rallyUEshare
  
  if (serveUEshare > maxShare) {
    dominantPhase = 'serve'
    maxShare = serveUEshare
  }
  if (receiveUEshare > maxShare) {
    dominantPhase = 'receive'
    maxShare = receiveUEshare
  }
  
  const dominantPct = Math.round(maxShare * 100)
  
  if (unforcedErrorRate < 0.10) {
    return `Your error rate is excellent at ${uePct}%. You're winning points cleanly without giving away cheap errors.`
  }
  
  if (unforcedErrorRate <= 0.15) {
    if (dominantPct > 40) {
      return `Unforced errors decide ${uePct}% of your points, with ${dominantPct}% happening on the ${dominantPhase}.`
    }
    return `Unforced errors cost you ${uePct}% of points. Your opponent gives away ${oppUEpct}% via their mistakes.`
  }
  
  // Poor
  if (dominantPct > 40) {
    return `Unforced errors are a major issue at ${uePct}% of points, with most (${dominantPct}%) coming on the ${dominantPhase}.`
  }
  
  if (forcedErrorsConcededRate > 0.15) {
    return `You lose ${uePct}% of points to unforced errors, plus ${Math.round(forcedErrorsConcededRate * 100)}% to forced errors. Defensive pressure is high.`
  }
  
  return `Unforced errors decide ${uePct}% of your points across all phases. This is costing you matches.`
}

function generateErrorRecommendation(metrics: Partial<ErrorProfileMetrics>): string {
  const {
    unforcedErrorRate = 0,
    forcedErrorsConcededRate = 0,
    serveUEshare = 0,
    receiveUEshare = 0,
    rallyUEshare = 0,
  } = metrics
  
  // Find dominant error phase
  let dominantPhase: 'serve' | 'receive' | 'rally' = 'rally'
  let maxShare = rallyUEshare
  
  if (serveUEshare > maxShare) {
    dominantPhase = 'serve'
    maxShare = serveUEshare
  }
  if (receiveUEshare > maxShare) {
    dominantPhase = 'receive'
  }
  
  // High overall UE rate
  if (unforcedErrorRate > 0.15) {
    if (dominantPhase === 'serve' && serveUEshare > 0.30) {
      return 'Focus on serve consistency to cut cheap points lost on faults. Prioritize placement over power.'
    }
    
    if (dominantPhase === 'receive' && receiveUEshare > 0.30) {
      return 'Simplify receive choices and prioritize safe returns over risk. Build confidence with consistent blocks.'
    }
    
    if (dominantPhase === 'rally' && rallyUEshare > 0.40) {
      return 'Train controlled rally patterns to reduce errors in neutral exchanges. Focus on footwork and balance.'
    }
  }
  
  // High forced errors conceded
  if (forcedErrorsConcededRate > 0.15) {
    return 'Work on handling heavy spin and pace to reduce forced errors. Improve defensive positioning.'
  }
  
  // Good error profile
  if (unforcedErrorRate < 0.10) {
    return 'Your error rate is excellent. Keep this consistency while looking for more attacking opportunities.'
  }
  
  // Default
  return 'Focus on reducing errors in your weakest phase while maintaining consistency in others.'
}

