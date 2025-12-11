import type { DBRally, DBShot } from '@/data'

export interface RallyStatsMetrics {
  // Primary
  rallyWinRate: number // Win rate in rally phase (4+ shots)
  
  // Secondary
  longRallyWinRate: number // Win rate in 6+ shot rallies
  rallyUnforcedErrorRate: number // UE rate in rally phase
  rallyForcedErrorsCreatedRate: number // FE created rate in rally phase
  avgRallyLength: number // Average shots per rally (all rallies)
  avgRallyPhaseLength: number // Average shots per rally-phase rally (4+ shots)
  
  // Counts for insight generation
  totalRallyPhaseRallies: number // Rallies with 4+ shots
  totalLongRallies: number // Rallies with 6+ shots
  totalRallies: number // All scoring rallies
}

export interface RallyStatsResult {
  metrics: RallyStatsMetrics
  status: 'good' | 'average' | 'poor'
  insight: string
  recommendation: string
  footerText: string
}

/**
 * Calculate rally statistics for a player
 * Rally phase = shots 4+ (after serve/receive/3rd ball)
 */
export function calculateRallyStats(
  rallies: DBRally[],
  shots: DBShot[],
  playerId: string
): RallyStatsResult {
  // Build map of rally ID -> max shot index
  const rallyMaxShots = new Map<string, number>()
  shots.forEach((shot) => {
    const current = rallyMaxShots.get(shot.rally_id) || 0
    if (shot.shot_index > current) {
      rallyMaxShots.set(shot.rally_id, shot.shot_index)
    }
  })
  
  // Filter to rally-phase rallies (4+ shots)
  const rallyPhaseRallies = rallies.filter((r) => {
    const maxShots = rallyMaxShots.get(r.id) || 0
    return maxShots >= 4
  })
  
  // Filter to long rallies (6+ shots)
  const longRallies = rallies.filter((r) => {
    const maxShots = rallyMaxShots.get(r.id) || 0
    return maxShots >= 6
  })
  
  // Calculate rally win rate
  const rallyWins = rallyPhaseRallies.filter((r) => r.winner_id === playerId).length
  const rallyWinRate = rallyPhaseRallies.length > 0 
    ? rallyWins / rallyPhaseRallies.length 
    : 0
  
  // Calculate long rally win rate
  const longRallyWins = longRallies.filter((r) => r.winner_id === playerId).length
  const longRallyWinRate = longRallies.length > 0
    ? longRallyWins / longRallies.length
    : 0
  
  // Rally unforced errors (shot_index >= 4, player UE)
  const rallyPhaseShots = shots.filter((s) => s.shot_index >= 4)
  const rallyUEs = rallyPhaseShots.filter(
    (s) => s.player_id === playerId && s.is_rally_end && s.rally_end_role === 'unforced_error'
  ).length
  const rallyUnforcedErrorRate = rallyPhaseRallies.length > 0
    ? rallyUEs / rallyPhaseRallies.length
    : 0
  
  // Rally forced errors created (shot_index >= 4, opponent FE)
  const rallyFEsCreated = rallyPhaseShots.filter(
    (s) => s.player_id === playerId && s.is_rally_end && s.rally_end_role === 'forced_error'
  ).length
  const rallyForcedErrorsCreatedRate = rallyPhaseRallies.length > 0
    ? rallyFEsCreated / rallyPhaseRallies.length
    : 0
  
  // Average rally length (all rallies)
  const totalShots = Array.from(rallyMaxShots.values()).reduce((sum, max) => sum + max, 0)
  const avgRallyLength = rallies.length > 0
    ? totalShots / rallies.length
    : 0
  
  // Average rally phase length (4+ shot rallies only)
  const rallyPhaseShots_sum = rallyPhaseRallies.reduce((sum, r) => {
    return sum + (rallyMaxShots.get(r.id) || 0)
  }, 0)
  const avgRallyPhaseLength = rallyPhaseRallies.length > 0
    ? rallyPhaseShots_sum / rallyPhaseRallies.length
    : 0
  
  // Determine status
  const status: 'good' | 'average' | 'poor' =
    rallyWinRate >= 0.55 ? 'good' : rallyWinRate >= 0.48 ? 'average' : 'poor'
  
  // Generate insight
  const insight = generateRallyInsight({
    rallyWinRate,
    longRallyWinRate,
    rallyUnforcedErrorRate,
    rallyForcedErrorsCreatedRate,
    totalRallyPhaseRallies: rallyPhaseRallies.length,
    totalLongRallies: longRallies.length,
    avgRallyLength,
    avgRallyPhaseLength,
  })
  
  // Generate recommendation
  const recommendation = generateRallyRecommendation({
    rallyWinRate,
    longRallyWinRate,
    rallyUnforcedErrorRate,
    rallyForcedErrorsCreatedRate,
  })
  
  // Footer text
  const matchCount = new Set(rallies.map((r) => r.match_id)).size
  const footerText = `Based on ${matchCount} match${matchCount !== 1 ? 'es' : ''} (${rallyPhaseRallies.length} rally-phase points)`
  
  return {
    metrics: {
      rallyWinRate,
      longRallyWinRate,
      rallyUnforcedErrorRate,
      rallyForcedErrorsCreatedRate,
      avgRallyLength,
      avgRallyPhaseLength,
      totalRallyPhaseRallies: rallyPhaseRallies.length,
      totalLongRallies: longRallies.length,
      totalRallies: rallies.length,
    },
    status,
    insight,
    recommendation,
    footerText,
  }
}

