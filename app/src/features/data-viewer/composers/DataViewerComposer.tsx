import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMatchStore, usePlayerStore, useTournamentStore, type DBSet } from '@/data'
import { getCompleteMatchData, type CompleteMatchData } from '@/data'
import { validateMatchData, type ValidationError } from '@/data/services/validation'
import { Card } from '@/ui-mine/Card'
import { Button } from '@/ui-mine/Button'
import { Icon } from '@/ui-mine/Icon'

export function DataViewerComposer() {
  const [searchParams] = useSearchParams()
  const matchIdFromUrl = searchParams.get('match')
  
  const { matches, load: loadMatches } = useMatchStore()
  const { players, load: loadPlayers } = usePlayerStore()
  const { tournaments, load: loadTournaments } = useTournamentStore()
  
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(matchIdFromUrl)
  const [matchData, setMatchData] = useState<CompleteMatchData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [validationWarnings, setValidationWarnings] = useState<ValidationError[]>([])

  useEffect(() => {
    loadMatches()
    loadPlayers()
    loadTournaments()
  }, [loadMatches, loadPlayers, loadTournaments])

  useEffect(() => {
    if (selectedMatchId) {
      loadMatchData(selectedMatchId)
    }
  }, [selectedMatchId])

  const loadMatchData = async (matchId: string) => {
    setIsLoading(true)
    try {
      const data = await getCompleteMatchData(matchId)
      setMatchData(data)
      
      // Run validation
      if (data && data.match) {
        const validation = validateMatchData(
          data.match,
          data.sets,
          data.rallies,
          data.shots
        )
        setValidationErrors(validation.errors)
        setValidationWarnings(validation.warnings)
      }
    } catch (error) {
      console.error('Failed to load match data:', error)
      alert('Failed to load match data')
    } finally {
      setIsLoading(false)
    }
  }

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    return player ? `${player.first_name} ${player.last_name}` : 'Unknown'
  }

  const getTournamentName = (tournamentId: string | null) => {
    if (!tournamentId) return null
    const tournament = tournaments.find(t => t.id === tournamentId)
    return tournament?.name
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-surface">
        <div className="text-center">
          <p className="text-neutral-400">Loading match data...</p>
        </div>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-surface">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-neutral-50 mb-2">
            No Matches Available
          </h2>
          <p className="text-neutral-400 mb-4">
            Create a match first to view data
          </p>
          <Button onClick={() => window.location.href = '/matches/create'}>
            Create Match
          </Button>
        </div>
      </div>
    )
  }

  if (!selectedMatchId) {
    return (
      <div className="h-screen overflow-y-auto bg-bg-surface">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <h1 className="text-3xl font-bold text-neutral-50">Match Data Viewer</h1>
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-neutral-50 mb-4">Select a Match</h2>
            <div className="space-y-3">
              {matches.map(match => (
                <button
                  key={match.id}
                  onClick={() => setSelectedMatchId(match.id)}
                  className="w-full text-left p-4 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors border border-neutral-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-neutral-50">
                        {getPlayerName(match.player1_id)} vs {getPlayerName(match.player2_id)}
                      </div>
                      <div className="text-sm text-neutral-400 mt-1">
                        {new Date(match.match_date).toLocaleDateString()}
                        {getTournamentName(match.tournament_id) && ` • ${getTournamentName(match.tournament_id)}`}
                      </div>
                    </div>
                    <div className="text-xl font-mono font-bold text-neutral-50">
                      {match.player1_sets_won} - {match.player2_sets_won}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (!matchData?.match) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-surface">
        <div className="text-center">
          <p className="text-neutral-400">Match not found</p>
          <Button onClick={() => setSelectedMatchId(null)} className="mt-4">
            Back to List
          </Button>
        </div>
      </div>
    )
  }

  const { match, sets, rallies, shots } = matchData
  const tournamentName = getTournamentName(match.tournament_id)

  return (
    <div className="h-screen overflow-y-auto bg-bg-surface">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button onClick={() => setSelectedMatchId(null)} variant="secondary" size="sm" className="mb-2">
              ← Back to List
            </Button>
            <h1 className="text-3xl font-bold text-neutral-50">Match Data Viewer</h1>
          </div>
          <Button onClick={() => {
            const json = JSON.stringify(matchData, null, 2)
            const blob = new Blob([json], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `match-${match.id}.json`
            a.click()
          }}>
            Export JSON
          </Button>
        </div>

        {/* Validation Errors and Warnings */}
        {(validationErrors.length > 0 || validationWarnings.length > 0) && (
          <Card className="p-6 border-l-4 border-l-yellow-500">
            <h2 className="text-xl font-semibold text-neutral-50 mb-4 flex items-center gap-2">
              <Icon name="alert" className="w-5 h-5 text-yellow-400" />
              Data Validation Issues
            </h2>
            
            {validationErrors.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-1.5">
                  <Icon name="x" className="w-4 h-4" />
                  Errors ({validationErrors.length})
                </h3>
                <ul className="space-y-1">
                  {validationErrors.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-300 pl-5">
                      • <span className="font-medium">{error.entity}</span>: {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {validationWarnings.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-1.5">
                  <Icon name="alert" className="w-4 h-4" />
                  Warnings ({validationWarnings.length})
                </h3>
                <ul className="space-y-1">
                  {validationWarnings.map((warning, idx) => (
                    <li key={idx} className="text-sm text-yellow-300 pl-5">
                      • <span className="font-medium">{warning.entity}</span>: {warning.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        {/* Match Metadata */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-neutral-50 mb-4">Match Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-neutral-400">Players</div>
              <div className="text-lg font-semibold text-neutral-50">
                {getPlayerName(match.player1_id)} vs {getPlayerName(match.player2_id)}
              </div>
            </div>
            <div>
              <div className="text-sm text-neutral-400">Final Score</div>
              <div className="text-2xl font-mono font-bold text-neutral-50">
                {match.player1_sets_won} - {match.player2_sets_won}
              </div>
                <div className="text-xs text-neutral-500 mt-1">
                  Best of {match.player1_sets_won + match.player2_sets_won + (match.winner_id ? 0 : 1)}
                </div>
            </div>
            <div>
              <div className="text-sm text-neutral-400">Winner</div>
              <div className="text-lg font-semibold text-green-400">
                {match.winner_id ? getPlayerName(match.winner_id) : 'In Progress'}
              </div>
            </div>
            <div>
              <div className="text-sm text-neutral-400">Date</div>
              <div className="text-lg font-semibold text-neutral-50">
                {new Date(match.match_date).toLocaleDateString()}
              </div>
            </div>
            {tournamentName && (
              <div className="col-span-2">
                <div className="text-sm text-neutral-400">Tournament</div>
                <div className="text-lg font-semibold text-neutral-50">
                  {tournamentName}
                  {match.round && ` · ${match.round.replace('_', ' ')}`}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Sets */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-neutral-50 mb-4">
            Set Scores ({sets.length} {sets.length === 1 ? 'Set' : 'Sets'})
          </h2>
          <div className="space-y-2">
            {sets.map((set, idx) => {
              const player1Won = set.player1_final_score > set.player2_final_score
              const player2Won = set.player2_final_score > set.player1_final_score
              const setRallies = rallies.filter(r => r.set_id === set.id)
              
              return (
                <div key={set.id} className="border border-neutral-700 rounded-lg p-4 bg-neutral-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-neutral-400">Set {idx + 1}</span>
                      {set.winner_id && (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-900 text-green-200">
                          Won by {getPlayerName(set.winner_id)}
                        </span>
                      )}
                      {set.is_tagged && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-900 text-blue-200 flex items-center gap-1">
                          <Icon name="check" className="w-3 h-3" />
                          Tagged
                        </span>
                      )}
                      {!set.is_tagged && setRallies.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-yellow-900 text-yellow-200">
                          In Progress
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-neutral-500">{getPlayerName(match.player1_id)}</div>
                        <div className={`font-mono text-2xl font-bold ${player1Won ? 'text-green-400' : 'text-neutral-400'}`}>
                          {set.player1_final_score}
                        </div>
                      </div>
                      <div className="text-neutral-600">-</div>
                      <div className="text-left">
                        <div className="text-xs text-neutral-500">{getPlayerName(match.player2_id)}</div>
                        <div className={`font-mono text-2xl font-bold ${player2Won ? 'text-green-400' : 'text-neutral-400'}`}>
                          {set.player2_final_score}
                        </div>
                      </div>
                    </div>
                  </div>
                  {setRallies.length > 0 && (
                    <div className="text-xs text-neutral-500 mt-2 flex items-center gap-4">
                      <span>{setRallies.length} rallies</span>
                      <span>{shots.filter(s => setRallies.some(r => r.id === s.rally_id)).length} shots</span>
                      {set.tagging_started_at && (
                        <span>Started: {new Date(set.tagging_started_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        {/* Rallies */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-neutral-50 mb-4">Rallies ({rallies.length})</h2>
          {rallies.length === 0 ? (
            <p className="text-neutral-400">No rally data available. Video tagging not yet implemented for this match.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {rallies.map((rally) => {
                const rallySet = sets.find(s => s.id === rally.set_id)
                const rallyShots = shots.filter(s => s.rally_id === rally.id)
                
                return (
                  <div key={rally.id} className="flex items-center justify-between p-3 bg-neutral-800 rounded text-sm border border-neutral-700">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-neutral-500">
                        Set {rallySet?.set_number || '?'}
                      </span>
                      <span className="text-neutral-300">Rally {rally.rally_index}</span>
                      <span className="text-xs text-neutral-500">
                        Server: {getPlayerName(rally.server_id)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-neutral-400">{rallyShots.length} shots</span>
                      <span className="font-mono text-xs text-neutral-500">
                        Score: {rally.player1_score_after}-{rally.player2_score_after}
                      </span>
                      {rally.winner_id && (
                        <span className="text-green-400">
                          Winner: {getPlayerName(rally.winner_id)}
                        </span>
                      )}
                      {!rally.framework_confirmed && (
                        <span className="text-xs px-2 py-0.5 rounded bg-yellow-900 text-yellow-200">
                          Not Confirmed
                        </span>
                      )}
                      {rally.detail_complete && (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-900 text-green-200">
                          Complete
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Shots - Detailed View */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-neutral-50 mb-4">Shots ({shots.length})</h2>
          {shots.length === 0 ? (
            <p className="text-neutral-400">No shot data available. Video tagging not yet implemented for this match.</p>
          ) : (
            <>
              <div className="mb-4 p-4 bg-neutral-900 rounded-lg border border-neutral-700">
                <h3 className="text-sm font-semibold text-neutral-300 mb-2">Data Legend</h3>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="font-semibold text-blue-400">RECORDED:</span>
                    <span className="text-neutral-400"> User-tagged data</span>
                  </div>
                  <div>
                    <span className="font-semibold text-green-400">DERIVED:</span>
                    <span className="text-neutral-400"> Calculated from rules</span>
                  </div>
                  <div>
                    <span className="font-semibold text-purple-400">INFERRED:</span>
                    <span className="text-neutral-400"> AI-predicted data</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {(() => {
                  // Create rally_id → rally_index mapping and rally_id → set mapping
                  const rallyIndexMap = new Map<string, number>()
                  const rallySetMap = new Map<string, DBSet>()
                  rallies.forEach(rally => {
                    rallyIndexMap.set(rally.id, rally.rally_index)
                    const rallySet = sets.find(s => s.id === rally.set_id)
                    if (rallySet) {
                      rallySetMap.set(rally.id, rallySet)
                    }
                  })
                  
                  // Sort shots by rally_index, then shot_index
                  const sortedShots = [...shots].sort((a, b) => {
                    const rallyA = rallyIndexMap.get(a.rally_id) || 0
                    const rallyB = rallyIndexMap.get(b.rally_id) || 0
                    if (rallyA !== rallyB) return rallyA - rallyB
                    return a.shot_index - b.shot_index
                  })
                  
                  return (
                    <>
                      {sortedShots.slice(0, 50).map((shot) => {
                        const isServe = shot.shot_index === 1  // Serves are shot 1
                        const rallyNumber = rallyIndexMap.get(shot.rally_id) || '?'
                        const shotSet = rallySetMap.get(shot.rally_id)
                        
                        return (
                          <div key={shot.id} className="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
                        {/* Shot Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-xs font-medium text-neutral-500 mr-2">
                              Set {shotSet?.set_number || '?'} • Rally {rallyNumber}
                            </span>
                            <span className="text-lg font-semibold text-neutral-50">
                              Shot {shot.shot_index}
                            </span>
                            <span className="text-neutral-400 ml-2">by {getPlayerName(shot.player_id)}</span>
                            {shot.is_rally_end && (
                              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                                shot.rally_end_role === 'winner' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                              }`}>
                                {shot.rally_end_role === 'winner' ? 'Winner' : 'Error'}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-sm text-neutral-500">{shot.time.toFixed(2)}s</span>
                        </div>
                      
                      {/* Data Grid */}
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        {/* RECORDED DATA */}
                        {isServe && (
                          <>
                            {shot.serve_spin_family && (
                              <div>
                                <span className="text-blue-400 font-medium">Serve Spin:</span>
                                <span className="text-neutral-200 ml-2 capitalize">{shot.serve_spin_family}</span>
                              </div>
                            )}
                            {shot.serve_length && (
                              <div>
                                <span className="text-blue-400 font-medium">Serve Length:</span>
                                <span className="text-neutral-200 ml-2 capitalize">{shot.serve_length.replace('_', ' ')}</span>
                              </div>
                            )}
                          </>
                        )}
                        {!isServe && shot.wing && (
                          <div>
                            <span className="text-blue-400 font-medium">Wing:</span>
                            <span className="text-neutral-200 ml-2">{shot.wing}</span>
                          </div>
                        )}
                        {shot.intent && (
                          <div>
                            <span className="text-blue-400 font-medium">Intent:</span>
                            <span className="text-neutral-200 ml-2 capitalize">{shot.intent}</span>
                          </div>
                        )}
                        {shot.shot_result && (
                          <div>
                            <span className="text-blue-400 font-medium">Result:</span>
                            <span className="text-neutral-200 ml-2 capitalize">{shot.shot_result.replace('_', ' ')}</span>
                          </div>
                        )}
                        
                        {/* DERIVED DATA */}
                        {shot.shot_origin && (
                          <div>
                            <span className="text-green-400 font-medium">Origin:</span>
                            <span className="text-neutral-200 ml-2 capitalize">{shot.shot_origin}</span>
                          </div>
                        )}
                        {shot.shot_destination && (
                          <div>
                            <span className="text-green-400 font-medium">Destination:</span>
                            <span className="text-neutral-200 ml-2 capitalize">{shot.shot_destination}</span>
                          </div>
                        )}
                        
                        {/* INFERRED DATA */}
                        {shot.inferred_shot_type && (
                          <div>
                            <span className="text-purple-400 font-medium">Shot Type:</span>
                            <span className="text-neutral-200 ml-2">{shot.inferred_shot_type.replace('_', ' ')}</span>
                            {shot.inferred_shot_confidence && (
                              <span className="text-xs text-neutral-500 ml-1">({shot.inferred_shot_confidence})</span>
                            )}
                          </div>
                        )}
                        {shot.inferred_spin && (
                          <div>
                            <span className="text-purple-400 font-medium">Spin:</span>
                            <span className="text-neutral-200 ml-2 capitalize">{shot.inferred_spin.replace('_', ' ')}</span>
                            {shot.inferred_spin_confidence && (
                              <span className="text-xs text-neutral-500 ml-1">({shot.inferred_spin_confidence})</span>
                            )}
                          </div>
                        )}
                        {shot.inferred_player_position && (
                          <div>
                            <span className="text-purple-400 font-medium">Position:</span>
                            <span className="text-neutral-200 ml-2">{shot.inferred_player_position.replace('_', ' ')}</span>
                          </div>
                        )}
                        {shot.inferred_distance_from_table && (
                          <div>
                            <span className="text-purple-400 font-medium">Distance:</span>
                            <span className="text-neutral-200 ml-2">{shot.inferred_distance_from_table.replace('_', ' ')}</span>
                          </div>
                        )}
                        {shot.inferred_pressure_level && (
                          <div>
                            <span className="text-purple-400 font-medium">Pressure:</span>
                            <span className="text-neutral-200 ml-2 capitalize">{shot.inferred_pressure_level.replace('_', ' ')}</span>
                          </div>
                        )}
                        {shot.inferred_is_third_ball_attack && (
                          <div>
                            <span className="text-purple-400 font-medium">3rd Ball Attack</span>
                          </div>
                        )}
                        {shot.inferred_is_receive_attack && (
                          <div>
                            <span className="text-purple-400 font-medium">Receive Attack</span>
                          </div>
                        )}
                        </div>
                      </div>
                        )
                      })}
                      {shots.length > 50 && (
                        <p className="text-neutral-400 text-center pt-2">
                          ... and {shots.length - 50} more shots
                        </p>
                      )}
                    </>
                  )
                })()}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

