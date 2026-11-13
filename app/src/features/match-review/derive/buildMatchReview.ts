/**
 * Pure shaping of Match Review data into view models.
 * No React, no IO — rules do the counting, this file only formats.
 *
 * Number format: % first, count in brackets — "27% (4)".
 * Rows with their own denominator keep it — "14% (1/7)".
 */

import type { CompleteMatchData, DBRally, DBShot, PointEnding } from '@/data'
import {
  calculateMatchStory,
  type CountShare,
  type MatchStoryResult,
} from '@/rules/analytics/calculateMatchStory'
import {
  calculateAttackStory,
  type AttackStoryResult,
  type AttackTiming,
  type MissReasonKey,
  type WinPhase,
} from '@/rules/analytics/calculateAttackStory'
import { calculateReviewShots } from '@/rules/analytics/calculateReviewShots'
import { calculateServeReceiveStory } from '@/rules/analytics/calculateServeReceiveStory'
import { buildServeReceiveSections } from './buildServeReceiveCards'
import { groupReviewShots, type ReviewPattern } from '@/rules/analytics/groupReviewShots'
import { calculateRallyHighlights } from '@/rules/analytics/calculateRallyHighlights'
import { deriveCompareTone, type ComparePolarity } from '@/rules/analytics/deriveCompareTone'
import { deriveSetTaggingStatus } from '@/rules/derive/set/deriveSetTaggingStatus'
import { isErrorEnding } from '@/rules/derive/rally/derivePointEndClass'
import {
  filterBrowseableTaggedRallies,
  isCompleteScoringRally,
} from '@/rules/analytics/isCompleteScoringRally'
import { matchDateSourceLabel, matchRoundLabel } from '@/rules/matchContext'
import type {
  CompareCardModel,
  CompareRowModel,
  CompareSectionModel,
  EvidenceRef,
  LockedSectionModel,
  MatchReviewViewModel,
  MetricCellModel,
  RallyRowModel,
  ReviewPatternModel,
  ReviewSideModel,
  SetPanelModel,
  SetScoreChipModel,
  TakeawayModel,
  WorkOnModel,
} from '../models'

const NO_VALUE = '—'
const LOOP_PAD_SECONDS = 1

export function pct(share: number): string {
  return `${Math.round(share * 100)}%`
}

/** "27% (4)" — share of all points (denominator shared by both sides) */
export function formatPctCount(value: CountShare): string {
  if (value.denominator === 0) return NO_VALUE
  return `${pct(value.share)} (${value.count})`
}

/** "14% (1/7)" — keeps the denominator because it differs per side */
export function formatPctOf(value: CountShare): string {
  if (value.denominator === 0) return NO_VALUE
  return `${pct(value.share)} (${value.count}/${value.denominator})`
}

const ENDING_LABEL: Record<PointEnding, string> = {
  winner: 'Winner',
  lucky: 'Lucky',
  error_net: 'In-Net',
  error_long: 'Long',
  error_wide: 'Wide',
  error_air: 'Air',
}

export const MISS_REASON_LABEL: Record<MissReasonKey, string> = {
  technical: 'Technical',
  timing: 'Timing',
  footwork: 'Footwork',
  positioning: 'Positioning',
  misread: 'Misread',
  forced: 'Forced',
  untagged: 'Not tagged',
}

const STROKE_LABEL: Record<string, string> = {
  flick: 'Flick',
  loop: 'Loop',
  drive: 'Drive',
  smash: 'Smash',
  lob: 'Lob',
  block: 'Block',
  push: 'Push',
  chop: 'Chop',
}

export function formatShotType(wing: string | null, stroke: string | null): string {
  const parts = [wing, stroke ? (STROKE_LABEL[stroke] ?? stroke) : null].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Flagged shot'
}

interface Names {
  heroId: string
  heroName: string
  villainName: string
}

function nameOf(side: 'hero' | 'villain', names: Names): string {
  return side === 'hero' ? names.heroName : names.villainName
}

// ---------------------------------------------------------------------------
// Cells and rows
// ---------------------------------------------------------------------------

type Formatter = (v: CountShare) => string

