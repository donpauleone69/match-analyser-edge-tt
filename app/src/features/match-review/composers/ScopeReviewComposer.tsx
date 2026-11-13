/**
 * ScopeReviewComposer — same review payoff across a set of matches.
 * Scope: this tournament / this opponent / all of mine (single match redirects).
 */

import { useEffect, useMemo, useState } from 'react'
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

export function ScopeReviewComposer() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const scope = parseScope(searchParams)
  const profile = useCloudStore((s) => s.profile)
  const { matches, load: loadMatches } = useMatchStore()
  const { players, load: loadPlayers } = usePlayerStore()
  const { tournaments, load: loadTournaments } = useTournamentStore()
  const focal = deriveAccountScope(profile, []).focalPlayerId
  const [tab, setTab] = useState<'summary' | 'workon' | 'clips'>('summary')

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
    const p = new URLSearchParams()
    p.set('scope', next.kind)
    if (next.id) p.set('id', next.id)
    setSearchParams(p, { replace: true })
  }

  const mine = focal ? matches.filter((m) => m.player1_id === focal) : []

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <header className="space-y-3">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-100">
          <Icon name="arrow-left" size="sm" /> Library
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">Review scope</p>
            <h1 className="text-2xl font-bold text-neutral-50 md:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-neutral-400">
              {scoped.length} match{scoped.length === 1 ? '' : 'es'} · same Work on + clips payoff
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
        {(['summary', 'workon', 'clips'] as const).map((t) => (
          <Button key={t} variant={tab === t ? 'primary' : 'secondary'} size="sm" onClick={() => setTab(t)}>
            {t === 'workon' ? 'Work on' : t === 'clips' ? 'Clips' : 'Summary'}
          </Button>
        ))}
      </div>

      {scoped.length === 0 ? (
        <Card className="border-dashed border-neutral-700 p-8 text-center text-sm text-neutral-400">
          No matches in this scope for the player you are reviewing as.
        </Card>
      ) : tab === 'clips' ? (
        <ClipsComposer matchId={null} matchIds={scopedIds} embedded />
      ) : tab === 'workon' ? (
        <Card className="space-y-3 p-5">
          <h2 className="text-lg font-semibold text-neutral-50">Work on (across this scope)</h2>
          <p className="text-sm text-neutral-400">
            Open a match for the full Work on list with evidence, or use Clips for the combined playlist across the
            scope.
          </p>
          <ul className="space-y-2">
            {scoped.map((m) => (
              <li key={m.id}>
                <Button variant="secondary" size="sm" onClick={() => navigate(`/matches/${m.id}?tab=workon`)}>
                  Work on · {m.id}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="space-y-3 p-5">
          <h2 className="text-lg font-semibold text-neutral-50">Matches in scope</h2>
          <ul className="divide-y divide-neutral-800">
            {scoped.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="text-sm text-neutral-200">{m.id}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/matches/${m.id}`)}>
                    Review
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/matches/${m.id}?tab=clips`)}>
                    Clips
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
