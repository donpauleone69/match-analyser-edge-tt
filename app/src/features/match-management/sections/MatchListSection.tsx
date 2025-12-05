/**
 * MatchListSection - Display list of matches
 */

import { useState } from 'react'
import { Button } from '@/ui-mine/Button'
import { Card } from '@/ui-mine/Card'
import type { DBMatch, DBSet } from '@/database/types'
import { useNavigate } from 'react-router-dom'
import { SetSelectionModal } from './SetSelectionModal'
import { getSetsByMatchId } from '@/database/services/setService'

interface MatchListSectionProps {
  matches: DBMatch[]
  isLoading: boolean
  onCreateNew: () => void
  getPlayerName: (id: string) => string
  getTournamentName: (id: string | null) => string
}

export function MatchListSection({
  matches,
  isLoading,
  onCreateNew,
  getPlayerName,
  getTournamentName,
}: MatchListSectionProps) {
  const navigate = useNavigate()
  const [selectedMatch, setSelectedMatch] = useState<DBMatch | null>(null)
  const [sets, setSets] = useState<DBSet[]>([])
  const [isLoadingSets, setIsLoadingSets] = useState(false)
  
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
                      <p>
                        <span className="font-medium text-neutral-300">Score:</span>{' '}
                        {match.player1_sets_won} - {match.player2_sets_won}
                      </p>
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
                    {!isComplete && (
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