interface RowSpec {
  key: string
  label: string
  hero: CountShare
  villain: CountShare
  polarity: ComparePolarity
  format: Formatter
  /** Evidence title per side; null = not clickable */
  evidenceTitle: ((sideName: string) => string) | null
  /** Show the denominator rallies (e.g. all serves, with W/L) instead of the count rallies */
  evidenceUsesDenominator?: boolean
  evidenceSubtitle?: string
}

function cell(
  value: CountShare,
  tone: MetricCellModel['tone'],
  spec: RowSpec,
  sideName: string
): MetricCellModel {
  const ids =
    spec.evidenceUsesDenominator && value.denominatorRallyIds
      ? value.denominatorRallyIds
      : value.rallyIds
  return {
    text: spec.format(value),
    tone,
    evidence:
      spec.evidenceTitle && ids.length > 0
        ? { title: spec.evidenceTitle(sideName), subtitle: spec.evidenceSubtitle, rallyIds: ids }
        : null,
  }
}

function row(spec: RowSpec, names: Names): CompareRowModel {
  const tones = deriveCompareTone(spec.hero, spec.villain, spec.polarity)
  return {
    key: spec.key,
    label: spec.label,
    // First-person evidence titles: "You · errors", not the hero display name
    hero: cell(spec.hero, tones.hero, spec, 'You'),
    villain: cell(spec.villain, tones.villain, spec, names.villainName),
  }
}

// ---------------------------------------------------------------------------
// Section A — Match story
// ---------------------------------------------------------------------------

function setChips(story: MatchStoryResult): SetScoreChipModel[] {
  return story.setScores.map((s) => ({
    setNumber: s.setNumber,
    hero: s.hero,
    villain: s.villain,
    heroWon: s.hero === s.villain ? null : s.hero > s.villain,
  }))
}

function buildScoreCard(story: MatchStoryResult, names: Names): CompareCardModel {
  const rows: CompareRowModel[] = []
  const chips = setChips(story)

  if (story.matchScore && (story.matchScore.hero > 1 || story.matchScore.villain > 1 || chips.length > 1)) {
    rows.push({
      key: 'sets-won',
      label: 'Sets won',
      hero: { text: String(story.matchScore.hero), tone: 'none', evidence: null },
      villain: { text: String(story.matchScore.villain), tone: 'none', evidence: null },
    })
  }

  if (story.hasPointData) {
    rows.push(
      row(
        {
          key: 'points-won',
          label: 'Points won',
          hero: story.pointsWon.hero,
          villain: story.pointsWon.villain,
          polarity: 'higher',
          format: formatPctCount,
          evidenceTitle: (n) => `${n} · points won`,
        },
        names
      ),
      row(
        {
          key: 'points-won-on-serve',
          label: 'Points won on serve',
          hero: story.pointsWonOnServe.hero,
          villain: story.pointsWonOnServe.villain,
          polarity: 'higher',
          format: formatPctOf,
          evidenceTitle: (n) => `${n} · on serve`,
          evidenceUsesDenominator: true,
          evidenceSubtitle: 'Every point they served — won and lost.',
        },
        names
      )
    )
  }

  const parts: string[] = []
  if (story.matchScore && story.matchWinner) {
    const { hero, villain } = story.matchScore
    parts.push(
      `${nameOf(story.matchWinner, names)} won ${Math.max(hero, villain)}–${Math.min(hero, villain)}.`
    )
  } else if (chips.length === 1 && chips[0].heroWon !== null) {
    const c = chips[0]
    parts.push(`${c.heroWon ? names.heroName : names.villainName} took the set ${Math.max(c.hero, c.villain)}–${Math.min(c.hero, c.villain)}.`)
  }
  if (story.hasPointData) {
    const heroHold = story.pointsWonOnServe.hero
    const villainHold = story.pointsWonOnServe.villain
    if (heroHold.denominator > 0 && villainHold.denominator > 0 && heroHold.share !== villainHold.share) {
      parts.push(`${heroHold.share > villainHold.share ? names.heroName : names.villainName} held serve better.`)
    }
  }

  return {
    id: 'A1',
    title: 'The score',
    story: parts.length > 0 ? parts.join(' ') : 'Who won, by how much, and who held their serve.',
    rows,
    scoreline: chips,
  }
}

