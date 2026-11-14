/**
 * ScopeReviewComposer — same review payoff across a set of matches.
 * Scope: this tournament / this opponent / all of mine (single match redirects).
 * Default landing is Clips playlists — the cross-match coaching win.
 */

import { useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, Icon } from '@/ui-mine'
import { useMatchStore, usePlayerStore, useTournamentStore } from '@/data'
import { deriveAccountScope } from '@/rules/derive/account/deriveAccountScope'
import {
  filterMatchesByScope,
  type ReviewScope,
  type ReviewScopeKind,
} from '@/rules/reviewScope'
import { useCloudStore } from '@/stores/cloudStore'
import { ClipsComposer } from '@/features/clips'
import { ScopeControlBlock } from '../blocks/ScopeControlBlock'

function parseScope(params: URLSearchParams): ReviewScope {
  const kind = (params.get('scope') as ReviewScopeKind | null) ?? 'all'
  if (kind === 'match' || kind === 'tournament' || kind === 'opponent' || kind === 'all') {
    return { kind, id: params.get('id') }
  }
  return { kind: 'all', id: null }
}

type ScopeTab = 'clips' | 'matches'

function parseTab(params: URLSearchParams): ScopeTab {
  return params.get('tab') === 'matches' ? 'matches' : 'clips'
}

export function ScopeReviewComposer() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const scope = parseScope(searchParams)
  const tab = parseTab(searchParams)
  const profile = useCloudStore((s) => s.profile)
  const { matches, load: loadMatches } = useMatchStore()
  const { players, load: loadPlayers } = usePlayerStore()
  const { tournaments, load: loadTournaments } = useTournamentStore()
  const focal = deriveAccountScope(profile, []).focalPlayerId

  useEffect(() => {
    loadMatches()
    loadPlayers()
    loadTournaments()
  }, [loadMatches, loadPlayers, loadTournaments])

  const scoped = useMemo(() => {
    if (!focal) return []
    return filterMatchesByScope(matches, scope, focal)
  }, [matches, scope, focal])

  const scopedIds = useMemo(() => scoped.map((m) => m.id), [scoped])

  const title = useMemo(() => {
    if (scope.kind === 'tournament' && scope.id) {
      return tournaments.find((t) => t.id === scope.id)?.name ?? 'Tournament'
    }
    if (scope.kind === 'opponent' && scope.id) {
      const p = players.find((x) => x.id === scope.id)
      return p ? `vs ${p.first_name} ${p.last_name}` : 'Opponent'
    }
    if (scope.kind === 'match' && scope.id) return 'This match'
    return 'All of my matches'
  }, [scope, tournaments, players])

  useEffect(() => {
    if (scope.kind === 'match' && scope.id) {
      navigate(`/matches/${scope.id}`, { replace: true })
    }
  }, [scope, navigate])

  if (scope.kind === 'match' && scope.id) {
    return <p className="p-6 text-neutral-400">Opening match review…</p>
  }

  const setScope = (next: ReviewScope) => {
    const p = new URLSearchParams(searchParams)
    p.set('scope', next.kind)
    if (next.id) p.set('id', next.id)
    else p.delete('id')
    setSearchParams(p, { replace: true })
  }

  const setTab = (next: ScopeTab) => {
    const p = new URLSearchParams(searchParams)
    if (next === 'clips') p.delete('tab')
    else p.set('tab', next)
    setSearchParams(p, { replace: true })
  }

  const mine = focal ? matches.filter((m) => m.player1_id === focal) : []

  const labelMatch = (m: { id: string; player2_id: string | null }) => {
    const full = matches.find((row) => row.id === m.id)
    const opp = m.player2_id
      ? players.find((p) => p.id === m.player2_id)
      : undefined
    const vs = opp
      ? `${opp.first_name} ${opp.last_name}`.trim() || opp.first_name
      : 'Opponent'
    const date = full?.match_date
      ? new Date(full.match_date).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : null
    return date ? `vs ${vs} · ${date}` : `vs ${vs}`
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-5">
      <header className="space-y-2">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-100">
          <Icon name="arrow-left" size="sm" /> Home
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-neutral-50 md:text-2xl">{title}</h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              {scoped.length} match{scoped.length === 1 ? '' : 'es'}
            </p>
          </div>
          <ScopeControlBlock
            scope={scope}
            matches={mine}
            players={players}
            tournaments={tournaments}
            onChange={setScope}
          />
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button variant={tab === 'clips' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('clips')}>
          Clips
        </Button>
        <Button variant={tab === 'matches' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('matches')}>
          Matches
        </Button>
      </div>

      {scoped.length === 0 ? (
        <Card className="border border-dashed border-border p-5 text-center text-sm text-neutral-500">
          No matches in this scope. Set opponent or tournament on Details to filter.
        </Card>
      ) : tab === 'clips' ? (
        <ClipsComposer matchId={null} matchIds={scopedIds} embedded />
      ) : (
        <Card className="space-y-2 p-4 border border-border">
          <h2 className="text-base font-semibold text-neutral-50">Matches in scope</h2>
          <ul className="divide-y divide-border">
            {scoped.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="text-sm text-neutral-200">{labelMatch(m)}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/matches/${m.id}?tab=workon`)}>
                    Work on
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/matches/${m.id}`)}>
                    Review
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
