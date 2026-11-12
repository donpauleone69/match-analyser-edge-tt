/**
 * useDeriveMatchReview
 *
 * Loads the complete match (match + sets + rallies + shots), resolves player
 * names and shapes everything Match Review shows via buildMatchReviewViewModel.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { matchDb, usePlayerStore } from '@/data'
import type { CompleteMatchData, DBPlayer } from '@/data'
import { THEM_SIDE_LABEL } from '@/helpers/themSide'
import { buildMatchReviewViewModel } from './buildMatchReview'
import type { MatchReviewViewModel } from '../models'

export interface DeriveMatchReviewResult {
  data: CompleteMatchData | null
  review: MatchReviewViewModel | null
  isLoading: boolean
  notFound: boolean
  error: string | null
  refresh: () => void
}

function playerFullName(player: DBPlayer | undefined, fallback: string): string {
  if (!player) return fallback
  const name = `${player.first_name} ${player.last_name}`.trim()
  return name || fallback
}

export function useDeriveMatchReview(matchId: string | undefined): DeriveMatchReviewResult {
  const { players, load: loadPlayers } = usePlayerStore()
  const [data, setData] = useState<CompleteMatchData | null>(null)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    loadPlayers()
  }, [loadPlayers])

  const refresh = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    if (!matchId) return
    let active = true
    matchDb
      .getCompleteMatchData(matchId)
      .then((result) => {
        if (!active) return
        setError(null)
        setNotFound(!result)
        setData(result)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load match')
      })
      .finally(() => {
        if (active) setLoadedKey(matchId)
      })
    return () => {
      active = false
    }
  }, [matchId, reloadKey])

  const review = useMemo(() => {
    if (!data) return null
    const hero = players.find((p) => p.id === data.match.player1_id)
    const villain = data.match.player2_id
      ? players.find((p) => p.id === data.match.player2_id)
      : undefined
    return buildMatchReviewViewModel(
      data,
      playerFullName(hero, 'Hero'),
      data.match.player2_id ? playerFullName(villain, THEM_SIDE_LABEL) : THEM_SIDE_LABEL
    )
  }, [data, players])

  return {
    data,
    review,
    isLoading: matchId ? loadedKey !== matchId : false,
    notFound: !matchId || notFound,
    error,
    refresh,
  }
}