function buildEndingCard(story: MatchStoryResult, names: Names): CompareCardModel {
  const rows: CompareRowModel[] = []
  if (story.hasPointData) {
    rows.push(
      row(
        {
          key: 'errors',
          label: 'Errors',
          hero: story.errors.hero,
          villain: story.errors.villain,
          polarity: 'lower',
          format: formatPctCount,
          evidenceTitle: (n) => `${n} · errors`,
          evidenceSubtitle: 'Last ball went in the net, long or wide.',
        },
        names
      ),
      row(
        {
          key: 'winners',
          label: 'Winners',
          hero: story.winners.hero,
          villain: story.winners.villain,
          polarity: 'higher',
          format: formatPctCount,
          evidenceTitle: (n) => `${n} · winners`,
        },
        names
      ),
      row(
        {
          key: 'points-from-opponent-error',
          label: 'Points from opponent error',
          hero: story.pointsFromOpponentError.hero,
          villain: story.pointsFromOpponentError.villain,
          polarity: 'amber',
          format: formatPctOf,
          evidenceTitle: (n) => `${n} · points handed over`,
          evidenceSubtitle: 'Points they won because the other player missed.',
        },
        names
      )
    )
  }

  const parts: string[] = []
  if (story.hasPointData) {
    const he = story.errors.hero.count
    const ve = story.errors.villain.count
    if (he !== ve) {
      const [n, more, fewer] = he > ve ? [names.heroName, he, ve] : [names.villainName, ve, he]
      parts.push(`${n} threw away more points (${more} vs ${fewer}).`)
    } else {
      parts.push(`Both threw away ${he} point${he === 1 ? '' : 's'}.`)
    }
    const hw = story.winners.hero.count
    const vw = story.winners.villain.count
    if (hw !== vw) {
      const [n, more, fewer] = hw > vw ? [names.heroName, hw, vw] : [names.villainName, vw, hw]
      parts.push(`${n} finished more points (${more} vs ${fewer}).`)
    }
  }

  return {
    id: 'A2',
    title: 'How points ended',
    story: parts.length > 0 ? parts.join(' ') : 'Who threw points away, who earned them, and who was handed them.',
    rows,
  }
}

function buildWhoAttacksCard(attack: AttackStoryResult, names: Names): CompareCardModel {
  const rows: CompareRowModel[] = []
  if (attack.hasPointData) {
    rows.push(
      row(
        {
          key: 'attacked-first',
          label: 'Attacked first',
          hero: attack.attackedFirst.hero,
          villain: attack.attackedFirst.villain,
          polarity: 'higher',
          format: formatPctCount,
          evidenceTitle: (n) => `${n} · attacked first`,
        },
        names
      ),
      row(
        {
          key: 'won-when-attacking-first',
          label: 'Won when attacking first',
          hero: attack.wonWhenAttackedFirst.hero,
          villain: attack.wonWhenAttackedFirst.villain,
          polarity: 'higher',
          format: formatPctOf,
          evidenceTitle: (n) => `${n} · attacked first`,
          evidenceUsesDenominator: true,
          evidenceSubtitle: 'Every point they attacked first — won and lost.',
        },
        names
      )
    )
  }

  const parts: string[] = []
  if (attack.hasPointData) {
    const h = attack.attackedFirst.hero.count
    const v = attack.attackedFirst.villain.count
    if (h !== v) {
      parts.push(`${h > v ? names.heroName : names.villainName} took the initiative more (${Math.max(h, v)} vs ${Math.min(h, v)}).`)
    } else if (h > 0) {
      parts.push(`Both attacked first ${h} time${h === 1 ? '' : 's'}.`)
    }
    if (attack.noAttack.count > 0) {
      parts.push(`Nobody attacked in ${formatPctCount(attack.noAttack)} of points.`)
    }
  }

  return {
    id: 'A3',
    title: 'Who attacks',
    story: parts.length > 0 ? parts.join(' ') : 'Who takes the initiative, and whether it pays off.',
    rows,
    emptyMessage: 'Tag a set (first attack mark) to fill this card',
  }
}

