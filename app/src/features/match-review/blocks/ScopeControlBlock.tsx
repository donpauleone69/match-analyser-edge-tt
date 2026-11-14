/**
 * ScopeControlBlock — this match / tournament / opponent / all of mine.
 */

import type { DBMatch, DBPlayer, DBTournament } from '@/data'
import type { ReviewScope } from '@/rules/reviewScope'

export interface ScopeControlBlockProps {
  scope: ReviewScope
  matches: DBMatch[]
  players: DBPlayer[]
  tournaments: DBTournament[]
  onChange: (scope: ReviewScope) => void
  /** When on a single-match review, pass that match id for the “this match” option */
  currentMatchId?: string | null
}

export function ScopeControlBlock({
  scope,
  matches,
  players,
  tournaments,
  onChange,
  currentMatchId = null,
}: ScopeControlBlockProps) {
  const tournamentIds = [...new Set(matches.map((m) => m.tournament_id).filter(Boolean))] as string[]
  const opponentIds = [...new Set(matches.map((m) => m.player2_id).filter(Boolean))] as string[]

  return (
    <label className="flex flex-col gap-0.5 text-[11px] text-muted">
      Scope
      <select
        className="min-w-[11rem] rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm text-primary"
        value={`${scope.kind}:${scope.id ?? ''}`}
        onChange={(e) => {
          const [kind, id] = e.target.value.split(':') as [ReviewScope['kind'], string]
          onChange({ kind, id: id || null })
        }}
      >
        <option value="all:">All of mine</option>
        {currentMatchId && <option value={`match:${currentMatchId}`}>This match</option>}
        {tournamentIds.map((id) => (
          <option key={id} value={`tournament:${id}`}>
            Tournament · {tournaments.find((t) => t.id === id)?.name ?? id}
          </option>
        ))}
        {opponentIds.map((id) => {
          const p = players.find((x) => x.id === id)
          return (
            <option key={id} value={`opponent:${id}`}>
              Opponent · {p ? `${p.first_name} ${p.last_name}` : id}
            </option>
          )
        })}
      </select>
    </label>
  )
}
