/**
 * buildHome — pure: matches + sets + rally counts → Home view model.
 */

import type { DBMatch, DBSet } from '@/data'
import { deriveSetTaggingStatus } from '@/rules/derive/set/deriveSetTaggingStatus'
import type {
  ContextPolishModel,
  ContinueTaggingModel,
  HomeMatchModel,
  HomeMatchStatus,
  HomeModel,
} from '../models'

export interface HomeMatchInput {
  match: DBMatch
  sets: DBSet[]
  /** set id → rallies tagged */
  rallyCounts: Map<string, number>
  /** Scoring non-stub rallies missing Pass 1 completeness (ending / framework). */
  incompleteRallyCount?: number
}

const RECENT_LIMIT = 5
const CONTINUE_LIMIT = 5
const CONTEXT_LIMIT = 5

export function buildHome(inputs: HomeMatchInput[], nameOf: (playerId: string | null) => string): HomeModel {
  const outstanding: Array<ContinueTaggingModel & { matchDate: string; createdAt: string }> = []
  const contextCandidates: Array<ContextPolishModel & { matchDate: string; createdAt: string }> = []
  const rows: HomeMatchModel[] = []
  let ralliesTotal = 0

  const sorted = [...inputs].sort((a, b) =>
    (b.match.match_date ?? '').localeCompare(a.match.match_date ?? '') ||
    (b.match.created_at ?? '').localeCompare(a.match.created_at ?? '')
  )

  for (const { match, sets, rallyCounts, incompleteRallyCount = 0 } of sorted) {
    const hero = match.player1_id
    const title = `${nameOf(hero)} vs ${nameOf(match.player2_id)}`
    const ordered = [...sets].sort((a, b) => a.set_number - b.set_number)
    const statuses = ordered.map((s) => deriveSetTaggingStatus(s, rallyCounts.get(s.id) ?? 0))
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

    // Soft context on Home: missing opponent only (tournament nudge lives on Match Review Summary).
    if (tagged > 0 && !match.player2_id) {
      contextCandidates.push({
        matchId: match.id,
        title,
        dateLabel: match.match_date
          ? new Date(match.match_date).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
            })
          : '',
        missing: 'opponent',
        detailLabel: 'Add opponent so Clips can filter “vs player”',
        actionLabel: 'Add opponent',
        matchDate: match.match_date ?? '',
        createdAt: match.created_at ?? '',
      })
    }

    // Tagged (or still open) matches with incomplete Pass 1 points → Fix path.
    if (incompleteRallyCount > 0) {
      const setForFix =
        ordered.find((_, i) => statuses[i] === 'in_progress') ??
        ordered.find((_, i) => statuses[i] === 'tagged') ??
        ordered[0]
      if (setForFix) {
        outstanding.push({
          matchId: match.id,
          title,
          setNumber: setForFix.set_number,
          ralliesTagged: tagged,
          scoreLabel: `${setForFix.player1_score_final}–${setForFix.player2_score_final}`,
          actionLabel: 'Fix incomplete',
          kind: 'fix_incomplete',
          detailLabel: `${incompleteRallyCount} incomplete ${
            incompleteRallyCount === 1 ? 'point' : 'points'
          } · Rallies → Incomplete`,
          matchDate: match.match_date ?? '',
          createdAt: match.created_at ?? '',
        })
      }
    }

    if (status !== 'tagged') {
      const openInProgress = ordered.findIndex((_, i) => statuses[i] === 'in_progress')
      const openNotStarted = ordered.findIndex((_, i) => statuses[i] === 'not_started')
      const open = openInProgress >= 0 ? openInProgress : openNotStarted
      if (open >= 0) {
        const set = ordered[open]
        const count = rallyCounts.get(set.id) ?? 0
        const kind = statuses[open] === 'in_progress' ? 'in_progress' : 'not_started'
        // Prefer a single What's left card — fix_incomplete already covers this match.
        if (incompleteRallyCount === 0) {
          outstanding.push({
            matchId: match.id,
            title,
            setNumber: set.set_number,
            ralliesTagged: count,
            scoreLabel: `${set.player1_score_final}–${set.player2_score_final}`,
            actionLabel: kind === 'in_progress' && count > 0 ? 'Continue tagging' : 'Start tagging',
            kind,
            detailLabel:
              kind === 'in_progress'
                ? `Set ${set.set_number} · ${count === 1 ? '1 rally' : `${count} rallies`} tagged`
                : `Set ${set.set_number} · not tagged yet`,
            matchDate: match.match_date ?? '',
            createdAt: match.created_at ?? '',
          })
        }
      }
    }
  }

  outstanding.sort((a, b) => {
    const pri = (k: ContinueTaggingModel['kind']) =>
      k === 'fix_incomplete' ? 0 : k === 'in_progress' ? 1 : 2
    return (
      pri(a.kind) - pri(b.kind) ||
      b.matchDate.localeCompare(a.matchDate) ||
      b.createdAt.localeCompare(a.createdAt)
    )
  })

  contextCandidates.sort((a, b) => {
    const pri = (m: ContextPolishModel['missing']) => (m === 'opponent' ? 0 : 1)
    return (
      pri(a.missing) - pri(b.missing) ||
      b.matchDate.localeCompare(a.matchDate) ||
      b.createdAt.localeCompare(a.createdAt)
    )
  })

  const continueItems = outstanding.slice(0, CONTINUE_LIMIT).map(({ matchDate: _d, createdAt: _c, ...item }) => item)
  const contextItems = contextCandidates
    .slice(0, CONTEXT_LIMIT)
    .map(({ matchDate: _d, createdAt: _c, ...item }) => item)

  return {
    continueItems,
    outstandingCount: outstanding.length,
    contextItems,
    recent: rows.slice(0, RECENT_LIMIT),
    totals: { matches: rows.length, tagged: rows.filter((r) => r.ralliesTagged > 0).length, rallies: ralliesTotal },
  }
}