const WIN_PHASE_ROWS: { phase: WinPhase; label: string }[] = [
  { phase: 'no_attack', label: 'Before anyone attacked' },
  { phase: 'on_attack', label: 'On the first attack' },
  { phase: 'within_3', label: '1–3 shots after it' },
  { phase: 'continuation', label: 'Longer exchange' },
]

function buildWinPhaseCard(attack: AttackStoryResult, names: Names): CompareCardModel {
  const rows = attack.hasPointData
    ? WIN_PHASE_ROWS.map(({ phase, label }) =>
        row(
          {
            key: `win-${phase}`,
            label,
            hero: attack.winPhase[phase].hero,
            villain: attack.winPhase[phase].villain,
            polarity: 'neutral',
            format: formatPctOf,
            evidenceTitle: (n) => `${n} · won ${label.toLowerCase()}`,
          },
          names
        )
      )
    : []

  let story = 'Where in the rally each player wins their points. Rows add up to 100%.'
  if (attack.hasPointData) {
    const top = (side: 'hero' | 'villain') =>
      [...WIN_PHASE_ROWS].sort(
        (a, b) => attack.winPhase[b.phase][side].count - attack.winPhase[a.phase][side].count
      )[0]
    const h = top('hero')
    if (attack.winPhase[h.phase].hero.count > 0) {
      story = `${names.heroName} won most points ${h.label.toLowerCase()}. Rows add up to 100% of each player's points.`
    }
  }

  return { id: 'A4', title: 'When points are won', story, rows }
}

// ---------------------------------------------------------------------------
// Section D — first attack, Section F — misses
// ---------------------------------------------------------------------------

const TIMING_ROWS: { timing: AttackTiming; label: string }[] = [
  { timing: 'return', label: 'On the return' },
  { timing: 'third_ball', label: 'Third ball' },
  { timing: 'later', label: 'Later' },
]

function usedWonCell(used: CountShare, won: CountShare, title: string): MetricCellModel {
  if (used.count === 0) return { text: NO_VALUE, tone: 'none', evidence: null }
  return {
    text: `${formatPctOf(used)} · won ${pct(won.share)}`,
    tone: 'none',
    evidence: { title, subtitle: 'Won and lost — check the winner chip.', rallyIds: used.rallyIds },
  }
}

function buildTimingCard(attack: AttackStoryResult, names: Names): CompareCardModel {
  const anyAttack = attack.attackedFirst.hero.count + attack.attackedFirst.villain.count > 0
  const rows: CompareRowModel[] = anyAttack
    ? TIMING_ROWS.map(({ timing, label }) => ({
        key: `timing-${timing}`,
        label,
        hero: usedWonCell(
          attack.attackTiming[timing].hero.used,
          attack.attackTiming[timing].hero.won,
          `${names.heroName} · attacked ${label.toLowerCase()}`
        ),
        villain: usedWonCell(
          attack.attackTiming[timing].villain.used,
          attack.attackTiming[timing].villain.won,
          `${names.villainName} · attacked ${label.toLowerCase()}`
        ),
      }))
    : []
  return {
    id: 'D1',
    title: 'When I attack',
    story: 'Share of each player’s first attacks, and how often that point was won.',
    rows,
    emptyMessage: 'No first attacks marked yet',
  }
}

function buildWeaponsCard(attack: AttackStoryResult, names: Names): CompareCardModel {
  const keys: string[] = []
  for (const side of ['hero', 'villain'] as const) {
    for (const w of attack.weapons[side]) if (!keys.includes(w.key)) keys.push(w.key)
  }
  const rows: CompareRowModel[] = keys.map((key) => {
    const h = attack.weapons.hero.find((w) => w.key === key)
    const v = attack.weapons.villain.find((w) => w.key === key)
    const meta = h ?? v!
    const label = formatShotType(meta.wing, meta.stroke)
    return {
      key: `weapon-${key}`,
      label,
      hero: h ? usedWonCell(h.used, h.won, `${names.heroName} · ${label}`) : { text: NO_VALUE, tone: 'none', evidence: null },
      villain: v ? usedWonCell(v.used, v.won, `${names.villainName} · ${label}`) : { text: NO_VALUE, tone: 'none', evidence: null },
    }
  })
  return {
    id: 'D2',
    title: 'What I attack with',
    story: 'Wing and stroke on the first attack, and how often that point was won.',
    rows,
    emptyMessage: 'No first attacks marked yet',
  }
}

