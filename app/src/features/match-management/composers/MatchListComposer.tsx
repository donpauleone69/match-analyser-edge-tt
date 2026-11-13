/**
 * MatchListComposer — find + open matches (opponent, tournament, dates).
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMatchStore, usePlayerStore, useTournamentStore, setDb, type DBSet } from '@/data'
import { MatchListSection } from '../sections/MatchListSection'
import { MatchListFiltersBlock } from '../blocks/MatchListFiltersBlock'
import { Button, Icon } from '@/ui-mine'
import { useCloudStore } from '@/stores/cloudStore'
import { deriveAccountScope } from '@/rules/derive/account/deriveAccountScope'
import {
  deriveMatchTaggedAt,
  EMPTY_MATCH_LIST_FILTERS,
  filterSortMatches,
  type MatchListFilters,
  type MatchListSort,
} from '@/rules/matchList'

function parseFilters(params: URLSearchParams): MatchListFilters {
  const sortParam = params.get('sort')
  const sort: MatchListSort =
    sortParam === 'tagged_at' || sortParam === 'created_at' || sortParam === 'match_date'
      ? sortParam
      : 'match_date'
  return {
    opponentId: params.get('opponent') || null,
    tournamentId: params.get('tournament') || null,
    matchDateFrom: params.get('matchFrom') || null,
    matchDateTo: params.get('matchTo') || null,
    taggedDateFrom: params.get('taggedFrom') || null,
    taggedDateTo: params.get('taggedTo') || null,
    sort,
  }
}

function writeFilters(filters: MatchListFilters): URLSearchParams {
  const next = new URLSearchParams()
  if (filters.opponentId) next.set('opponent', filters.opponentId)
  if (filters.tournamentId) next.set('tournament', filters.tournamentId)
  if (filters.matchDateFrom) next.set('matchFrom', filters.matchDateFrom)
  if (filters.matchDateTo) next.set('matchTo', filters.matchDateTo)
  if (filters.taggedDateFrom) next.set('taggedFrom', filters.taggedDateFrom)
  if (filters.taggedDateTo) next.set('taggedTo', filters.taggedDateTo)
  if (filters.sort !== 'match_date') next.set('sort', filters.sort)
  return next
}

export function MatchListComposer() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { matches, isLoading, load: loadMatches } = useMatchStore()
  const profile = useCloudStore((state) => state.profile)
  const { players, load: loadPlayers } = usePlayerStore()
  const { tournaments, load: loadTournaments } = useTournamentStore()
  const [setsByMatch, setSetsByMatch] = useState<Record<string, DBSet[]>>({})

  const filters = useMemo(() => parseFilters(searchParams), [searchParams])

  useEffect(() => {
    loadMatches()
    loadPlayers()
    loadTournaments()
  }, [loadMatches, loadPlayers, loadTournaments])

  const getPlayerName = (playerId: string) => {
    const player = players.find((p) => p.id === playerId)
    return player ? `${player.first_name} ${player.last_name}` : 'Unknown Player'
  }

  const getTournamentName = (tournamentId: string | null) => {
    if (!tournamentId) return ''
    const tournament = tournaments.find((t) => t.id === tournamentId)
    return tournament ? tournament.name : 'Unknown Tournament'
  }

  const handleCreateNew = () => {
    navigate('/matches/create')
  }

  const handleRefresh = () => {
    loadMatches()
  }

  const scopedMatches = deriveAccountScope(profile, matches).matches
  const scopedMatchKey = scopedMatches.map((m) => m.id).join(',')

  useEffect(() => {
    let active = true
    ;(async () => {
      const map: Record<string, DBSet[]> = {}
      for (const match of scopedMatches) {
        map[match.id] = await setDb.getByMatchId(match.id)
      }
      if (active) setSetsByMatch(map)
    })().catch((err) => {
      console.error('[Matches] Failed to load sets for find filters:', err)
    })
    return () => {
      active = false
    }
    // scopedMatchKey captures id list; scopedMatches read from latest render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedMatchKey])

  const filterRows = useMemo(
    () =>
      scopedMatches.map((match) => ({
        id: match.id,
        player2_id: match.player2_id,
        tournament_id: match.tournament_id,
        match_date: match.match_date,
        created_at: match.created_at,
        tagged_at: deriveMatchTaggedAt(setsByMatch[match.id] ?? []),
        match,
      })),
    [scopedMatches, setsByMatch]
  )

  const filteredRows = useMemo(() => filterSortMatches(filterRows, filters), [filterRows, filters])
  const filteredMatches = filteredRows.map((r) => r.match)
  const taggedAtByMatch = useMemo(() => {
    const map: Record<string, string | null> = {}
    for (const row of filterRows) map[row.id] = row.tagged_at
    return map
  }, [filterRows])

  const opponentOptions = useMemo(() => {
    const ids = [...new Set(scopedMatches.map((m) => m.player2_id).filter(Boolean))] as string[]
    return ids
      .map((id) => ({ id, label: getPlayerName(id) }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [scopedMatches, players])

  const tournamentOptions = useMemo(() => {
    const ids = [...new Set(scopedMatches.map((m) => m.tournament_id).filter(Boolean))] as string[]
    return ids
      .map((id) => ({ id, label: getTournamentName(id) }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [scopedMatches, tournaments])

  const setFilters = (next: MatchListFilters) => {
    setSearchParams(writeFilters(next), { replace: true })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-50 flex items-center gap-3">
            <Icon name="swords" size="lg" className="text-brand-primary" />
            Matches
          </h1>
          <p className="text-neutral-400 mt-2 text-sm md:text-base">
            Find by opponent, tournament, match date, or date tagged. Open to review or continue
            tagging.
          </p>
        </div>
        {scopedMatches.length > 0 && (
          <Button onClick={handleCreateNew}>
            <Icon name="plus" size="sm" /> New match
          </Button>
        )}
      </div>

      {scopedMatches.length > 0 && (
        <MatchListFiltersBlock
          filters={filters}
          opponents={opponentOptions}
          tournaments={tournamentOptions}
          resultCount={filteredMatches.length}
          totalCount={scopedMatches.length}
          onChange={setFilters}
          onClear={() => setFilters(EMPTY_MATCH_LIST_FILTERS)}
        />
      )}

      <MatchListSection
        matches={filteredMatches}
        matchSets={setsByMatch}
        taggedAtByMatch={taggedAtByMatch}
        isLoading={isLoading}
        emptyBecauseFilter={scopedMatches.length > 0 && filteredMatches.length === 0}
        onCreateNew={handleCreateNew}
        onClearFilters={() => setFilters(EMPTY_MATCH_LIST_FILTERS)}
        players={players}
        tournaments={tournaments}
        getPlayerName={getPlayerName}
        getTournamentName={getTournamentName}
        onRefresh={handleRefresh}
      />
    </div>
  )
}
