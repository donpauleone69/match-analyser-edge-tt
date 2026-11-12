/**
 * useDeriveMatchStory
 *
 * Loads the complete match via matchDb.getCompleteMatchData, resolves the
 * players, calls calculateMatchStory and shapes the result into card view models
 * (A1 — The score, A2 — How points ended).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { matchDb, usePlayerStore } from '@/data'
import type { DBMatch, DBPlayer, DBSet } from '@/data'
import { THEM_SIDE_LABEL } from '@/helpers/themSide'
import {
  calculateMatchStory,
  type CountShare,
  type MatchStoryResult,
} from '@/rules/analytics/calculateMatchStory'
import {
  calculateReviewShots,
  type ReviewShotLine,
} from '@/rules/analytics/calculateReviewShots'
import type {
  MatchStoryViewModel,
  ReviewShotRowModel,
  StatCompareCardModel,
  StatCompareRowModel,
} from '../models'

export interface DeriveMatchStoryResult {
  match: DBMatch | null
  sets: DBSet[]
  story: MatchStoryViewModel | null
  isLoading: boolean
  notFound: boolean
  error: string | null
}

const NO_VALUE = '—'

function playerFullName(player: DBPlayer | undefined, fallback: string): string {
  if (!player) return fallback
  const name = `${player.first_name} ${player.last_name}`.trim()
  return name || fallback
}

function pct(share: number): string {
  return `${Math.round(share * 100)}%`
}

/** "27 (54%)" — share of a denominator */
function countWithPct(value: CountShare): string {
  return `${value.count} (${pct(value.share)})`
}

/** "2/3 (67%)" — shows the denominator because it differs per side */
function countOfWithPct(value: CountShare): string {
  if (value.denominator === 0) return NO_VALUE
  return `${value.count}/${value.denominator} (${pct(value.share)})`
}

function buildScoreCard(
  result: MatchStoryResult,
  heroName: string,
  villainName: string
): StatCompareCardModel {
  const rows: StatCompareRowModel[] = []

  if (result.matchScore) {
    rows.push({
      key: 'match-score',
      label: 'Sets won',
      heroValue: String(result.matchScore.hero),
      villainValue: String(result.matchScore.villain),
    })
  }

  if (result.setScores.length > 0) {
    rows.push({
      key: 'set-scores',
      label: 'Set scores',
      heroValue: result.setScores.map((s) => s.hero).join(' · '),
      villainValue: result.setScores.map((s) => s.villain).join(' · '),
    })
  }

  if (result.hasPointData) {
    rows.push({
      key: 'points-won',
      label: 'Points won',
      heroValue: countWithPct(result.pointsWon.hero),
      villainValue: countWithPct(result.pointsWon.villain),
    })
    rows.push({
      key: 'points-won-on-serve',
      label: 'Points won on serve',
      heroValue: countOfWithPct(result.pointsWonOnServe.hero),
      villainValue: countOfWithPct(result.pointsWonOnServe.villain),
    })
  }

  const nameOf = (side: 'hero' | 'villain') => (side === 'hero' ? heroName : villainName)
  const parts: string[] = []
  if (result.matchScore && result.matchWinner) {
    const { hero, villain } = result.matchScore
    parts.push(`${nameOf(result.matchWinner)} won ${Math.max(hero, villain)}–${Math.min(hero, villain)}.`)
  }
  if (result.hasPointData) {
    parts.push(
      `Points ${result.pointsWon.hero.count}–${result.pointsWon.villain.count}.`
    )
    const heroHold = result.pointsWonOnServe.hero.share
    const villainHold = result.pointsWonOnServe.villain.share
    if (
      result.pointsWonOnServe.hero.denominator > 0 &&
      result.pointsWonOnServe.villain.denominator > 0 &&
      heroHold !== villainHold
    ) {
      parts.push(`${heroHold > villainHold ? heroName : villainName} held serve better.`)
    }
  }

  return {
    id: 'A1',
    title: 'The score',
    story: parts.length > 0 ? parts.join(' ') : 'Who won, by how much, and who held their serve.',
    rows,
  }
}