const MISS_ORDER: MissReasonKey[] = [
  'technical',
  'timing',
  'footwork',
  'positioning',
  'misread',
  'forced',
  'untagged',
]

export function buildMissReasonCard(attack: AttackStoryResult, names: Names): CompareCardModel {
  const rows = MISS_ORDER.filter(
    (k) => attack.missReasons.hero[k].count + attack.missReasons.villain[k].count > 0
  ).map((k) =>
    row(
      {
        key: `miss-${k}`,
        label: MISS_REASON_LABEL[k],
        hero: attack.missReasons.hero[k],
        villain: attack.missReasons.villain[k],
        polarity: 'neutral',
        format: formatPctOf,
        evidenceTitle: (n) => `${n} · ${MISS_REASON_LABEL[k].toLowerCase()} misses`,
      },
      names
    )
  )

  const heroTop = MISS_ORDER.filter((k) => k !== 'untagged').sort(
    (a, b) => attack.missReasons.hero[b].count - attack.missReasons.hero[a].count
  )[0]
  const topCount = heroTop ? attack.missReasons.hero[heroTop].count : 0
  const story =
    topCount > 0
      ? `${names.heroName}'s most common miss: ${MISS_REASON_LABEL[heroTop].toLowerCase()} (${topCount} of ${attack.missReasons.hero[heroTop].denominator}).`
      : 'Reason picked on error endings. Share of each player’s own errors.'

  return {
    id: 'F4',
    title: 'Why points were missed',
    story,
    rows,
    emptyMessage: 'No errors tagged yet',
  }
}

// ---------------------------------------------------------------------------
// Takeaways — "what does this match say?"
// ---------------------------------------------------------------------------

function evidence(title: string, ids: string[], subtitle?: string): EvidenceRef | null {
  return ids.length > 0 ? { title, rallyIds: ids, subtitle } : null
}

export function buildTakeaways(
  story: MatchStoryResult,
  attack: AttackStoryResult,
  focus: ReviewPattern[],
  names: Names
): TakeawayModel[] {
  if (!story.hasPointData) return []
  const out: TakeawayModel[] = []
  const he = story.errors.hero
  const ve = story.errors.villain

  if (he.share - ve.share >= 0.1) {
    out.push({
      key: 'errors',
      tone: 'bad',
      text: `You gave away ${he.count} points on errors (${pct(he.share)} of all points) — ${names.villainName} gave away ${ve.count}.`,
      evidence: evidence('You · errors', he.rallyIds),
    })
  } else if (ve.share - he.share >= 0.1) {
    out.push({
      key: 'errors',
      tone: 'good',
      text: `You kept errors down: ${he.count} vs ${ve.count} from ${names.villainName}.`,
      evidence: evidence('You · errors', he.rallyIds),
    })
  }

  const serve = story.pointsWonOnServe.hero
  if (serve.denominator >= 3) {
    const tone = serve.share < 0.45 ? 'bad' : serve.share >= 0.6 ? 'good' : 'info'
    out.push({
      key: 'serve',
      tone,
      text: `You won ${serve.count} of ${serve.denominator} points on your serve (${pct(serve.share)}).`,
      evidence: evidence('You · on serve', serve.denominatorRallyIds ?? [], 'Every point you served — won and lost.'),
    })
  }

  const first = attack.attackedFirst.hero
  const conv = attack.wonWhenAttackedFirst.hero
  if (first.count > 0) {
    out.push({
      key: 'attack',
      tone: conv.share >= 0.6 ? 'good' : conv.share < 0.4 ? 'bad' : 'info',
      text: `You attacked first in ${pct(first.share)} of points and won ${pct(conv.share)} of those (${conv.count}/${conv.denominator}).`,
      evidence: evidence('You · attacked first', first.rallyIds),
    })
  } else if (attack.attackedFirst.villain.count > 0) {
    out.push({
      key: 'attack',
      tone: 'bad',
      text: `You never attacked first — ${names.villainName} did ${attack.attackedFirst.villain.count} times.`,
      evidence: evidence(`${names.villainName} · attacked first`, attack.attackedFirst.villain.rallyIds),
    })
  }

  const heroMiss = MISS_ORDER.filter((k) => k !== 'untagged').sort(
    (a, b) => attack.missReasons.hero[b].count - attack.missReasons.hero[a].count
  )[0]
  if (heroMiss && attack.missReasons.hero[heroMiss].count >= 2) {
    const m = attack.missReasons.hero[heroMiss]
    out.push({
      key: 'miss',
      tone: 'info',
      text: `Most of your misses were ${MISS_REASON_LABEL[heroMiss].toLowerCase()} (${m.count} of ${m.denominator}).`,
      evidence: evidence(`You · ${MISS_REASON_LABEL[heroMiss].toLowerCase()} misses`, m.rallyIds),
    })
  }

  const heroFocus = focus.filter((p) => p.side === 'hero')[0]
  if (heroFocus) {
    out.push({
      key: 'review',
      tone: 'info',
      text: `Flagged for review: ${heroFocus.count}× ${formatShotType(heroFocus.wing, heroFocus.stroke)} (${heroFocus.kind}).`,
      evidence: evidence(
        `${names.heroName} · ${formatShotType(heroFocus.wing, heroFocus.stroke)}`,
        [...new Set(heroFocus.lines.map((l) => l.rallyId))]
      ),
    })
  }

  return out
}

