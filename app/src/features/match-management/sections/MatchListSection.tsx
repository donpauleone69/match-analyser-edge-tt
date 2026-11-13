/**
 * MatchListSection - Display list of matches
 */

import { useState, useEffect } from 'react'
import { Button } from '@/ui-mine/Button'
import { Card } from '@/ui-mine/Card'
import type { DBMatch, DBPlayer, DBSet, DBTournament } from '@/data'
import { useNavigate } from 'react-router-dom'
import { MatchResultEntryModal } from './MatchResultEntryModal'
import { setDb } from '@/data'
import { THEM_SIDE_LABEL } from '@/helpers/themSide'

const { getByMatchId: getSetsByMatchId } = setDb

interface MatchListSectionProps {
  matches: DBMatch[]
  isLoading: boolean
  onCreateNew: () => void
  players: DBPlayer[]
  tournaments: DBTournament[]
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
  const [isLoadingSets, setIsLoadingSets] = useState(false)

  const [matchForResults, setMatchForResults] = useState<DBMatch | null>(null)
  const [setsForResults, setSetsForResults] = useState<DBSet[]>([])

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

  const opponentName = (match: DBMatch) =>
    match.player2_id ? getPlayerName(match.player2_id) : THEM_SIDE_LABEL

  const handleEnterResults = async (match: DBMatch) => {
    setIsLoadingSets(true)
    try {
      const loaded = await getSetsByMatchId(match.id)
      setSetsForResults(loaded)
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
    if (onRefresh) onRefresh()
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
      {matches.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-neutral-400">No matches yet</p>
          <p className="text-sm text-neutral-500">
            Create a match from Library, or start here.
          </p>
          <Button onClick={onCreateNew}>New match</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {matches.map((match) => {
            const player1Name = getPlayerName(match.player1_id)
            const player2Name = opponentName(match)
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
                      {!match.player2_id && (
                        <span className="px-2 py-1 text-xs bg-neutral-800 text-neutral-400 rounded">
                          Opponent open
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
                            <span className="ml-2">
                              ({match.player1_sets_final}-{match.player2_sets_final})
                            </span>
                          </p>
                          {(() => {
                            const setsForMatch = matchSets[match.id] || []
                            const setsWithScores = setsForMatch.filter(
                              (s) =>
                                s.player1_score_final > 0 || s.player2_score_final > 0
                            )
                            if (setsWithScores.length === 0) return null
                            return (
                              <p className="text-xs text-neutral-500">
                                <span className="font-medium text-neutral-400">
                                  Set scores:
                                </span>{' '}
                                {setsWithScores
                                  .map(
                                    (s) =>
                                      `${s.player1_score_final}-${s.player2_score_final}`
                                  )
                                  .join(', ')}
                              </p>
                            )
                          })()}
                        </>
                      ) : (
                        <p>
                          <span className="font-medium text-neutral-300">Score:</span>{' '}
                          {match.player1_sets_final} - {match.player2_sets_final}
                        </p>
                      )}
                      <p>
                        <span className="font-medium text-neutral-300">Date:</span>{' '}
                        {new Date(match.match_date).toLocaleDateString()}
                      </p>
                      {tournamentName && (
                        <p>
                          <span className="font-medium text-neutral-300">
                            Tournament:
                          </span>{' '}
                          {tournamentName}
                          {match.round && ` (${match.round.replace('_', ' ')})`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 ml-4 justify-end">
                    <Button onClick={() => navigate(`/matches/${match.id}`)} size="sm">
                      Review
                    </Button>
                    {matchSets[match.id]?.every((s) => !s.tagging_phase || s.tagging_phase === 'not_started') && (
                      <Button
                        onClick={() => navigate(`/matches/${match.id}/tag?set=1&mode=pass1focus`)}
                        size="sm"
                        variant="secondary"
                      >
                        Start tagging
                      </Button>
                    )}
                    <Button
                      onClick={() => navigate(`/matches/${match.id}?tab=details`)}
                      size="sm"
                      variant="secondary"
                    >
                      Details
                    </Button>
                    {match.winner_id === null && !isComplete && (
                      <Button
                        onClick={() => handleEnterResults(match)}
                        size="sm"
                        variant="secondary"
                        disabled={isLoadingSets || !match.player2_id}
                      >
                        Enter Result
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {matchForResults && matchForResults.player2_id && (
        <MatchResultEntryModal
          match={matchForResults}
          sets={setsForResults}
          player1Name={getPlayerName(matchForResults.player1_id)}
          player2Name={getPlayerName(matchForResults.player2_id)}
          onClose={handleCloseResultsModal}
          onSave={handleResultsSaved}
        />
      )}
    </div>
  )
}