function generateRallyInsight(metrics: Partial<RallyStatsMetrics>): string {
  const {
    rallyWinRate = 0,
    longRallyWinRate = 0,
    rallyUnforcedErrorRate = 0,
    rallyForcedErrorsCreatedRate = 0,
    totalLongRallies = 0,
  } = metrics
  
  const rallyWinPct = Math.round(rallyWinRate * 100)
  const longRallyWinPct = Math.round(longRallyWinRate * 100)
  const ueRate = Math.round(rallyUnforcedErrorRate * 100)
  
  if (rallyWinRate >= 0.55) {
    if (totalLongRallies > 5) {
      return `You dominate rally exchanges, winning ${rallyWinPct}% of rally-phase points. Long rallies (6+ shots) are won ${longRallyWinPct}% of the time.`
    }
    return `You win ${rallyWinPct}% of rally-phase points once the point develops. Your rally game is a clear strength.`
  }
  
  if (rallyWinRate >= 0.48) {
    if (rallyUnforcedErrorRate > 0.15) {
      return `You win ${rallyWinPct}% of rally-phase points. Unforced errors (${ueRate}%) are costing you more rally wins.`
    }
    return `You win ${rallyWinPct}% of rally-phase points. Solid rally play with room to improve consistency.`
  }
  
  // Poor
  if (rallyUnforcedErrorRate > 0.15) {
    return `You win only ${rallyWinPct}% of rally-phase points. High unforced error rate (${ueRate}%) is the main issue.`
  }
  
  if (rallyForcedErrorsCreatedRate < 0.10) {
    return `You win only ${rallyWinPct}% of rally-phase points. You rarely force errors in rallies, suggesting a passive style.`
  }
  
  return `You win ${rallyWinPct}% of rally-phase points. Rallies are your weakest phase of play.`
}

function generateRallyRecommendation(metrics: Partial<RallyStatsMetrics>): string {
  const {
    rallyWinRate = 0,
    longRallyWinRate = 0,
    rallyUnforcedErrorRate = 0,
    rallyForcedErrorsCreatedRate = 0,
  } = metrics
  
  // High UE rate
  if (rallyUnforcedErrorRate > 0.15) {
    return 'Focus on rally consistency and footwork to cut unforced errors. Prioritize controlled placement over power.'
  }
  
  // Low long rally win rate
  if (longRallyWinRate < 0.45 && rallyWinRate < 0.50) {
    return 'Train longer rally drills to improve stamina and stability in extended exchanges.'
  }
  
  // Low forced errors created
  if (rallyForcedErrorsCreatedRate < 0.10) {
    return 'Add more aggressive placement and variation to pressure opponents in rallies. Target weak zones.'
  }
  
  // Good rally game
  if (rallyWinRate >= 0.55) {
    return 'Your rally game is strong. Keep building patterns that get you into rally exchanges.'
  }
  
  // Default
  return 'Work on rally consistency while adding more variety to create opportunities.'
}