// ---------------------------------------------------------------------------
// Rally rows
// ---------------------------------------------------------------------------

export function buildRallyRows(data: CompleteMatchData, names: Names): RallyRowModel[] {
  const setNumberById = new Map(data.sets.map((s) => [s.id, s.set_number]))
  const shotsByRally = new Map<string, DBShot[]>()
  for (const shot of data.shots) {
    const list = shotsByRally.get(shot.rally_id) ?? []
    list.push(shot)
    shotsByRally.set(shot.rally_id, list)
  }

  const sideName = (playerId: string | null) =>
    playerId === names.heroId ? names.heroName : names.villainName

  return filterBrowseableTaggedRallies(data.rallies)
    .map((r: DBRally): RallyRowModel => {
      const shots = (shotsByRally.get(r.id) ?? []).sort((a, b) => a.shot_index - b.shot_index)
      const incomplete = !isCompleteScoringRally(r)
      const last = shots[shots.length - 1]
      const heroWon = r.winner_id === names.heroId
      const isError = isErrorEnding(r.point_ending)
      const lastHitter = last
        ? sideName(last.player_id)
        : isError
          ? heroWon ? names.villainName : names.heroName
          : heroWon ? names.heroName : names.villainName
      const missReasonLabel =
        isError && r.point_miss_reason ? MISS_REASON_LABEL[r.point_miss_reason] ?? null : null
      const endingLabel = incomplete
        ? r.point_ending
          ? (ENDING_LABEL[r.point_ending] ?? r.point_ending)
          : 'missing end'
        : (ENDING_LABEL[r.point_ending] ?? r.point_ending)
      const shotCount = shots.length
      const summaryParts = [
        `${shotCount} shot${shotCount === 1 ? '' : 's'}`,
        r.first_attack_index ? `attack on ${r.first_attack_index}` : 'no attack',
        incomplete
          ? 'incomplete Pass 1'
          : `${lastHitter} ${endingLabel}${missReasonLabel ? ` (${missReasonLabel})` : ''}`,
      ]
      const start = r.timestamp_start
      const end = r.timestamp_end ?? r.end_of_point_time
      const winnerName = r.winner_id
        ? heroWon
          ? names.heroName
          : names.villainName
        : '—'
      return {
        id: r.id,
        setId: r.set_id,
        setNumber: setNumberById.get(r.set_id) ?? 0,
        rallyIndex: r.rally_index,
        scoreBefore: `${r.player1_score_before}–${r.player2_score_before}`,
        scoreAfter: `${r.player1_score_after}–${r.player2_score_after}`,
        serverName: sideName(r.server_id),
        winnerName,
        heroWon,
        heroServed: r.server_id === names.heroId,
        shotCount,
        fos: r.first_attack_index,
        endingLabel,
        isError,
        missReasonLabel,
        isHighlight: r.is_highlight,
        reviewCount: shots.filter((s) => s.shot_review_kind).length,
        isIncomplete: incomplete,
        summary: summaryParts.join(' · '),
        loop:
          typeof start === 'number' && typeof end === 'number'
            ? { start: Math.max(0, start - LOOP_PAD_SECONDS), end: end + LOOP_PAD_SECONDS }
            : null,
      }
    })
    .sort((a, b) => a.setNumber - b.setNumber || a.rallyIndex - b.rallyIndex)
}

