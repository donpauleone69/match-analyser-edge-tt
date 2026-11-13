/**
 * MatchListSection — match cards for the find/catalog screen.
 */

import { useState } from 'react'
import { Button } from '@/ui-mine/Button'
import { Card } from '@/ui-mine/Card'
import type { DBMatch, DBPlayer, DBSet, DBTournament } from '@/data'
import { useNavigate } from 'react-router-dom'
import { MatchResultEntryModal } from './MatchResultEntryModal'
import { THEM_SIDE_LABEL } from '@/helpers/themSide'
import { deriveSetTaggingStatus } from '@/rules/derive/set/deriveSetTaggingStatus'
import { toCalendarDate } from '@/rules/matchList'

interface MatchListSectionProps {
  matches: DBMatch[]
  matchSets: Record<string, DBSet[]>
  taggedAtByMatch: Record<string, string | null>
  isLoading: boolean
  emptyBecauseFilter?: boolean
  onCreateNew: () => void
  onClearFilters?: () => void
  players: DBPlayer[]
  tournaments: DBTournament[]
  getPlayerName: (id: string) => string
  getTournamentName: (id: string | null) => string
  onRefresh?: () => void
}

function formatTaggedLabel(iso: string | null | undefined): string | null {
  if (!iso) return null
  const day = toCalendarDate(iso)
  if (!day) return null
  return new Date(day).toLocaleDateString()
}

function matchTaggingBadge(sets: DBSet[]): { label: string; tone: 'progress' | 'done' | 'todo' } | null {
  if (sets.length === 0) return null
  // Rally counts aren't on this screen; phase / is_tagged still drive status.
  const statuses = sets.map((s) => deriveSetTaggingStatus(s, 0))
  if (statuses.every((s) => s === 'tagged')) return { label: 'Tagged', tone: 'done' }
  if (statuses.some((s) => s === 'in_progress')) return { label: 'In progress', tone: 'progress' }
  if (statuses.some((s) => s === 'not_started')) return { label: 'Not tagged', tone: 'todo' }
  return null
}

export function MatchListSection({
  matches,
  matchSets,
  taggedAtByMatch,
  isLoading,
  emptyBecauseFilter = false,
  onCreateNew,
  onClearFilters,
  getPlayerName,
  getTournamentName,
  onRefresh,
}: MatchListSectionProps) {
  const navigate = useNavigate()
  const [isLoadingSets, setIsLoadingSets] = useState(false)
  const [matchForResults, setMatchForResults] = useState<DBMatch | null>(null)
  const [setsForResults, setSetsForResults] = useState<DBSet[]>([])

  const opponentName = (match: DBMatch) =>
    match.player2_id ? getPlayerName(match.player2_id) : THEM_SIDE_LABEL

  const handleEnterResults = async (match: DBMatch) => {
    setIsLoadingSets(true)
    try {
      const loaded = matchSets[match.id] ?? []
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

  if (matches.length === 0) {
    return (
      <Card className="p-8 text-center space-y-3">
        {emptyBecauseFilter ? (
          <>
            <p className="text-neutral-400">No matches match these filters</p>
            <p className="text-sm text-neutral-500">Clear filters or widen the date range.</p>
            {onClearFilters && (
              <Button variant="secondary" onClick={onClearFilters}>
                Clear filters
              </Button>
            )}
          </>
        ) : (
          <>
            <p className="text-neutral-400">No matches yet</p>
            <p className="text-sm text-neutral-500">
              Create a match from Home, or restore one with Account → Import a match file.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={onCreateNew}>New match</Button>
              <Button variant="secondary" onClick={() => navigate('/settings')}>
                Import match file
              </Button>
            </div>
          </>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {matches.map((match) => {
          const player1Name = getPlayerName(match.player1_id)
          const player2Name = opponentName(match)
          const tournamentName = getTournamentName(match.tournament_id)
          const setsForMatch = matchSets[match.id] || []
          const badge = matchTaggingBadge(setsForMatch)
          const taggedLabel = formatTaggedLabel(taggedAtByMatch[match.id])
          const canStartTagging = setsForMatch.every(
            (s) => !s.tagging_phase || s.tagging_phase === 'not_started'
          )
          const needsContinue = setsForMatch.some(
            (s) => deriveSetTaggingStatus(s, 0) === 'in_progress'
          )

          return (
            <Card key={match.id} className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-semibold text-neutral-50">
                      {player1Name} vs {player2Name}
                    </h3>
                    {badge?.tone === 'progress' && (
                      <span className="px-2 py-0.5 text-xs bg-yellow-900/50 text-yellow-400 rounded">
                        {badge.label}
                      </span>
                    )}
                    {badge?.tone === 'done' && (
                      <span className="px-2 py-0.5 text-xs bg-green-900/50 text-green-400 rounded">
                        {badge.label}
                      </span>
                    )}
                    {badge?.tone === 'todo' && (
                      <span className="px-2 py-0.5 text-xs bg-neutral-800 text-neutral-400 rounded">
                        {badge.label}
                      </span>
                    )}
                    {!match.player2_id && (
                      <span className="px-2 py-0.5 text-xs bg-neutral-800 text-neutral-400 rounded">
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
                          const setsWithScores = setsForMatch.filter(
                            (s) => s.player1_score_final > 0 || s.player2_score_final > 0
                          )
                          if (setsWithScores.length === 0) return null
                          return (
                            <p className="text-xs text-neutral-500">
                              <span className="font-medium text-neutral-400">Set scores:</span>{' '}
                              {setsWithScores
                                .map((s) => `${s.player1_score_final}-${s.player2_score_final}`)
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
                      <span className="font-medium text-neutral-300">Match date:</span>{' '}
                      {new Date(match.match_date).toLocaleDateString()}
                    </p>
                    {taggedLabel && (
                      <p>
                        <span className="font-medium text-neutral-300">Date tagged:</span>{' '}
                        {taggedLabel}
                      </p>
                    )}
                    {tournamentName && (
                      <p>
                        <span className="font-medium text-neutral-300">Tournament:</span>{' '}
                        {tournamentName}
                        {match.round && ` (${match.round.replace('_', ' ')})`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:ml-4 sm:justify-end">
                  <Button onClick={() => navigate(`/matches/${match.id}`)} size="sm">
                    Review
                  </Button>
                  {canStartTagging && (
                    <Button
                      onClick={() => navigate(`/matches/${match.id}/tag?set=1&mode=pass1focus`)}
                      size="sm"
                      variant="secondary"
                    >
                      Start tagging
                    </Button>
                  )}
                  {needsContinue && !canStartTagging && (
                    <Button
                      onClick={() => {
                        const open = setsForMatch.find(
                          (s) => deriveSetTaggingStatus(s, 0) === 'in_progress'
                        )
                        const setNum = open?.set_number ?? 1
                        navigate(`/matches/${match.id}/tag?set=${setNum}&mode=pass1focus`)
                      }}
                      size="sm"
                      variant="secondary"
                    >
                      Continue tagging
                    </Button>
                  )}
                  <Button
                    onClick={() => navigate(`/matches/${match.id}?tab=details`)}
                    size="sm"
                    variant="secondary"
                  >
                    Details
                  </Button>
                  {match.winner_id === null && badge?.tone !== 'done' && (
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
