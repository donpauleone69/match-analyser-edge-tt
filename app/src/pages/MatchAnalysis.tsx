/**
 * MatchAnalysis — Display match statistics and analysis
 * 
 * Shows comprehensive statistics from tagged match data.
 * Serves to validate data accuracy and demonstrate data usefulness.
 */

import { useTaggingStore } from '@/stores/taggingStore'
import { Card, Button, Icon } from '@/ui-mine'
import { formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import type { Rally, Contact, PlayerId, PointEndType, ShotQuality } from '@/rules/types'

// =============================================================================
// STATISTICS CALCULATION
// =============================================================================

interface MatchStats {
  // Basic
  totalRallies: number
  totalShots: number
  avgShotsPerRally: number
  longestRally: number
  shortestRally: number
  
  // Per Player
  player1: PlayerStats
  player2: PlayerStats
  
  // Serve Stats
  serveStats: ServeStats
  
  // Shot Quality Distribution
  qualityDistribution: Record<string, number>
  
  // Point End Types
  endTypeDistribution: Record<string, number>
}

interface PlayerStats {
  name: string
  pointsWon: number
  winnersHit: number
  forcedErrors: number
  unforcedErrors: number
  servePoints: number
  receivePoints: number
}

interface ServeStats {
  player1ServeWins: number
  player1ServeLosses: number
  player2ServeWins: number
  player2ServeLosses: number
}

function calculateStats(
  rallies: Rally[],
  player1Name: string,
  player2Name: string
): MatchStats {
  const stats: MatchStats = {
    totalRallies: rallies.length,
    totalShots: 0,
    avgShotsPerRally: 0,
    longestRally: 0,
    shortestRally: Infinity,
    player1: {
      name: player1Name,
      pointsWon: 0,
      winnersHit: 0,
      forcedErrors: 0,
      unforcedErrors: 0,
      servePoints: 0,
      receivePoints: 0,
    },
    player2: {
      name: player2Name,
      pointsWon: 0,
      winnersHit: 0,
      forcedErrors: 0,
      unforcedErrors: 0,
      servePoints: 0,
      receivePoints: 0,
    },
    serveStats: {
      player1ServeWins: 0,
      player1ServeLosses: 0,
      player2ServeWins: 0,
      player2ServeLosses: 0,
    },
    qualityDistribution: {},
    endTypeDistribution: {},
  }
  
  for (const rally of rallies) {
    // Rally shot count
    const shotCount = rally.contacts.length
    stats.totalShots += shotCount
    stats.longestRally = Math.max(stats.longestRally, shotCount)
    if (shotCount > 0) {
      stats.shortestRally = Math.min(stats.shortestRally, shotCount)
    }
    
    // Point winner
    if (rally.winnerId === 'player1') {
      stats.player1.pointsWon++
      if (rally.serverId === 'player1') {
        stats.serveStats.player1ServeWins++
      } else {
        stats.player1.receivePoints++
        stats.serveStats.player2ServeLosses++
      }
    } else if (rally.winnerId === 'player2') {
      stats.player2.pointsWon++
      if (rally.serverId === 'player2') {
        stats.serveStats.player2ServeWins++
      } else {
        stats.player2.receivePoints++
        stats.serveStats.player1ServeLosses++
      }
    }
    
    // Count serve points
    if (rally.serverId === 'player1') {
      stats.player1.servePoints++
    } else {
      stats.player2.servePoints++
    }
    
    // Point end type
    if (rally.pointEndType) {
      stats.endTypeDistribution[rally.pointEndType] = 
        (stats.endTypeDistribution[rally.pointEndType] || 0) + 1
      
      // Categorize based on end type
      if (rally.pointEndType === 'winnerShot') {
        if (rally.winnerId === 'player1') {
          stats.player1.winnersHit++
        } else {
          stats.player2.winnersHit++
        }
      } else if (rally.pointEndType === 'forcedError') {
        // Forced error = opponent made error due to pressure
        if (rally.winnerId === 'player1') {
          stats.player2.forcedErrors++
        } else {
          stats.player1.forcedErrors++
        }
      } else if (rally.pointEndType === 'unforcedError') {
        if (rally.winnerId === 'player1') {
          stats.player2.unforcedErrors++
        } else {
          stats.player1.unforcedErrors++
        }
      }
    }
    
    // Shot quality distribution
    for (const contact of rally.contacts) {
      if (contact.shotQuality) {
        stats.qualityDistribution[contact.shotQuality] = 
          (stats.qualityDistribution[contact.shotQuality] || 0) + 1
      }
    }
  }
  
  // Calculate averages
  if (stats.totalRallies > 0) {
    stats.avgShotsPerRally = stats.totalShots / stats.totalRallies
  }
  if (stats.shortestRally === Infinity) {
    stats.shortestRally = 0
  }
  
  return stats
}

// =============================================================================
// COMPONENTS
// =============================================================================

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  className?: string
}