// ---------------------------------------------------------------------------
// Work on (shots flagged for review)
// ---------------------------------------------------------------------------

function patternModel(
  p: ReviewPattern,
  setNumberById: Map<string, number>
): ReviewPatternModel {
  return {
    key: p.key,
    title: formatShotType(p.wing, p.stroke),
    kindLabel: p.kind === 'technical' ? 'Technical' : 'Tactical',
    reviewKind: p.kind,
    wing: p.wing,
    stroke: p.stroke,
    count: p.count,
    items: p.lines.map((l) => ({
      shotId: l.shotId,
      rallyId: l.rallyId,
      shotIndex: l.shotIndex,
      label: `Set ${setNumberById.get(l.setId) ?? '?'} · rally ${l.rallyIndex} · shot ${l.shotIndex}`,
      seekTime: l.timestampStart,
    })),
  }
}

function buildWorkOn(
  data: CompleteMatchData,
  story: MatchStoryResult,
  attack: AttackStoryResult,
  names: Names
): { workOn: WorkOnModel; focus: ReviewPattern[] } {
  const lines = calculateReviewShots({ rallies: data.rallies, shots: data.shots })
  const groups = groupReviewShots(lines, names.heroId)
  const setNumberById = new Map(data.sets.map((s) => [s.id, s.set_number]))

  const side = (s: 'hero' | 'villain'): ReviewSideModel => ({
    name: nameOf(s, names),
    total: groups.bySide[s].total,
    technical: groups.bySide[s].technical.map((p) => patternModel(p, setNumberById)),
    tactical: groups.bySide[s].tactical.map((p) => patternModel(p, setNumberById)),
  })

  const heroErrorIds = story.errors.hero.rallyIds

  return {
    focus: groups.focus,
    workOn: {
      focus: groups.focus.map((p) => ({
        key: p.key,
        side: p.side,
        text: `${p.count}× ${formatShotType(p.wing, p.stroke)} · ${p.kind}`,
      })),
      total: groups.total,
      hero: side('hero'),
      villain: side('villain'),
      missReasons: buildMissReasonCard(attack, names),
      heroErrors: {
        title: `${names.heroName} · all errors`,
        subtitle: 'Every point you lost on your own miss.',
        rallyIds: heroErrorIds,
      },
    },
  }
}

// ---------------------------------------------------------------------------
// Sets + result
// ---------------------------------------------------------------------------

const SET_STATUS_LABEL = {
  not_started: 'Not tagged',
  in_progress: 'Tagging in progress',
  tagged: 'Tagged',
} as const

function buildSetPanels(data: CompleteMatchData, names: Names): SetPanelModel[] {
  const rallyCount = new Map<string, number>()
  for (const r of data.rallies) rallyCount.set(r.set_id, (rallyCount.get(r.set_id) ?? 0) + 1)

  return [...data.sets]
    .sort((a, b) => a.set_number - b.set_number)
    .map((s) => {
      const count = rallyCount.get(s.id) ?? 0
      const status = deriveSetTaggingStatus(s, count)
      const scored = s.player1_score_final > 0 || s.player2_score_final > 0
      const heroWon =
        s.winner_id !== null
          ? s.winner_id === names.heroId
          : status === 'tagged' && s.player1_score_final !== s.player2_score_final
            ? s.player1_score_final > s.player2_score_final
            : null
      return {
        setId: s.id,
        setNumber: s.set_number,
        status,
        statusLabel: SET_STATUS_LABEL[status],
        rallyCount: count,
        scoreLabel: scored ? `${s.player1_score_final}–${s.player2_score_final}` : null,
        heroWon,
      }
    })
}

