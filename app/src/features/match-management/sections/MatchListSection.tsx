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
import type { LocalSyncStatus } from '@/data/cloud'

interface MatchListSectionProps {
  matches: DBMatch[]
  matchSets: Record<string, DBSet[]>
  taggedAtByMatch: Record<string, string | null>
  /** Per-match cloud sync when signed in / cloud configured */
  syncByMatch?: Record<string, LocalSyncStatus>
  showSyncBadges?: boolean
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
  syncByMatch = {},
  showSyncBadges = false,
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
      <Card className="p-4 text-center space-y-2 border border-dashed border-border">
        {emptyBecauseFilter ? (
          <>
            <p className="text-sm font-medium text-neutral-200">Nothing matches these filters</p>
            <p className="text-xs text-neutral-500">Widen opponent, tournament, or dates.</p>
            {onClearFilters && (
              <Button variant="secondary" size="sm" onClick={onClearFilters}>
                Clear filters
              </Button>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-neutral-200">No matches yet</p>
            <p className="text-xs text-neutral-500">Create from Home, or import under Account.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={onCreateNew}>
                New match
              </Button>
              <Button size="sm" variant="secondary" onClick={() => navigate('/')}>
                Home
              </Button>
              <Button size="sm" variant="secondary" onClick={() => navigate('/settings')}>
                Import
              </Button>
            </div>
          </>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
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
            <Card key={match.id} className="p-3 sm:p-4 border border-border">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="text-base sm:text-lg font-semibold text-neutral-50">
                      {player1Name} vs {player2Name}
                    </h3>
                    {badge?.tone === 'progress' && (
                      <span className="px-1.5 py-0.5 text-[11px] rounded bg-callout-warning-bg text-callout-warning border border-callout-warning-border">
                        {badge.label}
                      </span>
                    )}
                    {badge?.tone === 'done' && (
                      <span className="px-1.5 py-0.5 text-[11px] rounded bg-result-winner-bg text-result-winner">
                        {badge.label}
                      </span>
                    )}
                    {badge?.tone === 'todo' && (
                      <span className="px-1.5 py-0.5 text-[11px] rounded border border-border text-neutral-500">
                        {badge.label}
                      </span>
                    )}
                    {!match.player2_id && (
                      <span className="px-1.5 py-0.5 text-[11px] rounded border border-border text-neutral-500">
                        Opponent open
                      </span>
                    )}
                    {showSyncBadges && syncByMatch[match.id] === 'never' && (
                      <span
                        className="px-1.5 py-0.5 text-[11px] rounded border border-border text-neutral-500"
                        title="Not backed up to cloud yet"
                      >
                        Not backed up
                      </span>
                    )}
                    {showSyncBadges && syncByMatch[match.id] === 'changed' && (
                      <span
                        className="px-1.5 py-0.5 text-[11px] rounded bg-callout-warning-bg text-callout-warning border border-callout-warning-border"
                        title="Local tags changed since last cloud backup"
                      >
                        Backup stale
                      </span>
                    )}
                    {showSyncBadges && syncByMatch[match.id] === 'synced' && (
                      <span
                        className="px-1.5 py-0.5 text-[11px] rounded bg-result-winner-bg text-result-winner"
                        title="Match tags match last cloud backup"
                      >
                        Backed up
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5 text-sm text-neutral-400">
                    {match.winner_id ? (
                      <>
                        <p>
                          <span className="text-result-winner font-semibold">
                            {getPlayerName(match.winner_id)}
                          </span>
                          <span className="ml-1.5 text-neutral-500">
                            {match.player1_sets_final}–{match.player2_sets_final}
                          </span>
                        </p>
                        {(() => {
                          const setsWithScores = setsForMatch.filter(
                            (s) => s.player1_score_final > 0 || s.player2_score_final > 0
                          )
                          if (setsWithScores.length === 0) return null
                          return (
                            <p className="text-xs text-neutral-500">
                              Sets{' '}
                              {setsWithScores
                                .map((s) => `${s.player1_score_final}–${s.player2_score_final}`)
                                .join(', ')}
                            </p>
                          )
                        })()}
                      </>
                    ) : (
                      <p>
                        Score {match.player1_sets_final}–{match.player2_sets_final}
                      </p>
                    )}
                    <p className="text-xs text-neutral-500">
                      Match {new Date(match.match_date).toLocaleDateString()}
                      {taggedLabel ? ` · Tagged ${taggedLabel}` : ''}
                      {tournamentName
                        ? ` · ${tournamentName}${match.round ? ` (${match.round.replace('_', ' ')})` : ''}`
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:ml-4 sm:justify-end">
                  <Button onClick={() => navigate(`/matches/${match.id}`)} size="sm">
                    Review
                  </Button>
                  {canStartTagging && (
                    <Button
                      onClick={() => navigate(`/matches/${match.id}/tag?set=1`)}
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
                        navigate(`/matches/${match.id}/tag?set=${setNum}`)
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
