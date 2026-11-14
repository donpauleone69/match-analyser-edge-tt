/**
 * MatchContextBlock — editable date / opponent / tournament fields for Details.
 * Presentational: draft + callbacks; no store access.
 */

import { Button, Input, Label } from '@/ui-mine'
import { THEM_SIDE_LABEL } from '@/helpers/themSide'
import { MATCH_ROUND_OPTIONS } from '@/rules/matchContext'
import type { DBPlayer, DBTournament, MatchRound } from '@/data'

export interface MatchContextDraft {
  matchDate: string
  player2Id: string
  tournamentId: string
  round: MatchRound | ''
  newOpponentFirst: string
  newOpponentLast: string
  newTournamentName: string
  showNewOpponent: boolean
  showNewTournament: boolean
}

export interface MatchContextBlockProps {
  heroName: string
  dateSourceLabel: string
  suggestedVideoDate: string | null
  players: DBPlayer[]
  tournaments: DBTournament[]
  heroPlayerId: string
  draft: MatchContextDraft
  saving: boolean
  onChange: (patch: Partial<MatchContextDraft>) => void
  onSave: () => void
  onCreateOpponent: () => void
  onCreateTournament: () => void
  onUseVideoDate: () => void
}

export function MatchContextBlock({
  heroName,
  dateSourceLabel,
  suggestedVideoDate,
  players,
  tournaments,
  heroPlayerId,
  draft,
  saving,
  onChange,
  onSave,
  onCreateOpponent,
  onCreateTournament,
  onUseVideoDate,
}: MatchContextBlockProps) {
  const opponentLabel = draft.player2Id
    ? players.find((p) => p.id === draft.player2Id)
    : null
  const opponentName = opponentLabel
    ? `${opponentLabel.first_name} ${opponentLabel.last_name}`.trim()
    : THEM_SIDE_LABEL

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-50">Optional context</h2>
        <p className="text-sm text-neutral-400 mt-1">
          Opponent and tournament help Find and Clips later. Nothing here is required to tag.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="match-date">Match date</Label>
          <Input
            id="match-date"
            type="date"
            value={draft.matchDate}
            onChange={(e) => onChange({ matchDate: e.target.value })}
            disabled={saving}
            className="bg-neutral-800 border-border"
          />
          <p className="text-xs text-neutral-500">{dateSourceLabel}</p>
          {suggestedVideoDate && suggestedVideoDate !== draft.matchDate && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={onUseVideoDate}
            >
              Use video date ({formatDate(suggestedVideoDate)})
            </Button>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="opponent">Opponent</Label>
          <select
            id="opponent"
            value={draft.player2Id}
            onChange={(e) => onChange({ player2Id: e.target.value })}
            disabled={saving}
            className="w-full h-10 rounded-md border border-border bg-neutral-800 px-3 text-sm text-neutral-50"
          >
            <option value="">{THEM_SIDE_LABEL} (unnamed)</option>
            {players
              .filter((p) => p.id !== heroPlayerId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </option>
              ))}
          </select>
          <p className="text-xs text-neutral-500">
            You ({heroName}) vs {opponentName}
          </p>
          {!draft.showNewOpponent ? (
            <button
              type="button"
              className="text-xs text-callout-info hover:opacity-90"
              onClick={() => onChange({ showNewOpponent: true })}
            >
              + New opponent
            </button>
          ) : (
            <div className="flex flex-wrap gap-2 items-end pt-1">
              <div className="space-y-1">
                <Label htmlFor="opp-first" className="text-xs">
                  First name
                </Label>
                <Input
                  id="opp-first"
                  value={draft.newOpponentFirst}
                  onChange={(e) => onChange({ newOpponentFirst: e.target.value })}
                  className="bg-neutral-800 border-border h-9 w-28"
                  disabled={saving}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="opp-last" className="text-xs">
                  Last name
                </Label>
                <Input
                  id="opp-last"
                  value={draft.newOpponentLast}
                  onChange={(e) => onChange({ newOpponentLast: e.target.value })}
                  className="bg-neutral-800 border-border h-9 w-28"
                  disabled={saving}
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={saving || !draft.newOpponentFirst.trim()}
                onClick={onCreateOpponent}
              >
                Add &amp; link
              </Button>
              <button
                type="button"
                className="text-xs text-neutral-500 hover:text-neutral-300"
                onClick={() => onChange({ showNewOpponent: false })}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tournament">Tournament</Label>
          <select
            id="tournament"
            value={draft.tournamentId}
            onChange={(e) =>
              onChange({
                tournamentId: e.target.value,
                ...(e.target.value ? {} : { round: '' as const }),
              })
            }
            disabled={saving}
            className="w-full h-10 rounded-md border border-border bg-neutral-800 px-3 text-sm text-neutral-50"
          >
            <option value="">None (friendly / practice)</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {!draft.showNewTournament ? (
            <button
              type="button"
              className="text-xs text-callout-info hover:opacity-90"
              onClick={() => onChange({ showNewTournament: true })}
            >
              + New tournament
            </button>
          ) : (
            <div className="flex flex-wrap gap-2 items-end pt-1">
              <Input
                value={draft.newTournamentName}
                onChange={(e) => onChange({ newTournamentName: e.target.value })}
                placeholder="Tournament name"
                className="bg-neutral-800 border-border h-9 flex-1 min-w-[10rem]"
                disabled={saving}
              />
              <Button
                type="button"
                size="sm"
                disabled={saving || !draft.newTournamentName.trim()}
                onClick={onCreateTournament}
              >
                Add
              </Button>
              <button
                type="button"
                className="text-xs text-neutral-500 hover:text-neutral-300"
                onClick={() => onChange({ showNewTournament: false })}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {draft.tournamentId ? (
          <div className="space-y-1.5">
            <Label htmlFor="round">Round</Label>
            <select
              id="round"
              value={draft.round}
              onChange={(e) => onChange({ round: e.target.value as MatchRound | '' })}
              disabled={saving}
              className="w-full h-10 rounded-md border border-border bg-neutral-800 px-3 text-sm text-neutral-50"
            >
              <option value="">Select…</option>
              {MATCH_ROUND_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="hidden sm:block" />
        )}
      </div>

      <div className="flex justify-end pt-1">
        <Button type="button" disabled={saving || !draft.matchDate} onClick={onSave}>
          {saving ? 'Saving…' : 'Save context'}
        </Button>
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}