function buildResult(
  data: CompleteMatchData,
  sets: SetPanelModel[]
): { label: string; tone: 'good' | 'bad' | 'info' } {
  const m = data.match
  if (m.winner_id) {
    const won = m.winner_id === m.player1_id
    return {
      label: `${won ? 'Won' : 'Lost'} ${m.player1_sets_final}–${m.player2_sets_final}`,
      tone: won ? 'good' : 'bad',
    }
  }
  const decided = sets.filter((s) => s.heroWon !== null)
  if (sets.length === 1 && decided.length === 1) {
    const s = decided[0]
    return { label: `${s.heroWon ? 'Won' : 'Lost'} the set ${s.scoreLabel}`, tone: s.heroWon ? 'good' : 'bad' }
  }
  if (decided.length > 0) {
    const won = decided.filter((s) => s.heroWon).length
    return { label: `Sets ${won}–${decided.length - won} so far`, tone: 'info' }
  }
  if (sets.some((s) => s.status !== 'not_started')) return { label: 'Tagging in progress', tone: 'info' }
  return { label: 'Not tagged yet', tone: 'info' }
}

const LOCKED: LockedSectionModel[] = [
  {
    id: 'E',
    title: 'When they attack',
    question: 'When my opponent attacks first, how do I respond, and do I get back into the point?',
    note: 'Needs reply wing, stroke and standing on more rallies.',
  },
]

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function buildMatchReviewViewModel(
  data: CompleteMatchData,
  heroName: string,
  villainName: string
): MatchReviewViewModel {
  const names: Names = { heroId: data.match.player1_id, heroName, villainName }

  const story = calculateMatchStory({
    match: data.match,
    sets: data.sets,
    rallies: data.rallies,
    shots: data.shots,
    heroId: names.heroId,
    villainId: data.match.player2_id,
  })
  const attack = calculateAttackStory({
    rallies: data.rallies,
    shots: data.shots,
    heroId: names.heroId,
  })
  const { workOn, focus } = buildWorkOn(data, story, attack, names)
  const highlights = calculateRallyHighlights({
    sets: data.sets,
    rallies: data.rallies,
    shots: data.shots,
  })
  const sets = buildSetPanels(data, names)
  const result = buildResult(data, sets)

  const sections: CompareSectionModel[] = [
    {
      id: 'A',
      title: 'Match story',
      question: 'Why did you finish with this score?',
      cards: [
        buildScoreCard(story, names),
        buildEndingCard(story, names),
        buildWhoAttacksCard(attack, names),
        buildWinPhaseCard(attack, names),
      ],
    },
    ...buildServeReceiveSections(
      calculateServeReceiveStory({ rallies: data.rallies, shots: data.shots, heroId: names.heroId }),
      names
    ),
    {
      id: 'D',
      title: 'Your first attack',
      question: 'When do you attack first, with what, and does it work?',
      cards: [buildTimingCard(attack, names), buildWeaponsCard(attack, names)],
    },
    {
      id: 'F',
      title: 'Your misses',
      question: 'What kind of error are you making?',
      cards: [workOn.missReasons],
    },
  ]

  const source = data.match.match_date_source ?? null
  return {
    heroName,
    villainName,
    dateLabel: new Date(data.match.match_date).toLocaleDateString(),
    resultLabel: result.label,
    resultTone: result.tone,
    hasPointData: story.hasPointData,
    totalPoints: story.totalPoints,
    takeaways: buildTakeaways(story, attack, focus, names),
    sections,
    locked: LOCKED,
    workOn,
    highlights: {
      flagged: highlights.flagged.map((h) => h.rallyId),
      longest: highlights.longest.map((h) => h.rallyId),
    },
    sets,
    rallies: buildRallyRows(data, names),
    context: {
      matchDate: data.match.match_date.slice(0, 10),
      matchDateSource: source,
      matchDateSourceLabel: matchDateSourceLabel(source),
      suggestedVideoDate: null,
      player1Id: data.match.player1_id,
      player2Id: data.match.player2_id,
      tournamentId: data.match.tournament_id,
      tournamentName: null,
      round: data.match.round,
      roundLabel: matchRoundLabel(data.match.round),
    },
  }
}