function buildEndingCard(
  result: MatchStoryResult,
  heroName: string,
  villainName: string
): StatCompareCardModel {
  const rows: StatCompareRowModel[] = []

  if (result.hasPointData) {
    rows.push({
      key: 'errors',
      label: 'Errors',
      heroValue: countWithPct(result.errors.hero),
      villainValue: countWithPct(result.errors.villain),
    })
    rows.push({
      key: 'winners',
      label: 'Winners',
      heroValue: countWithPct(result.winners.hero),
      villainValue: countWithPct(result.winners.villain),
    })
    rows.push({
      key: 'points-from-opponent-error',
      label: 'Points from opponent error',
      heroValue: countWithPct(result.pointsFromOpponentError.hero),
      villainValue: countWithPct(result.pointsFromOpponentError.villain),
    })
  }

  const parts: string[] = []
  if (result.hasPointData) {
    const heroErrors = result.errors.hero.count
    const villainErrors = result.errors.villain.count
    if (heroErrors !== villainErrors) {
      const [name, more, fewer] =
        heroErrors > villainErrors
          ? [heroName, heroErrors, villainErrors]
          : [villainName, villainErrors, heroErrors]
      parts.push(`${name} threw away more points (${more} vs ${fewer}).`)
    } else {
      parts.push(`Both threw away ${heroErrors} point${heroErrors === 1 ? '' : 's'}.`)
    }
    const heroWinners = result.winners.hero.count
    const villainWinners = result.winners.villain.count
    if (heroWinners !== villainWinners) {
      const [name, more, fewer] =
        heroWinners > villainWinners
          ? [heroName, heroWinners, villainWinners]
          : [villainName, villainWinners, heroWinners]
      parts.push(`${name} finished more points (${more} vs ${fewer}).`)
    }
  }

  return {
    id: 'A2',
    title: 'How points ended',
    story:
      parts.length > 0
        ? parts.join(' ')
        : 'Who threw points away, who earned them, and who was handed them.',
    rows,
  }
}

function formatStroke(stroke: string | null): string | null {
  if (!stroke) return null
  return stroke.charAt(0).toUpperCase() + stroke.slice(1)
}

function playerLabel(
  playerId: string | null,
  heroId: string,
  heroName: string,
  villainName: string
): string {
  if (playerId === heroId) return heroName
  return villainName
}

/** Pure shaping of flagged review shots into list rows. */
export function buildReviewShotRows(
  lines: ReviewShotLine[],
  heroId: string,
  heroName: string,
  villainName: string
): ReviewShotRowModel[] {
  return lines.map((line) => {
    const who = playerLabel(line.playerId, heroId, heroName, villainName)
    const kindLabel = line.reviewKind === 'technical' ? 'Technical' : 'Tactical'
    const shotBits = [line.wing, formatStroke(line.stroke)].filter(Boolean).join(' · ')
    return {
      key: line.shotId,
      label: `R${line.rallyIndex} · shot ${line.shotIndex} · ${who}`,
      detail: shotBits || (line.reviewKind === 'technical' ? 'Wing / stroke missing' : '—'),
      kindLabel,
    }
  })
}

/** Pure shaping of a MatchStoryResult into card view models. */
export function buildMatchStoryViewModel(
  result: MatchStoryResult,
  heroName: string,
  villainName: string,
  reviewShots: ReviewShotRowModel[] = []
): MatchStoryViewModel {
  return {
    heroName,
    villainName,
    cards: [
      buildScoreCard(result, heroName, villainName),
      buildEndingCard(result, heroName, villainName),
    ],
    reviewShots,
  }
}

export function useDeriveMatchStory(matchId: string | undefined): DeriveMatchStoryResult & {
  refresh: () => void
} {
  const { players, load: loadPlayers } = usePlayerStore()

  const [match, setMatch] = useState<DBMatch | null>(null)
  const [sets, setSets] = useState<DBSet[]>([])
  const [result, setResult] = useState<MatchStoryResult | null>(null)
  const [reviewLines, setReviewLines] = useState<ReviewShotLine[]>([])
  const [loadedMatchId, setLoadedMatchId] = useState<string | null>(null)
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
      .then((data) => {
        if (!active) return
        setError(null)
        if (!data) {
          setMatch(null)
          setSets([])
          setResult(null)
          setReviewLines([])
          setNotFound(true)
          return
        }
        setNotFound(false)
        setMatch(data.match)
        setSets(data.sets)
        setResult(
          calculateMatchStory({
            match: data.match,
            sets: data.sets,
            rallies: data.rallies,
            shots: data.shots,
            heroId: data.match.player1_id,
            villainId: data.match.player2_id,
          })
        )
        setReviewLines(
          calculateReviewShots({ rallies: data.rallies, shots: data.shots })
        )
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load match')
      })
      .finally(() => {
        if (active) setLoadedMatchId(matchId)
      })

    return () => {
      active = false
    }
  }, [matchId, reloadKey])

  const story = useMemo(() => {
    if (!match || !result) return null
    const hero = players.find((p) => p.id === match.player1_id)
    const villain = match.player2_id
      ? players.find((p) => p.id === match.player2_id)
      : undefined
    const heroName = playerFullName(hero, 'Hero')
    const villainName = match.player2_id
      ? playerFullName(villain, THEM_SIDE_LABEL)
      : THEM_SIDE_LABEL
    return buildMatchStoryViewModel(
      result,
      heroName,
      villainName,
      buildReviewShotRows(reviewLines, match.player1_id, heroName, villainName)
    )
  }, [match, result, reviewLines, players])

  return {
    match,
    sets,
    story,
    isLoading: matchId ? loadedMatchId !== matchId : false,
    notFound: !matchId || notFound,
    error,
    refresh,
  }
}
