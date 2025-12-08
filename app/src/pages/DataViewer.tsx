import { useEffect, useState } from 'react'
import { db, getDatabaseStats } from '@/data/db'
import type { DBMatch } from '@/data/entities/matches/match.types'
import type { DBSet } from '@/data/entities/sets/set.types'
import type { DBRally } from '@/data/entities/rallies/rally.types'
import type { DBShot } from '@/data/entities/shots/shot.types'
import type { DBPlayer } from '@/data/entities/players/player.types'
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
  player1?: DBPlayer
  player2?: DBPlayer
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
      const [statsData, matches, sets, rallies, shots, players] = await Promise.all([
        getDatabaseStats(),
        db.matches.toArray(),
        db.sets.toArray(),
        db.rallies.toArray(),
        db.shots.toArray(),
        db.players.toArray(),
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
              .sort((a, b) => (a.rally_index || 0) - (b.rally_index || 0))
              .map(rally => {
                const rallyShots = shots
                  .filter(s => s.rally_id === rally.id)
                  .sort((a, b) => a.shot_index - b.shot_index)
                
                return { ...rally, shots: rallyShots }
              })
            
            return { ...set, rallies: setRallies }
          })
        
        const player1 = players.find(p => p.id === match.player1_id)
        const player2 = players.find(p => p.id === match.player2_id)
        
        return { ...match, sets: matchSets, player1, player2 }
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
        <div className="max-w-full mx-auto p-4 md:p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-neutral-400">Loading data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="max-w-full mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-50 flex items-center gap-3">
              <Database className="h-6 w-6 md:h-8 md:w-8 text-brand-primary" />
              Database Table Viewer
            </h1>
            <p className="text-neutral-400 mt-2 text-sm md:text-base">
              Complete view of all database fields (Match → Set → Rally → Shot)
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

        {/* Hierarchical Data Tables */}
        <div className="space-y-4">
          {matchesWithData.length === 0 ? (
            <div className="bg-bg-card rounded-lg border border-neutral-700 p-8 text-center">
              <p className="text-neutral-400">No matches in database yet</p>
            </div>
          ) : (
            matchesWithData.map(match => (
              <MatchTable
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

interface MatchTableProps {
  match: MatchWithData
  isExpanded: boolean
  onToggle: () => void
  expandedSets: Set<string>
  expandedRallies: Set<string>
  onToggleSet: (id: string) => void
  onToggleRally: (id: string) => void
}

function MatchTable({ match, isExpanded, onToggle, expandedSets, expandedRallies, onToggleSet, onToggleRally }: MatchTableProps) {
  const p1Name = match.player1 ? `${match.player1.first_name} ${match.player1.last_name}` : match.player1_id
  const p2Name = match.player2 ? `${match.player2.first_name} ${match.player2.last_name}` : match.player2_id
  
  return (
    <div className="bg-bg-card rounded-lg border border-neutral-700 overflow-hidden">
      {/* Match Header */}
      <button
        onClick={onToggle}
        className="w-full p-3 md:p-4 bg-bg-shell hover:bg-neutral-800/50 transition-colors flex items-center gap-3 text-left"
      >
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-neutral-400 shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-neutral-400 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-neutral-50">
            MATCH: {p1Name} vs {p2Name}
          </div>
          <div className="text-sm text-neutral-400 mt-1">
            {match.sets.length} sets • {match.sets.reduce((acc, s) => acc + s.rallies.length, 0)} rallies • {match.sets.reduce((acc, s) => s.rallies.reduce((a, r) => a + r.shots.length, acc), 0)} shots
          </div>
        </div>
      </button>

      {/* Match Table */}
      {isExpanded && (
        <div className="border-t border-neutral-700 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-neutral-900">
              <tr>
                <th className="px-3 py-2 text-left text-neutral-400 font-medium">Field</th>
                <th className="px-3 py-2 text-left text-neutral-400 font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              <TableRow label="id" value={match.id} />
              <TableRow label="tournament_id" value={match.tournament_id} />
              <TableRow label="round" value={match.round} />
              <TableRow label="player1_id" value={match.player1_id} />
              <TableRow label="player2_id" value={match.player2_id} />
              <TableRow label="first_server_id" value={match.first_server_id} />
              <TableRow label="winner_id" value={match.winner_id} />
              <TableRow label="player1_sets_final" value={match.player1_sets_final} />
              <TableRow label="player2_sets_final" value={match.player2_sets_final} />
              <TableRow label="best_of" value={match.best_of} />
              <TableRow label="match_date" value={match.match_date} />
              <TableRow label="tagging_mode" value={match.tagging_mode} />
              <TableRow label="match_detail_level" value={match.match_detail_level} />
              <TableRow label="has_video" value={match.has_video} />
              <TableRow label="video_count" value={match.video_count} />
              <TableRow label="total_coverage" value={match.total_coverage} />
              <TableRow label="step1_complete" value={match.step1_complete} />
              <TableRow label="step2_complete" value={match.step2_complete} />
              <TableRow label="created_at" value={match.created_at} />
            </tbody>
          </table>

          {/* Sets */}
          <div className="border-t-4 border-neutral-600 mt-2">
            {match.sets.map(set => (
              <SetTable
                key={set.id}
                set={set}
                isExpanded={expandedSets.has(set.id!)}
                onToggle={() => onToggleSet(set.id!)}
                expandedRallies={expandedRallies}
                onToggleRally={onToggleRally}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface SetTableProps {
  set: SetWithData
  isExpanded: boolean
  onToggle: () => void
  expandedRallies: Set<string>
  onToggleRally: (id: string) => void
}

function SetTable({ set, isExpanded, onToggle, expandedRallies, onToggleRally }: SetTableProps) {
  return (
    <div className="border-b border-neutral-700 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full p-3 pl-8 hover:bg-neutral-800/30 transition-colors flex items-center gap-3 text-left bg-neutral-900/50"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" />
        )}
        <div className="flex-1">
          <div className="text-sm font-medium text-brand-primary">
            SET {set.set_number}: {set.player1_score_final}-{set.player2_score_final}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {set.rallies.length} rallies • {set.rallies.reduce((acc, r) => acc + r.shots.length, 0)} shots
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="bg-neutral-950/50">
          <table className="w-full text-xs">
            <thead className="bg-neutral-900">
              <tr>
                <th className="px-3 py-2 text-left text-neutral-400 font-medium">Field</th>
                <th className="px-3 py-2 text-left text-neutral-400 font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              <TableRow label="id" value={set.id} />
              <TableRow label="match_id" value={set.match_id} />
              <TableRow label="set_number" value={set.set_number} />
              <TableRow label="player1_score_final" value={set.player1_score_final} />
              <TableRow label="player2_score_final" value={set.player2_score_final} />
              <TableRow label="winner_id" value={set.winner_id} />
              <TableRow label="player1_sets_before" value={set.player1_sets_before} />
              <TableRow label="player1_sets_after" value={set.player1_sets_after} />
              <TableRow label="player2_sets_before" value={set.player2_sets_before} />
              <TableRow label="player2_sets_after" value={set.player2_sets_after} />
              <TableRow label="set_first_server_id" value={set.set_first_server_id} />
              <TableRow label="has_video" value={set.has_video} />
              <TableRow label="video_segments" value={set.video_segments} />
              <TableRow label="video_contexts" value={set.video_contexts} />
              <TableRow label="end_of_set_timestamp" value={set.end_of_set_timestamp} />
              <TableRow label="is_tagged" value={set.is_tagged} />
              <TableRow label="tagging_started_at" value={set.tagging_started_at} />
              <TableRow label="tagging_completed_at" value={set.tagging_completed_at} />
              <TableRow label="tagging_phase" value={set.tagging_phase} />
              <TableRow label="phase1_last_rally" value={set.phase1_last_rally} />
              <TableRow label="phase1_total_rallies" value={set.phase1_total_rallies} />
              <TableRow label="phase2_last_shot_index" value={set.phase2_last_shot_index} />
              <TableRow label="phase2_total_shots" value={set.phase2_total_shots} />
            </tbody>
          </table>

          {/* Rallies */}
          <div className="border-t-4 border-neutral-500 mt-2">
            {set.rallies.map((rally, idx) => (
              <RallyTable
                key={rally.id}
                rally={rally}
                rallyNumber={idx + 1}
                isExpanded={expandedRallies.has(rally.id!)}
                onToggle={() => onToggleRally(rally.id!)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface RallyTableProps {
  rally: RallyWithData
  rallyNumber: number
  isExpanded: boolean
  onToggle: () => void
}

function RallyTable({ rally, rallyNumber, isExpanded, onToggle }: RallyTableProps) {
  return (
    <div className="border-b border-neutral-800 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full p-2 pl-16 hover:bg-neutral-800/30 transition-colors flex items-center gap-2 text-left"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-neutral-500 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-neutral-500 shrink-0" />
        )}
        <div className="flex-1">
          <div className="text-xs text-yellow-400 font-medium">
            RALLY {rallyNumber}: {rally.shots.length} shots • scoring={String(rally.is_scoring)} • winner={rally.winner_id || 'null'}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="bg-black/30">
          <table className="w-full text-xs">
            <thead className="bg-neutral-900">
              <tr>
                <th className="px-3 py-2 text-left text-neutral-400 font-medium">Field</th>
                <th className="px-3 py-2 text-left text-neutral-400 font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              <TableRow label="id" value={rally.id} />
              <TableRow label="set_id" value={rally.set_id} />
              <TableRow label="rally_index" value={rally.rally_index} />
              <TableRow label="video_id" value={rally.video_id} />
              <TableRow label="has_video_data" value={rally.has_video_data} />
              <TableRow label="server_id" value={rally.server_id} />
              <TableRow label="receiver_id" value={rally.receiver_id} />
              <TableRow label="winner_id" value={rally.winner_id} highlight={!rally.winner_id} />
              <TableRow label="is_scoring" value={rally.is_scoring} />
              <TableRow label="player1_score_before" value={rally.player1_score_before} />
              <TableRow label="player2_score_before" value={rally.player2_score_before} />
              <TableRow label="player1_score_after" value={rally.player1_score_after} />
              <TableRow label="player2_score_after" value={rally.player2_score_after} />
              <TableRow label="point_end_type" value={rally.point_end_type} highlight={!rally.point_end_type && rally.is_scoring} />
              <TableRow label="is_highlight" value={rally.is_highlight} />
              <TableRow label="framework_confirmed" value={rally.framework_confirmed} />
              <TableRow label="detail_complete" value={rally.detail_complete} />
              <TableRow label="server_corrected" value={rally.server_corrected} />
              <TableRow label="score_corrected" value={rally.score_corrected} />
              <TableRow label="correction_notes" value={rally.correction_notes} />
            </tbody>
          </table>

          {/* Shots */}
          <div className="border-t-4 border-neutral-400 mt-2 p-3 pl-6">
            <div className="text-xs font-semibold text-cyan-400 mb-2">SHOTS ({rally.shots.length}):</div>
            {rally.shots.map(shot => (
              <ShotTable key={shot.id} shot={shot} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ShotTable({ shot }: { shot: DBShot }) {
  return (
    <div className="mb-4 bg-neutral-900/70 border border-cyan-900/50 rounded overflow-hidden">
      <div className="bg-cyan-950/30 px-3 py-1.5 border-b border-cyan-900/50">
        <span className="text-xs font-mono font-semibold text-cyan-300">
          Shot {shot.shot_index} - Player: {shot.player_id}
        </span>
      </div>
      <table className="w-full text-xs">
        <tbody className="divide-y divide-neutral-800">
          <TableRow label="id" value={shot.id} />
          <TableRow label="rally_id" value={shot.rally_id} />
          <TableRow label="video_id" value={shot.video_id} />
          <TableRow label="timestamp_start" value={shot.timestamp_start} />
          <TableRow label="timestamp_end" value={shot.timestamp_end} />
          <TableRow label="shot_index" value={shot.shot_index} />
          <TableRow label="player_id" value={shot.player_id} />
          {/* Recorded Data */}
          <TableRow label="serve_spin_family" value={shot.serve_spin_family} highlight={shot.shot_index === 1 && !shot.serve_spin_family} />
          <TableRow label="serve_type" value={shot.serve_type} />
          <TableRow label="shot_length" value={shot.shot_length} highlight={(shot.shot_index === 1 || shot.shot_index === 2) && !shot.shot_length} />
          <TableRow label="shot_wing" value={shot.shot_wing} highlight={shot.shot_index > 1 && !shot.shot_wing} />
          <TableRow label="intent" value={shot.intent} highlight={shot.shot_index > 1 && !shot.intent} />
          <TableRow label="shot_result" value={shot.shot_result} />
          {/* Derived Data */}
          <TableRow label="shot_origin" value={shot.shot_origin} highlight={!shot.shot_origin} />
          <TableRow label="shot_target" value={shot.shot_target} highlight={!shot.shot_target} />
          <TableRow label="shot_label" value={shot.shot_label} />
          <TableRow label="is_rally_end" value={shot.is_rally_end} />
          <TableRow label="rally_end_role" value={shot.rally_end_role} />
          {/* Subjective Data */}
          <TableRow label="intent_quality" value={shot.intent_quality} />
          <TableRow label="pressure_level" value={shot.pressure_level} />
          {/* Inferred Data */}
          <TableRow label="shot_type" value={shot.shot_type} />
          <TableRow label="shot_contact_timing" value={shot.shot_contact_timing} />
          <TableRow label="player_position" value={shot.player_position} />
          <TableRow label="player_distance" value={shot.player_distance} />
          <TableRow label="shot_spin" value={shot.shot_spin} />
          <TableRow label="shot_speed" value={shot.shot_speed} />
          <TableRow label="shot_arc" value={shot.shot_arc} />
          <TableRow label="is_third_ball_attack" value={shot.is_third_ball_attack} />
          <TableRow label="is_receive_attack" value={shot.is_receive_attack} />
          <TableRow label="is_tagged" value={shot.is_tagged} />
        </tbody>
      </table>
    </div>
  )
}

function TableRow({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  const displayValue = value === null || value === undefined ? 'null' : 
                       typeof value === 'boolean' ? String(value) :
                       typeof value === 'object' ? JSON.stringify(value) :
                       String(value)
  
  const valueColor = value === null || value === undefined ? 'text-red-400' :
                     typeof value === 'boolean' ? (value ? 'text-green-400' : 'text-orange-400') :
                     'text-neutral-300'
  
  return (
    <tr className={highlight ? 'bg-red-950/20' : ''}>
      <td className="px-3 py-1.5 text-neutral-500 font-mono whitespace-nowrap">{label}</td>
      <td className={`px-3 py-1.5 font-mono ${valueColor} break-all`}>{displayValue}</td>
    </tr>
  )
}
