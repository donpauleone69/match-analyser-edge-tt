import type { MatchRound } from '@/data/entities/matches/match.types'

export const MATCH_ROUND_OPTIONS: { value: MatchRound; label: string }[] = [
  { value: 'groups', label: 'Groups' },
  { value: 'last_32', label: 'Round of 32' },
  { value: 'last_16', label: 'Round of 16' },
  { value: 'quarter_final', label: 'Quarter-Final' },
  { value: 'semi_final', label: 'Semi-Final' },
  { value: 'final', label: 'Final' },
  { value: 'other', label: 'Other' },
]

export function matchRoundLabel(round: MatchRound | null | undefined): string | null {
  if (!round) return null
  return MATCH_ROUND_OPTIONS.find((r) => r.value === round)?.label ?? round.replace(/_/g, ' ')
}
