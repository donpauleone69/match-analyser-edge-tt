/**
 * TaggingUIComposer — loads the match and opens Simple or Pass 1 Focus.
 * Remembered last mode (device) when `mode` is missing; both stay available.
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { cn } from '@/helpers/utils'
import { Pass1FocusComposer } from './Pass1FocusComposer'
import { SimpleTaggingComposer } from './SimpleTaggingComposer'
import { Button } from '@/ui-mine'
import { Card } from '@/ui-mine/Card'
import { matchDb, usePlayerStore, type DBMatch } from '@/data'
import {
  resolveOpponentId,
  resolveOpponentName,
} from '@/helpers/themSide'
import {
  loadLastTaggingMode,
  saveLastTaggingMode,
  type SessionTaggingMode,
} from '../helpers/taggingModePreference'
import { loadPass1FocusDraft } from './pass1FocusDraftStorage'
import { loadSimpleTaggingDraft } from './simpleTaggingDraftStorage'
import { setDb } from '@/data'

export interface TaggingUIComposerProps {
  className?: string
}

function parseMode(raw: string | null): SessionTaggingMode | null {
  if (raw === 'simple' || raw === 'pass1focus') return raw
  return null
}

export function TaggingUIComposer({ className }: TaggingUIComposerProps) {
  const { matchId } = useParams<{ matchId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const { players, load: loadPlayers } = usePlayerStore()
  const [match, setMatch] = useState<DBMatch | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [resolvedMode, setResolvedMode] = useState<SessionTaggingMode | null>(null)

  const urlSetNumber = searchParams.get('set')
  const taggingMode = parseMode(searchParams.get('mode'))
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

  // Resolve mode: explicit URL → open draft for set → last device preference.
  useEffect(() => {
    if (!matchId || !urlSetNumber) {
      setResolvedMode(null)
      return
    }

    let active = true
    const setNum = parseInt(urlSetNumber, 10)

    const apply = (mode: SessionTaggingMode) => {
      if (!active) return
      setResolvedMode(mode)
      saveLastTaggingMode(mode)
      if (taggingMode !== mode) {
        navigate(
          `/matches/${matchId}/tag?set=${setNum}&mode=${mode}${isRedo ? '&redo=true' : ''}`,
          { replace: true }
        )
      }
    }

    if (taggingMode) {
      apply(taggingMode)
      return () => {
        active = false
      }
    }

    ;(async () => {
      try {
        const sets = await setDb.getByMatchId(matchId)
        const target = sets.find((s) => s.set_number === setNum)
        if (!active) return
        if (target) {
          const simpleDraft = loadSimpleTaggingDraft(target.id)
          if (simpleDraft && simpleDraft.matchId === matchId) {
            apply('simple')
            return
          }
          const pass1Draft = loadPass1FocusDraft(target.id)
          if (pass1Draft && pass1Draft.matchId === matchId) {
            apply('pass1focus')
            return
          }
        }
        apply(loadLastTaggingMode())
      } catch {
        if (active) apply(loadLastTaggingMode())
      }
    })()

    return () => {
      active = false
    }
  }, [matchId, urlSetNumber, taggingMode, isRedo, navigate])

  const switchMode = (mode: SessionTaggingMode) => {
    if (!matchId || !urlSetNumber) return
    saveLastTaggingMode(mode)
    navigate(
      `/matches/${matchId}/tag?set=${urlSetNumber}&mode=${mode}${isRedo ? '&redo=true' : ''}`,
      { replace: true }
    )
  }

  if (!ready || (matchId && urlSetNumber && !resolvedMode)) {
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

  const player1Name =
    players.find((p) => p.id === match.player1_id)?.first_name || 'Hero'
  const player2Record = match.player2_id
    ? players.find((p) => p.id === match.player2_id)
    : undefined
  const player2Name = resolveOpponentName(match.player2_id, player2Record?.first_name)

  const shared = {
    matchId,
    setNumber: parseInt(urlSetNumber, 10),
    player1Id: match.player1_id,
    player2Id: resolveOpponentId(match.player2_id),
    player1Name,
    player2Name,
    className,
  }

  if (resolvedMode === 'simple') {
    return (
      <SimpleTaggingComposer
        {...shared}
        onRequestModeChange={switchMode}
      />
    )
  }

  return (
    <Pass1FocusComposer {...shared} onRequestModeChange={switchMode} />
  )
}
