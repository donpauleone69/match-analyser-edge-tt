/**
 * MatchListSection - Display list of matches
 */

import { useState, useEffect } from 'react'
import { Button } from '@/ui-mine/Button'
import { Card } from '@/ui-mine/Card'
import type { DBMatch, DBSet } from '@/data'
import { useNavigate } from 'react-router-dom'
import { SetSelectionModal } from './SetSelectionModal'
import { MatchResultEntryModal } from './MatchResultEntryModal'
import { setDb } from '@/data'
const { getByMatchId: getSetsByMatchId } = setDb

interface MatchListSectionProps {
  matches: DBMatch[]
  isLoading: boolean
  onCreateNew: () => void
  getPlayerName: (id: string) => string
  getTournamentName: (id: string | null) => string
  onRefresh?: () => void
}

export function MatchListSection({
  matches,
  isLoading,
  onCreateNew,
  getPlayerName,
  getTournamentName,
  onRefresh,
}: MatchListSectionProps) {
  const navigate = useNavigate()
  const [selectedMatch, setSelectedMatch] = useState<DBMatch | null>(null)
  const [sets, setSets] = useState<DBSet[]>([])
  const [isLoadingSets, setIsLoadingSets] = useState(false)
  
  // Result entry modal state
  const [matchForResults, setMatchForResults] = useState<DBMatch | null>(null)
  const [setsForResults, setSetsForResults] = useState<DBSet[]>([])
  
  // Load sets for all matches to display point scores
  const [matchSets, setMatchSets] = useState<Record<string, DBSet[]>>({})
  
  useEffect(() => {
    const loadAllSets = async () => {
      const setsMap: Record<string, DBSet[]> = {}
      for (const match of matches) {
        const sets = await getSetsByMatchId(match.id)
        setsMap[match.id] = sets
      }
      setMatchSets(setsMap)
    }
    if (matches.length > 0) {
      loadAllSets()
    }
  }, [matches])
  
  const handleTagMatch = async (match: DBMatch) => {
    setIsLoadingSets(true)
    try {
      const matchSets = await getSetsByMatchId(match.id)
      setSets(matchSets)
      setSelectedMatch(match)
    } catch (error) {
      console.error('Failed to load sets:', error)
      alert('Failed to load sets for this match')
    } finally {
      setIsLoadingSets(false)
    }
  }
  
  const handleCloseModal = () => {
    setSelectedMatch(null)
    setSets([])
  }
  
  const handleEnterResults = async (match: DBMatch) => {
    setIsLoadingSets(true)
    try {
      const matchSets = await getSetsByMatchId(match.id)
      setSetsForResults(matchSets)
      setMatchForResults(match)
    } catch (error) {
      console.error('Failed to load sets:', error)
      alert('Failed to load sets for this match')
    } finally {
      setIsLoadingSets(false)
    }
  }
  
  const handleCloseResultsModal = () => {
    setMatchForResults(null)
    setSetsForResults([])
  }
  
  const handleResultsSaved = () => {
    // Reload matches from parent
    if (onRefresh) {
      onRefresh()
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-400">Loading matches...</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <Button onClick={onCreateNew}>
        Create Match
      </Button>
      
      {matches.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-neutral-400">No matches yet</p>
          <p className="text-sm text-neutral-500 mt-2">
            Create your first match to get started
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {matches.map(match => {
            const player1Name = getPlayerName(match.player1_id)
            const player2Name = getPlayerName(match.player2_id)
            const tournamentName = getTournamentName(match.tournament_id)
            const isComplete = match.step1_complete && match.step2_complete
            
            return (
              <Card key={match.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-neutral-50">
                        {player1Name} vs {player2Name}
                      </h3>
                      {!isComplete && match.tagging_mode && (
                        <span className="px-2 py-1 text-xs bg-yellow-900/50 text-yellow-400 rounded">
                          In Progress
                        </span>
                      )}
                      {isComplete && (
                        <span className="px-2 py-1 text-xs bg-green-900/50 text-green-400 rounded">
                          Complete
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-neutral-400">
                      {match.winner_id ? (
                        <>
                          <p>
                            <span className="font-medium text-neutral-300">Winner:</span>{' '}
                            <span className="text-green-400 font-semibold">
                              {getPlayerName(match.winner_id)}
                            </span>
                            {match.set_score_summary && (
                              <span className="ml-2">({match.set_score_summary})</span>
                            )}
                          </p>
                          
                          {/* Show individual set point scores if available */}
                          {(() => {
                            const sets = matchSets[match.id] || []
                            const setsWithScores = sets.filter(s => s.player1_final_score > 0 || s.player2_final_score > 0)
                            if (setsWithScores.length > 0) {
                              return (
                                <p className="text-xs text-neutral-500">
                                  <span className="font-medium text-neutral-400">Set scores:</span>{' '}
                                  {setsWithScores
                                    .map(s => `${s.player1_final_score}-${s.player2_final_score}`)
                                    .join(', ')}
                                </p>
                              )
                            }
                            return null
                          })()}
                        </>
                      ) : (
                        <p>
                          <span className="font-medium text-neutral-300">Score:</span>{' '}
                          {match.player1_sets_won} - {match.player2_sets_won}
                          <span className="ml-2 text-yellow-400 text-xs">
                            (Result not entered)
                          </span>
                        </p>
                      )}
                      <p>
                        <span className="font-medium text-neutral-300">Date:</span>{' '}
                        {new Date(match.match_date).toLocaleDateString()}
                      </p>
                      {tournamentName && (
                        <p>
                          <span className="font-medium text-neutral-300">Tournament:</span>{' '}
                          {tournamentName}
                          {match.round && ` (${match.round.replace('_', ' ')})`}
                        </p>
                      )}
                      {match.tagging_mode && (
                        <p>
                          <span className="font-medium text-neutral-300">Tagging:</span>{' '}
                          <span className="capitalize">{match.tagging_mode}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    {/* Show "Enter Match Result" if no winner yet */}
                    {match.winner_id === null && !isComplete && (
                      <Button
                        onClick={() => handleEnterResults(match)}
                        size="sm"
                        disabled={isLoadingSets}
                      >
                        Enter Match Result
                      </Button>
                    )}
                    
                    {/* Show "Tag Match" only after results are entered */}
                    {match.winner_id !== null && !isComplete && (
                      <Button
                        onClick={() => handleTagMatch(match)}
                        size="sm"
                        disabled={isLoadingSets}
                      >
                        {match.tagging_mode ? 'Resume Tagging' : 'Tag Match'}
                      </Button>
                    )}
                    
                    {isComplete && (
                      <Button
                        onClick={() => navigate(`/data-viewer?match=${match.id}`)}
                        variant="secondary"
                        size="sm"
                      >
                        View Data
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      
      {/* Match Result Entry Modal */}
      {matchForResults && (
        <MatchResultEntryModal
          match={matchForResults}
          sets={setsForResults}
          player1Name={getPlayerName(matchForResults.player1_id)}
          player2Name={getPlayerName(matchForResults.player2_id)}
          onClose={handleCloseResultsModal}
          onSave={handleResultsSaved}
        />
      )}
      
      {/* Set Selection Modal */}
      {selectedMatch && (
        <SetSelectionModal
          matchId={selectedMatch.id}
          sets={sets}
          player1Name={getPlayerName(selectedMatch.player1_id)}
          player2Name={getPlayerName(selectedMatch.player2_id)}
          player1Id={selectedMatch.player1_id}
          player2Id={selectedMatch.player2_id}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}

