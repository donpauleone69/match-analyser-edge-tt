/**
 * TaggingUIComposer — routes to Pass 1 Focus (default) or Rally Focus (test).
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { cn } from '@/helpers/utils'
import { RallyFocusComposer } from './RallyFocusComposer'
import { Pass1FocusComposer } from './Pass1FocusComposer'
import { Button } from '@/ui-mine'
import { Card } from '@/ui-mine/Card'
import { matchDb, usePlayerStore, type DBMatch } from '@/data'
import {
  resolveOpponentId,
  resolveOpponentName,
} from '@/helpers/themSide'

export interface TaggingUIComposerProps {
  className?: string
}

export function TaggingUIComposer({ className }: TaggingUIComposerProps) {
  const { matchId } = useParams<{ matchId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const { players, load: loadPlayers } = usePlayerStore()
  const [match, setMatch] = useState<DBMatch | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const urlSetNumber = searchParams.get('set')
  const taggingMode = searchParams.get('mode')
  const isPass1FocusMode = taggingMode === 'pass1focus'
  const isRallyFocusMode = taggingMode === 'rallyfocus'
  const isKnownMode = isPass1FocusMode || isRallyFocusMode
  const redoParam = searchParams.get('redo')
  const isRedo = redoParam === 'true' || redoParam === 'phase2'

  useEffect(() => {
    loadPlayers()
  }, [loadPlayers])

  useEffect(() => {
    if (!matchId) {
      setMatch(null)
      setReady(true)
      return
    }

    let active = true
    setReady(false)
    setLoadError(null)

    matchDb
      .getById(matchId)
      .then((row) => {
        if (!active) return
        setMatch(row ?? null)
      })
      .catch((err: unknown) => {
        if (!active) return
        setLoadError(err instanceof Error ? err.message : 'Failed to load match')
        setMatch(null)
      })
      .finally(() => {
        if (active) setReady(true)
      })

    return () => {
      active = false
    }
  }, [matchId])

  // Default / unknown modes → Pass 1 Focus
  useEffect(() => {
    if (!matchId || !urlSetNumber) return
    if (isKnownMode) return
    navigate(
      `/matches/${matchId}/tag?set=${urlSetNumber}&mode=pass1focus${isRedo ? '&redo=true' : ''}`,
      { replace: true }
    )
  }, [matchId, urlSetNumber, isKnownMode, isRedo, navigate])

  if (!ready) {
    return (
      <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
        <Card className="p-8 max-w-lg text-center">
          <h2 className="text-2xl font-bold text-neutral-50 mb-4">Loading match…</h2>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
          </div>
        </Card>
      </div>
    )
  }

  if (!matchId || !match) {
    return (
      <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
        <Card className="p-8 max-w-lg text-center">
          <h2 className="text-2xl font-bold text-neutral-50 mb-4">No Match Selected</h2>
          <p className="text-neutral-400 mb-6">
            {loadError || 'Please select a match from the match list to start tagging.'}
          </p>
          <Button onClick={() => navigate('/matches')}>Go to Matches</Button>
        </Card>
      </div>
    )
  }

  if (!urlSetNumber) {
    return (
      <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
        <Card className="p-8 max-w-lg text-center">
          <h2 className="text-2xl font-bold text-neutral-50 mb-4">No Set Selected</h2>
          <p className="text-neutral-400 mb-6">Open tagging from the set picker or Match Review.</p>
          <Button onClick={() => navigate(`/matches/${matchId}`)}>Back to Match Review</Button>
        </Card>
      </div>
    )
  }

  if (!isKnownMode) {
    return (
      <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
        <Card className="p-8 max-w-lg text-center">
          <h2 className="text-2xl font-bold text-neutral-50 mb-4">Opening Pass 1 Focus…</h2>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
          </div>
        </Card>
      </div>
    )
  }

  const player1Name =
    players.find((p) => p.id === match.player1_id)?.first_name || 'Hero'
  const player2Record = match.player2_id
    ? players.find((p) => p.id === match.player2_id)
    : undefined
  const player2Name = resolveOpponentName(match.player2_id, player2Record?.first_name)
  const altProps = {
    matchId,
    setNumber: parseInt(urlSetNumber, 10),
    player1Id: match.player1_id,
    player2Id: resolveOpponentId(match.player2_id),
    player1Name,
    player2Name,
    className,
  }

  if (isRallyFocusMode) {
    return <RallyFocusComposer {...altProps} />
  }

  return <Pass1FocusComposer {...altProps} />
}
