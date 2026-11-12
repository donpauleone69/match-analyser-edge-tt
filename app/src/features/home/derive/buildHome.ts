/**
 * buildHome — pure: matches + sets + rally counts → Home view model.
 */

import type { DBMatch, DBSet } from '@/data'
import type { ContinueTaggingModel, HomeMatchModel, HomeMatchStatus, HomeModel } from '../models'

export interface HomeMatchInput {
  match: DBMatch
  sets: DBSet[]
  /** set id → rallies tagged */
  rallyCounts: Map<string, number>
}

const RECENT_LIMIT = 5
const CONTINUE_LIMIT = 3

function setStatus(set: DBSet, rallies: number): HomeMatchStatus {
  if (set.is_tagged || set.tagging_phase === 'phase2_complete') return 'tagged'
  if (rallies > 0 || set.tagging_phase === 'phase1_in_progress' || set.tagging_phase === 'phase2_in_progress') {
    return 'in_progress'
  }
  return 'not_started'
}

export function buildHome(inputs: HomeMatchInput[], nameOf: (playerId: string | null) => string): HomeModel {
  const continueItems: ContinueTaggingModel[] = []
  const rows: HomeMatchModel[] = []
  let ralliesTotal = 0

  const sorted = [...inputs].sort((a, b) =>
    (b.match.match_date ?? '').localeCompare(a.match.match_date ?? '') ||
    (b.match.created_at ?? '').localeCompare(a.match.created_at ?? '')
  )

  for (const { match, sets, rallyCounts } of sorted) {
    const hero = match.player1_id
    const title = `${nameOf(hero)} vs ${nameOf(match.player2_id)}`
    const ordered = [...sets].sort((a, b) => a.set_number - b.set_number)
    const statuses = ordered.map((s) => setStatus(s, rallyCounts.get(s.id) ?? 0))
    const tagged = ordered.reduce((n, s) => n + (rallyCounts.get(s.id) ?? 0), 0)
    ralliesTotal += tagged

    const status: HomeMatchStatus =
      statuses.length > 0 && statuses.every((s) => s === 'tagged')
        ? 'tagged'
        : statuses.some((s) => s !== 'not_started')
          ? 'in_progress'
          : 'not_started'

    const decided = ordered.filter((s) => s.winner_id)
    const heroSets = decided.filter((s) => s.winner_id === hero).length
    const oppSets = decided.length - heroSets
    rows.push({
      matchId: match.id,
      title,
      dateLabel: match.match_date
        ? new Date(match.match_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
        : '',
      setsLabel: decided.length > 0 ? `${heroSets}–${oppSets}` : null,
      heroWon: decided.length > 0 && heroSets !== oppSets ? heroSets > oppSets : null,
      ralliesTagged: tagged,
      status,
      statusLabel: status === 'tagged' ? 'Tagged' : status === 'in_progress' ? 'Tagging in progress' : 'Not tagged yet',
    })

    const open = ordered.findIndex((_, i) => statuses[i] === 'in_progress')
    if (open >= 0 && continueItems.length < CONTINUE_LIMIT) {
      const set = ordered[open]
      const count = rallyCounts.get(set.id) ?? 0
      continueItems.push({
        matchId: match.id,
        title,
        setNumber: set.set_number,
        ralliesTagged: count,
        scoreLabel: `${set.player1_score_final}–${set.player2_score_final}`,
        actionLabel: count > 0 ? 'Continue tagging' : 'Start tagging',
      })
    }
  }

  return {
    continueItems,
    recent: rows.slice(0, RECENT_LIMIT),
    totals: { matches: rows.length, tagged: rows.filter((r) => r.ralliesTagged > 0).length, rallies: ralliesTotal },
  }
}