function StatCard({ title, value, subtitle, className }: StatCardProps) {
  return (
    <div className={cn('bg-neutral-800 rounded-lg p-4', className)}>
      <div className="text-xs text-neutral-400 mb-1">{title}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtitle && (
        <div className="text-xs text-neutral-500 mt-1">{subtitle}</div>
      )}
    </div>
  )
}

interface PlayerStatRowProps {
  label: string
  player1Value: number | string
  player2Value: number | string
  highlight?: 'player1' | 'player2' | null
}

function PlayerStatRow({ label, player1Value, player2Value, highlight }: PlayerStatRowProps) {
  return (
    <div className="flex items-center py-2 border-b border-neutral-700 last:border-0">
      <div className={cn(
        'w-20 text-right pr-4 font-medium',
        highlight === 'player1' ? 'text-cyan-400' : 'text-neutral-300'
      )}>
        {player1Value}
      </div>
      <div className="flex-1 text-center text-sm text-neutral-400">
        {label}
      </div>
      <div className={cn(
        'w-20 text-left pl-4 font-medium',
        highlight === 'player2' ? 'text-amber-400' : 'text-neutral-300'
      )}>
        {player2Value}
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function MatchAnalysis() {
  const navigate = useNavigate()
  const {
    player1Name,
    player2Name,
    rallies,
    matchDate,
    matchFormat,
    games,
    matchResult,
    firstServerId,
  } = useTaggingStore()
  
  const stats = calculateStats(rallies, player1Name, player2Name)
  
  // Calculate serve percentages
  const p1ServeTotal = stats.serveStats.player1ServeWins + stats.serveStats.player1ServeLosses
  const p2ServeTotal = stats.serveStats.player2ServeWins + stats.serveStats.player2ServeLosses
  const p1ServeWinPct = p1ServeTotal > 0 
    ? Math.round((stats.serveStats.player1ServeWins / p1ServeTotal) * 100) 
    : 0
  const p2ServeWinPct = p2ServeTotal > 0 
    ? Math.round((stats.serveStats.player2ServeWins / p2ServeTotal) * 100) 
    : 0
  
  // Determine higher values for highlighting
  const getHighlight = (p1: number, p2: number): 'player1' | 'player2' | null => {
    if (p1 > p2) return 'player1'
    if (p2 > p1) return 'player2'
    return null
  }
  
  // Format match format for display
  const formatMatchFormat = (format: string): string => {
    switch (format) {
      case 'bestOf3': return 'Best of 3'
      case 'bestOf5': return 'Best of 5'
      case 'bestOf7': return 'Best of 7'
      case 'bestOf3_21': return 'Best of 3 (to 21)'
      case 'bestOf5_21': return 'Best of 5 (to 21)'
      case 'singleSet': return 'Single Set'
      default: return format
    }
  }
  
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Match Analysis</h1>
            <p className="text-neutral-400 mt-1">
              {matchDate || 'Date not set'} • {formatMatchFormat(matchFormat)}
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate('/matches')}
            className="gap-2"
          >
            <Icon name="arrow-left" size="sm" />
            Back to Matches
          </Button>
        </div>
        
        {/* Players Header */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-cyan-400">{player1Name}</div>
              <div className="text-4xl font-bold mt-2">{stats.player1.pointsWon}</div>
              <div className="text-sm text-neutral-400 mt-1">Points Won</div>
            </div>
            
            <div className="px-8 text-center">
              <div className="text-3xl font-bold text-neutral-500">vs</div>
            </div>
            
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-amber-400">{player2Name}</div>
              <div className="text-4xl font-bold mt-2">{stats.player2.pointsWon}</div>
              <div className="text-sm text-neutral-400 mt-1">Points Won</div>
            </div>
          </div>
          
          {/* First Server Indicator */}
          <div className="text-center mt-4 text-sm text-neutral-500">
            First Server: {firstServerId === 'player1' ? player1Name : player2Name}
          </div>
        </Card>
        
        {/* Overview Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Rallies"
            value={stats.totalRallies}
          />
          <StatCard
            title="Total Shots"
            value={stats.totalShots}
          />
          <StatCard
            title="Avg Shots/Rally"
            value={stats.avgShotsPerRally.toFixed(1)}
          />
          <StatCard
            title="Longest Rally"
            value={stats.longestRally}
            subtitle="shots"
          />
        </div>
        
        {/* Head to Head Stats */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 text-center">Head to Head</h2>
          
          <div className="flex items-center justify-between mb-4">
            <div className="text-cyan-400 font-medium">{player1Name}</div>
            <div className="text-amber-400 font-medium">{player2Name}</div>
          </div>
          
          <PlayerStatRow
            label="Points Won"
            player1Value={stats.player1.pointsWon}
            player2Value={stats.player2.pointsWon}
            highlight={getHighlight(stats.player1.pointsWon, stats.player2.pointsWon)}
          />
          
          <PlayerStatRow
            label="Winners"
            player1Value={stats.player1.winnersHit}
            player2Value={stats.player2.winnersHit}
            highlight={getHighlight(stats.player1.winnersHit, stats.player2.winnersHit)}
          />
          
          <PlayerStatRow
            label="Forced Errors"
            player1Value={stats.player1.forcedErrors}
            player2Value={stats.player2.forcedErrors}
            highlight={getHighlight(stats.player2.forcedErrors, stats.player1.forcedErrors)} // Lower is better
          />
          
          <PlayerStatRow
            label="Unforced Errors"
            player1Value={stats.player1.unforcedErrors}
            player2Value={stats.player2.unforcedErrors}
            highlight={getHighlight(stats.player2.unforcedErrors, stats.player1.unforcedErrors)} // Lower is better
          />
          
          <PlayerStatRow
            label="Serve Win %"
            player1Value={`${p1ServeWinPct}%`}
            player2Value={`${p2ServeWinPct}%`}
            highlight={getHighlight(p1ServeWinPct, p2ServeWinPct)}
          />
        </Card>
        
        {/* Point End Type Distribution */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">How Points Ended</h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(stats.endTypeDistribution).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between bg-neutral-800 rounded px-3 py-2">
                <span className="text-sm text-neutral-300">
                  {type === 'winnerShot' && 'Winner'}
                  {type === 'forcedError' && 'Forced Error'}
                  {type === 'unforcedError' && 'Unforced Error'}
                  {type === 'serviceFault' && 'Service Fault'}
                  {type === 'receiveError' && 'Receive Error'}
                  {type === 'letReplay' && 'Let'}
                </span>
                <span className="font-bold text-brand-primary">{count}</span>
              </div>
            ))}
          </div>
        </Card>
        
        {/* Shot Quality Distribution */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Shot Quality Distribution</h2>
          <div className="grid grid-cols-4 gap-4">
            {['good', 'average', 'poor', 'wide', 'net', 'long'].map(quality => {
              const count = stats.qualityDistribution[quality] || 0
              const pct = stats.totalShots > 0 
                ? Math.round((count / stats.totalShots) * 100) 
                : 0
              
              return (
                <div key={quality} className="text-center">
                  <div className="text-2xl font-bold text-brand-primary">{count}</div>
                  <div className="text-xs text-neutral-400 capitalize">{quality}</div>
                  <div className="text-xs text-neutral-500">{pct}%</div>
                </div>
              )
            })}
          </div>
        </Card>
        
        {/* Rally Details (Sample) */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">Rally Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-400 border-b border-neutral-700">
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Server</th>
                  <th className="py-2 px-2">Shots</th>
                  <th className="py-2 px-2">Winner</th>
                  <th className="py-2 px-2">End Type</th>
                  <th className="py-2 px-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                {rallies.slice(0, 20).map((rally, idx) => {
                  const serverName = rally.serverId === 'player1' ? player1Name : player2Name
                  const winnerName = rally.winnerId === 'player1' 
                    ? player1Name 
                    : rally.winnerId === 'player2' 
                      ? player2Name 
                      : '-'
                  const duration = rally.endOfPointTime && rally.contacts.length > 0
                    ? (rally.endOfPointTime - rally.contacts[0].time).toFixed(1)
                    : '-'
                  
                  return (
                    <tr 
                      key={rally.id} 
                      className="border-b border-neutral-800 hover:bg-neutral-800/50"
                    >
                      <td className="py-2 px-2 text-neutral-400">{idx + 1}</td>
                      <td className={cn(
                        'py-2 px-2',
                        rally.serverId === 'player1' ? 'text-cyan-400' : 'text-amber-400'
                      )}>
                        {serverName}
                      </td>
                      <td className="py-2 px-2">{rally.contacts.length}</td>
                      <td className={cn(
                        'py-2 px-2',
                        rally.winnerId === 'player1' ? 'text-cyan-400' : 
                        rally.winnerId === 'player2' ? 'text-amber-400' : 'text-neutral-500'
                      )}>
                        {winnerName}
                      </td>
                      <td className="py-2 px-2 text-neutral-300">
                        {rally.pointEndType || '-'}
                      </td>
                      <td className="py-2 px-2 font-mono text-neutral-400">
                        {duration}s
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {rallies.length > 20 && (
              <div className="text-center text-sm text-neutral-500 mt-4">
                Showing first 20 of {rallies.length} rallies
              </div>
            )}
          </div>
        </Card>
        
        {/* No Data State */}
        {rallies.length === 0 && (
          <Card className="p-8 text-center">
            <Icon name="info" size="lg" className="text-neutral-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Match Data</h3>
            <p className="text-neutral-400 mb-4">
              Tag a match first to see analysis here.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/matches/new/tagging')}
            >
              Start Tagging
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}



