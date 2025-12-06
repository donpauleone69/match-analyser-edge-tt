import { useEffect, useState } from 'react'
import { db, getDatabaseStats } from '@/data/db'
import type { DBMatch } from '@/data/entities/matches/match.types'
import type { DBSet } from '@/data/entities/sets/set.types'
import type { DBRally } from '@/data/entities/rallies/rally.types'
import type { DBShot } from '@/data/entities/shots/shot.types'
import { Database, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'

interface DatabaseStats {
  clubs: number
  tournaments: number
  players: number
  matches: number
  matchVideos: number
  sets: number
  rallies: number
  shots: number
}

interface MatchWithData extends DBMatch {
  sets: SetWithData[]
}

interface SetWithData extends DBSet {
  rallies: RallyWithData[]
}

interface RallyWithData extends DBRally {
  shots: DBShot[]
}

export function DataViewer() {
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [matchesWithData, setMatchesWithData] = useState<MatchWithData[]>([])
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set())
  const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set())
  const [expandedRallies, setExpandedRallies] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [statsData, matches, sets, rallies, shots] = await Promise.all([
        getDatabaseStats(),
        db.matches.toArray(),
        db.sets.toArray(),
        db.rallies.toArray(),
        db.shots.toArray(),
      ])

      setStats(statsData)

      // Build hierarchical structure
      const matchesWithHierarchy: MatchWithData[] = matches.map(match => {
        const matchSets = sets
          .filter(s => s.match_id === match.id)
          .sort((a, b) => a.set_number - b.set_number)
          .map(set => {
            const setRallies = rallies
              .filter(r => r.set_id === set.id)
              .sort((a, b) => (a.rally_in_set_index || 0) - (b.rally_in_set_index || 0))
              .map(rally => {
                const rallyShots = shots
                  .filter(s => s.rally_id === rally.id)
                  .sort((a, b) => a.shot_number - b.shot_number)
                
                return { ...rally, shots: rallyShots }
              })
            
            return { ...set, rallies: setRallies }
          })
        
        return { ...match, sets: matchSets }
      })

      setMatchesWithData(matchesWithHierarchy)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const toggleMatch = (matchId: string) => {
    const newExpanded = new Set(expandedMatches)
    if (newExpanded.has(matchId)) {
      newExpanded.delete(matchId)
    } else {
      newExpanded.add(matchId)
    }
    setExpandedMatches(newExpanded)
  }

  const toggleSet = (setId: string) => {
    const newExpanded = new Set(expandedSets)
    if (newExpanded.has(setId)) {
      newExpanded.delete(setId)
    } else {
      newExpanded.add(setId)
    }
    setExpandedSets(newExpanded)
  }

  const toggleRally = (rallyId: string) => {
    const newExpanded = new Set(expandedRallies)
    if (newExpanded.has(rallyId)) {
      newExpanded.delete(rallyId)
    } else {
      newExpanded.add(rallyId)
    }
    setExpandedRallies(newExpanded)
  }

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="max-w-7xl mx-auto p-4 md:p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-neutral-400">Loading data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-50 flex items-center gap-3">
              <Database className="h-6 w-6 md:h-8 md:w-8 text-brand-primary" />
              Data Viewer
            </h1>
            <p className="text-neutral-400 mt-2 text-sm md:text-base">
              Hierarchical view of all data in your local database
            </p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg transition-colors flex items-center gap-2 text-sm md:text-base"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <StatCard label="Matches" count={stats.matches} />
            <StatCard label="Sets" count={stats.sets} />
            <StatCard label="Rallies" count={stats.rallies} />
            <StatCard label="Shots" count={stats.shots} />
          </div>
        )}

        {/* Hierarchical Data Tree */}
        <div className="space-y-4">
          {matchesWithData.length === 0 ? (
            <div className="bg-bg-card rounded-lg border border-neutral-700 p-8 text-center">
              <p className="text-neutral-400">No matches in database yet</p>
            </div>
          ) : (
            matchesWithData.map(match => (
              <MatchNode
                key={match.id}
                match={match}
                isExpanded={expandedMatches.has(match.id!)}
                onToggle={() => toggleMatch(match.id!)}
                expandedSets={expandedSets}
                expandedRallies={expandedRallies}
                onToggleSet={toggleSet}
                onToggleRally={toggleRally}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="bg-bg-card rounded-lg border border-neutral-700 p-3 md:p-4">
      <div className="text-neutral-400 text-xs md:text-sm mb-1">{label}</div>
      <div className="text-xl md:text-2xl font-bold text-neutral-50">{count}</div>
    </div>
  )
}

interface MatchNodeProps {
  match: MatchWithData
  isExpanded: boolean
  onToggle: () => void
  expandedSets: Set<string>
  expandedRallies: Set<string>
  onToggleSet: (id: string) => void
  onToggleRally: (id: string) => void
}

function MatchNode({ match, isExpanded, onToggle, expandedSets, expandedRallies, onToggleSet, onToggleRally }: MatchNodeProps) {
  return (
    <div className="bg-bg-card rounded-lg border border-neutral-700 overflow-hidden">
      {/* Match Header */}
      <button
        onClick={onToggle}
        className="w-full p-3 md:p-4 bg-bg-shell hover:bg-neutral-800/50 transition-colors flex items-center gap-3 text-left"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-neutral-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-neutral-400 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm md:text-base font-semibold text-neutral-50 truncate">
            Match: {match.player1_id} vs {match.player2_id}
          </div>
          <div className="text-xs md:text-sm text-neutral-400 mt-1">
            {match.sets.length} sets • {match.sets.reduce((acc, s) => acc + s.rallies.length, 0)} rallies
          </div>
        </div>
      </button>

      {/* Sets */}
      {isExpanded && (
        <div className="border-t border-neutral-700">
          {match.sets.length === 0 ? (
            <div className="p-4 text-sm text-neutral-500">No sets in this match</div>
          ) : (
            match.sets.map(set => (
              <SetNode
                key={set.id}
                set={set}
                isExpanded={expandedSets.has(set.id!)}
                onToggle={() => onToggleSet(set.id!)}
                expandedRallies={expandedRallies}
                onToggleRally={onToggleRally}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface SetNodeProps {
  set: SetWithData
  isExpanded: boolean
  onToggle: () => void
  expandedRallies: Set<string>
  onToggleRally: (id: string) => void
}

function SetNode({ set, isExpanded, onToggle, expandedRallies, onToggleRally }: SetNodeProps) {
  return (
    <div className="border-b border-neutral-700 last:border-b-0">
      {/* Set Header */}
      <button
        onClick={onToggle}
        className="w-full p-3 md:p-4 pl-8 md:pl-12 hover:bg-neutral-800/30 transition-colors flex items-center gap-3 text-left"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-neutral-100 truncate">
            Set {set.set_number} • Score: {set.player1_final_score}-{set.player2_final_score}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {set.rallies.length} rallies • {set.rallies.reduce((acc, r) => acc + r.shots.length, 0)} shots
          </div>
        </div>
      </button>

      {/* Rallies */}
      {isExpanded && (
        <div className="bg-neutral-900/30">
          {set.rallies.length === 0 ? (
            <div className="p-4 pl-16 text-sm text-neutral-500">No rallies in this set</div>
          ) : (
            set.rallies.map((rally, idx) => (
              <RallyNode
                key={rally.id}
                rally={rally}
                rallyIndex={idx + 1}
                isExpanded={expandedRallies.has(rally.id!)}
                onToggle={() => onToggleRally(rally.id!)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface RallyNodeProps {
  rally: RallyWithData
  rallyIndex: number
  isExpanded: boolean
  onToggle: () => void
}

function RallyNode({ rally, rallyIndex, isExpanded, onToggle }: RallyNodeProps) {
  const [expandedShots, setExpandedShots] = useState<Set<string>>(new Set())

  const toggleShot = (shotId: string) => {
    const newExpanded = new Set(expandedShots)
    if (newExpanded.has(shotId)) {
      newExpanded.delete(shotId)
    } else {
      newExpanded.add(shotId)
    }
    setExpandedShots(newExpanded)
  }

  return (
    <div className="border-b border-neutral-800 last:border-b-0">
      {/* Rally Header */}
      <button
        onClick={onToggle}
        className="w-full p-2 md:p-3 pl-12 md:pl-20 hover:bg-neutral-800/30 transition-colors flex items-center gap-2 text-left"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-neutral-500 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-neutral-500 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-xs md:text-sm text-neutral-200 truncate">
            Rally {rallyIndex} • {rally.shots.length} shots
          </div>
        </div>
      </button>

      {/* Shots */}
      {isExpanded && (
        <div className="bg-neutral-950/50">
          {rally.shots.length === 0 ? (
            <div className="p-3 pl-24 text-xs text-neutral-500">No shots in this rally</div>
          ) : (
            <div className="p-2 md:p-3 pl-16 md:pl-24 space-y-2">
              {rally.shots.map(shot => {
                const isShotExpanded = expandedShots.has(shot.id!)
                return (
                  <div
                    key={shot.id}
                    className="bg-neutral-900/50 border border-neutral-800 rounded overflow-hidden"
                  >
                    {/* Shot Summary */}
                    <button
                      onClick={() => toggleShot(shot.id!)}
                      className="w-full p-2 hover:bg-neutral-800/30 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-mono">
                          {isShotExpanded ? (
                            <ChevronDown className="h-3 w-3 text-neutral-500 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-neutral-500 shrink-0" />
                          )}
                          <span className="text-neutral-500">Shot {shot.shot_number}:</span>
                          <span className="text-neutral-300">{shot.player_id}</span>
                          {shot.shot_type && (
                            <span className="text-neutral-400">• {shot.shot_type}</span>
                          )}
                          {shot.intent && (
                            <span className="text-blue-400">• {shot.intent}</span>
                          )}
                        </div>
                        <span className="text-xs text-neutral-600">
                          {isShotExpanded ? 'Less' : 'More'}
                        </span>
                      </div>
                    </button>

                    {/* Expanded Shot Details */}
                    {isShotExpanded && (
                      <div className="px-4 pb-3 pt-1 border-t border-neutral-800">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono">
                          <DetailRow label="Shot #" value={shot.shot_number} />
                          <DetailRow label="Player" value={shot.player_id} />
                          <DetailRow label="Shot Type" value={shot.shot_type} />
                          <DetailRow label="Intent" value={shot.intent} />
                          <DetailRow label="Wing" value={shot.wing} />
                          <DetailRow label="Quality" value={shot.shot_quality} />
                          <DetailRow label="Contact Height" value={shot.contact_height} />
                          <DetailRow label="Position" value={shot.position_sector} />
                          <DetailRow label="Inferred Spin" value={shot.inferred_spin} />
                          <DetailRow label="Landing Type" value={shot.landing_type} />
                          <DetailRow label="Landing Zone" value={shot.landing_zone} />
                          <DetailRow label="Point End" value={shot.is_point_end ? 'Yes' : 'No'} />
                          <DetailRow label="Error Type" value={shot.unforced_error_type} />
                          <DetailRow label="Error Source" value={shot.unforced_error_source} />
                          <DetailRow label="Serve Detail" value={shot.serve_detail} />
                          <DetailRow label="RoS Type" value={shot.return_of_serve_type} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === '') return null
  
  return (
    <div>
      <span className="text-neutral-500">{label}:</span>{' '}
      <span className="text-neutral-300">{String(value)}</span>
    </div>
  )
}
