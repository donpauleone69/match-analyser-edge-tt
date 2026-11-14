/**
 * Serve Data + Receive Data — curated cards, headlines, and playlist focuses.
 *
 * Fewer cards than the old B0–B3 / C1–C3 wall. Every number still opens
 * evidence; playlist focuses drive the supporting point list → Clips/player.
 */

import { shareOf, type CountShare, type StorySide } from '@/rules/analytics/calculateMatchStory'
import {
  sumOutcomes,
  SERVE_NEUTRAL,
  SERVE_PUNISHED,
  SERVE_WORKED,
  type OutcomeLine,
  type ServeOutcome,
  type ServeReceiveResult,
} from '@/rules/analytics/calculateServeReceiveStory'
import { deriveCompareTone, type ComparePolarity } from '@/rules/analytics/deriveCompareTone'
import type {
  CellTone,
  CompareCardModel,
  CompareRowModel,
  CompareSectionModel,
  HeadlineMetricModel,
  MetricCellModel,
  PlaylistFocusModel,
} from '../models'

interface Names {
  heroName: string
  villainName: string
}

const NO_VALUE = '—'

const pct = (share: number) => `${Math.round(share * 100)}%`

function base(v: CountShare): string {
  return `${pct(v.share)} (${v.count}/${v.denominator})`
}

function missText(m: OutcomeLine['misses']): string {
  const parts = (['net', 'long', 'wide'] as const).filter((k) => m[k] > 0).map((k) => `${m[k]} ${k}`)
  return parts.length > 0 ? ` · ${parts.join(', ')}` : ''
}

interface CellSpec {
  value: CountShare
  won?: CountShare
  wonLabel?: string
  misses?: OutcomeLine['misses']
}

interface RowSpec {
  key: string
  label: string
  polarity: ComparePolarity
  side: (s: StorySide) => CellSpec
  evidenceTitle: (sideName: string) => string
}

function cellOf(spec: CellSpec, tone: MetricCellModel['tone'], title: string): MetricCellModel {
  const { value, won, wonLabel = 'won', misses } = spec
  if (value.denominator === 0) return { text: NO_VALUE, tone: 'none', evidence: null }
  const extra = (misses ? missText(misses) : '') + (won && value.count > 0 ? ` · ${wonLabel} ${pct(won.share)}` : '')
  return {
    text: base(value) + extra,
    tone: value.count === 0 ? 'none' : tone,
    evidence:
      value.rallyIds.length > 0
        ? { title, subtitle: won ? 'Won and lost — check the winner chip.' : undefined, rallyIds: value.rallyIds }
        : null,
  }
}

function row(spec: RowSpec, names: Names): CompareRowModel {
  const hero = spec.side('hero')
  const villain = spec.side('villain')
  const tones = deriveCompareTone(hero.value, villain.value, spec.polarity)
  return {
    key: spec.key,
    label: spec.label,
    hero: cellOf(hero, tones.hero, spec.evidenceTitle('You')),
    villain: cellOf(villain, tones.villain, spec.evidenceTitle(names.villainName)),
  }
}

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

function focus(
  id: string,
  label: string,
  rallyIds: string[],
  tone: CellTone = 'none'
): PlaylistFocusModel {
  return { id, label, count: rallyIds.length, tone, rallyIds: uniqueIds(rallyIds) }
}

function headline(
  key: string,
  label: string,
  value: CountShare,
  tone: CellTone,
  evidenceTitle: string
): HeadlineMetricModel {
  if (value.denominator === 0) {
    return { key, label, text: NO_VALUE, tone: 'none', evidence: null }
  }
  return {
    key,
    label,
    text: pct(value.share),
    tone: value.count === 0 ? 'none' : tone,
    evidence:
      value.rallyIds.length > 0
        ? { title: evidenceTitle, rallyIds: value.rallyIds }
        : null,
  }
}

// ---------------------------------------------------------------------------
// Serve Data — 2 cards
// ---------------------------------------------------------------------------

function buildServeCards(story: ServeReceiveResult, names: Names): CompareCardModel[] {
  const serve = story.serve
  const total = (s: StorySide) => story.servePoints[s]
  const group = (s: StorySide, outcomes: ServeOutcome[]) => sumOutcomes(serve[s], outcomes, total(s))
  const lineMiss = (s: StorySide, o: ServeOutcome): CellSpec => ({
    value: serve[s][o].points,
    misses: serve[s][o].misses,
  })
  const lineWon = (s: StorySide, o: ServeOutcome): CellSpec => ({
    value: serve[s][o].points,
    won: serve[s][o].won,
  })
  const attackedServe = (s: StorySide) =>
    group(s, ['return_attack_winner', 'return_attack_missed', 'return_attack_rally_on'])

  const glanceRows: CompareRowModel[] = [
    row(
      {
        key: 'serve-worked',
        label: 'Serve worked',
        polarity: 'higher',
        side: (s) => ({ value: group(s, SERVE_WORKED).points }),
        evidenceTitle: (n) => `${n} · serve worked`,
      },
      names
    ),
    row(
      {
        key: 'serve-punished',
        label: 'Serve punished',
        polarity: 'lower',
        side: (s) => ({ value: group(s, SERVE_PUNISHED).points }),
        evidenceTitle: (n) => `${n} · serve punished`,
      },
      names
    ),
    row(
      {
        key: 'serve-neutral',
        label: 'Neutral',
        polarity: 'neutral',
        side: (s) => ({ value: group(s, SERVE_NEUTRAL).points }),
        evidenceTitle: (n) => `${n} · neutral serves`,
      },
      names
    ),
    row(
      {
        key: 'faults',
        label: 'Faults',
        polarity: 'lower',
        side: (s) => lineMiss(s, 'fault'),
        evidenceTitle: (n) => `${n} · service faults`,
      },
      names
    ),
  ]

  const leakRows: CompareRowModel[] = [
    row(
      {
        key: 'serve-attacked',
        label: 'Opponent attacked the serve',
        polarity: 'lower',
        side: (s) => {
          const a = attackedServe(s)
          const missed = serve[s].return_attack_missed.points.rallyIds
          return {
            value: a.points,
            won: shareOf(missed, a.points.count, a.points.rallyIds),
            wonLabel: 'they missed',
          }
        },
        evidenceTitle: (n) => `${n} · serve attacked`,
      },
      names
    ),
    row(
      {
        key: 'return-attack-winner',
        label: 'Return winners against you',
        polarity: 'lower',
        side: (s) => ({ value: serve[s].return_attack_winner.points }),
        evidenceTitle: (n) => `${n} · return winners against`,
      },
      names
    ),
    row(
      {
        key: 'server-attacked-first',
        label: 'You attacked first',
        polarity: 'higher',
        side: (s) => lineWon(s, 'server_attacked_first'),
        evidenceTitle: (n) => `${n} · attacked first on serve`,
      },
      names
    ),
  ]

  const heroWorked = group('hero', SERVE_WORKED).points
  const heroAttacked = attackedServe('hero')
  const heroFaults = serve.hero.fault.points.count
  const summaryStory =
    heroWorked.denominator > 0
      ? `${names.heroName}'s serve worked ${pct(heroWorked.share)} of the time. It was attacked ${pct(heroAttacked.points.share)}` +
        (heroAttacked.points.count > 0
          ? serve.hero.return_attack_missed.points.count > 0
            ? `, and ${serve.hero.return_attack_missed.points.count} of ${heroAttacked.points.count} of those attacks missed.`
            : ', and none of those attacks missed.'
          : '.') +
        ` ${heroFaults === 0 ? 'No faults.' : `${heroFaults} fault${heroFaults === 1 ? '' : 's'}.`}`
      : 'Is the serve working, and where does it leak points?'

  return [
    { id: 'B0', title: 'Serve at a glance', story: summaryStory, rows: glanceRows },
    {
      id: 'B1',
      title: 'Where it pays or leaks',
      story: 'Attack pressure on your serve, and whether you seize the third ball.',
      rows: leakRows,
    },
  ]
}

function buildServeHeadlines(story: ServeReceiveResult): HeadlineMetricModel[] {
  const serve = story.serve.hero
  const total = story.servePoints.hero
  const worked = sumOutcomes(serve, SERVE_WORKED, total).points
  const punished = sumOutcomes(serve, SERVE_PUNISHED, total).points
  const faults = serve.fault.points
  return [
    headline('worked', 'Worked', worked, 'good', 'You · serve worked'),
    headline('punished', 'Punished', punished, 'bad', 'You · serve punished'),
    headline('faults', 'Faults', faults, faults.count > 0 ? 'bad' : 'good', 'You · service faults'),
  ]
}

function buildServeFocuses(story: ServeReceiveResult, cards: CompareCardModel[]): PlaylistFocusModel[] {
  const serve = story.serve.hero
  const total = story.servePoints.hero
  const worked = sumOutcomes(serve, SERVE_WORKED, total).points.rallyIds
  const punished = sumOutcomes(serve, SERVE_PUNISHED, total).points.rallyIds
  const faults = serve.fault.points.rallyIds
  const attacked = ['return_attack_winner', 'return_attack_missed', 'return_attack_rally_on'].flatMap(
    (o) => serve[o as ServeOutcome].points.rallyIds
  )
  const problemIds = uniqueIds(
    cards.flatMap((c) =>
      c.rows.flatMap((r) => (r.hero.tone === 'bad' && r.hero.evidence ? r.hero.evidence.rallyIds : []))
    )
  )
  const chips = [
    focus('problems', 'Problems', problemIds.length > 0 ? problemIds : punished, 'bad'),
    focus('worked', 'Worked', worked, 'good'),
    focus('punished', 'Punished', punished, 'bad'),
    focus('faults', 'Faults', faults, 'bad'),
    focus('attacked', 'Attacked', attacked, 'amber'),
    focus('all', 'All serve points', total, 'none'),
  ]
  return chips.filter((c) => c.id === 'all' || c.id === 'problems' || c.count > 0)
}

// ---------------------------------------------------------------------------
// Receive Data — 2 cards
// ---------------------------------------------------------------------------

const ATTACKED: ServeOutcome[] = ['return_attack_winner', 'return_attack_missed', 'return_attack_rally_on']
const PASSIVE: ServeOutcome[] = ['ace', 'passive_return_missed', 'server_attacked_first', 'receiver_attacked_later', 'no_attack']

function buildReceiveCards(story: ServeReceiveResult, names: Names): CompareCardModel[] {
  const recv = story.receive
  const ids = (s: StorySide, outcomes: ServeOutcome[]) => outcomes.flatMap((o) => recv[s][o].points.rallyIds)
  const wonIds = (s: StorySide, outcomes: ServeOutcome[]) => outcomes.flatMap((o) => recv[s][o].won.rallyIds)
  const decided = (s: StorySide) => ids(s, [...ATTACKED, ...PASSIVE])
  const attacked = (s: StorySide) => ids(s, ATTACKED)
  const passive = (s: StorySide) => ids(s, PASSIVE)
  const of = (part: string[], whole: string[]) => shareOf(part, whole.length, whole)
  const misses = (s: StorySide, outcomes: ServeOutcome[]) =>
    outcomes.reduce(
      (m, o) => ({
        net: m.net + recv[s][o].misses.net,
        long: m.long + recv[s][o].misses.long,
        wide: m.wide + recv[s][o].misses.wide,
      }),
      { net: 0, long: 0, wide: 0 }
    )
  const within = (
    s: StorySide,
    outcomes: ServeOutcome[],
    whole: string[],
    withWon = false,
    withMiss = false
  ): CellSpec => ({
    value: of(ids(s, outcomes), whole),
    ...(withWon ? { won: of(wonIds(s, outcomes), ids(s, outcomes)) } : {}),
    ...(withMiss ? { misses: misses(s, outcomes) } : {}),
  })

  const heroAtt = attacked('hero')
  const heroPas = passive('hero')
  const heroDec = decided('hero')
  const pctOf = (part: string[], whole: string[]) => (whole.length > 0 ? pct(part.length / whole.length) : NO_VALUE)
  const summaryStory =
    heroDec.length > 0
      ? `${names.heroName} attacked ${pctOf(heroAtt, heroDec)} of returns` +
        (heroAtt.length > 0
          ? ids('hero', ['return_attack_missed']).length > 0
            ? ` and missed ${ids('hero', ['return_attack_missed']).length} of ${heroAtt.length}.`
            : ' and missed none.'
          : '.') +
        (heroPas.length > 0
          ? ` Passive returns let the server attack first ${pctOf(ids('hero', ['server_attacked_first']), heroPas)} of the time.`
          : '') +
        ` Won ${pctOf(wonIds('hero', ATTACKED), heroAtt)} after attacking, ${pctOf(wonIds('hero', PASSIVE), heroPas)} after a passive return.`
      : 'How each player receives — attack or passive — and how well each choice works.'

  const glanceRows: CompareRowModel[] = [
    row(
      {
        key: 'recv-attacked',
        label: 'Attacked the return',
        polarity: 'neutral',
        side: (s) => within(s, ATTACKED, decided(s), true),
        evidenceTitle: (n) => `${n} · attacked the return`,
      },
      names
    ),
    row(
      {
        key: 'recv-passive',
        label: 'Passive return',
        polarity: 'neutral',
        side: (s) => within(s, PASSIVE, decided(s), true),
        evidenceTitle: (n) => `${n} · passive return`,
      },
      names
    ),
    row(
      {
        key: 'recv-missed-attacking',
        label: 'Missed when attacking',
        polarity: 'lower',
        side: (s) => ({ value: of(ids(s, ['return_attack_missed']), attacked(s)) }),
        evidenceTitle: (n) => `${n} · return attack missed`,
      },
      names
    ),
    row(
      {
        key: 'recv-missed-passive',
        label: 'Missed when passive',
        polarity: 'lower',
        side: (s) => ({ value: of(ids(s, ['ace', 'passive_return_missed']), passive(s)) }),
        evidenceTitle: (n) => `${n} · passive return missed`,
      },
      names
    ),
  ]

  const detailRows: CompareRowModel[] = [
    row(
      {
        key: 'c2-winner',
        label: 'Return winner',
        polarity: 'higher',
        side: (s) => within(s, ['return_attack_winner'], attacked(s)),
        evidenceTitle: (n) => `${n} · return winners`,
      },
      names
    ),
    row(
      {
        key: 'c2-missed',
        label: 'Attacked return missed',
        polarity: 'lower',
        side: (s) => within(s, ['return_attack_missed'], attacked(s), false, true),
        evidenceTitle: (n) => `${n} · return attack missed`,
      },
      names
    ),
    row(
      {
        key: 'c3-server-attacked',
        label: 'Server attacked after passive',
        polarity: 'lower',
        side: (s) => within(s, ['server_attacked_first'], passive(s), true),
        evidenceTitle: (n) => `${n} · server attacked next`,
      },
      names
    ),
    row(
      {
        key: 'c3-attacked-later',
        label: 'You attacked later',
        polarity: 'higher',
        side: (s) => within(s, ['receiver_attacked_later'], passive(s), true),
        evidenceTitle: (n) => `${n} · attacked later on receive`,
      },
      names
    ),
  ]

  return [
    { id: 'C0', title: 'Receive at a glance', story: summaryStory, rows: glanceRows },
    {
      id: 'C1',
      title: 'Attack vs passive payoff',
      story: 'Does attacking the return pay, and does a passive return stay safe?',
      rows: detailRows,
      emptyMessage: 'No decided returns marked yet',
    },
  ]
}

function buildReceiveHeadlines(story: ServeReceiveResult): HeadlineMetricModel[] {
  const recv = story.receive.hero
  const attackedIds = ATTACKED.flatMap((o) => recv[o].points.rallyIds)
  const passiveIds = PASSIVE.flatMap((o) => recv[o].points.rallyIds)
  const decided = [...attackedIds, ...passiveIds]
  const missedAtt = recv.return_attack_missed.points.rallyIds
  const missedPas = [...recv.ace.points.rallyIds, ...recv.passive_return_missed.points.rallyIds]
  const of = (part: string[], whole: string[]) => shareOf(part, whole.length, whole)
  return [
    headline('attacked', 'Attacked', of(attackedIds, decided), 'none', 'You · attacked the return'),
    headline(
      'miss-attack',
      'Miss attacking',
      of(missedAtt, attackedIds),
      missedAtt.length > 0 ? 'bad' : 'good',
      'You · return attack missed'
    ),
    headline(
      'miss-passive',
      'Miss passive',
      of(missedPas, passiveIds),
      missedPas.length > 0 ? 'bad' : 'good',
      'You · passive return missed'
    ),
  ]
}

function buildReceiveFocuses(story: ServeReceiveResult, cards: CompareCardModel[]): PlaylistFocusModel[] {
  const recv = story.receive.hero
  const total = story.receivePoints.hero
  const attacked = ATTACKED.flatMap((o) => recv[o].points.rallyIds)
  const passive = PASSIVE.flatMap((o) => recv[o].points.rallyIds)
  const missedAtt = recv.return_attack_missed.points.rallyIds
  const missedPas = [...recv.ace.points.rallyIds, ...recv.passive_return_missed.points.rallyIds]
  const problemIds = uniqueIds(
    cards.flatMap((c) =>
      c.rows.flatMap((r) => (r.hero.tone === 'bad' && r.hero.evidence ? r.hero.evidence.rallyIds : []))
    )
  )
  const chips = [
    focus('problems', 'Problems', problemIds.length > 0 ? problemIds : [...missedAtt, ...missedPas], 'bad'),
    focus('attacked', 'Attacked', attacked, 'none'),
    focus('passive', 'Passive', passive, 'none'),
    focus('miss-attack', 'Miss attacking', missedAtt, 'bad'),
    focus('miss-passive', 'Miss passive', missedPas, 'bad'),
    focus('all', 'All receive points', total, 'none'),
  ]
  return chips.filter((c) => c.id === 'all' || c.id === 'problems' || c.count > 0)
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export function buildServeReceiveSections(story: ServeReceiveResult, names: Names): CompareSectionModel[] {
  if (!story.hasPointData) return []

  const serveCards = buildServeCards(story, names)
  const receiveCards = buildReceiveCards(story, names)
  const serveStory = serveCards[0]?.story ?? ''
  const receiveStory = receiveCards[0]?.story ?? ''

  return [
    {
      id: 'B',
      title: 'Serve Data',
      question: 'Is your serve working — and where does it leak?',
      pageStory: serveStory,
      cards: serveCards,
      headlines: buildServeHeadlines(story),
      playlistFocuses: buildServeFocuses(story, serveCards),
    },
    {
      id: 'C',
      title: 'Receive Data',
      question: 'Attack or passive — and how well does each choice work?',
      pageStory: receiveStory,
      cards: receiveCards,
      headlines: buildReceiveHeadlines(story),
      playlistFocuses: buildReceiveFocuses(story, receiveCards),
    },
  ]
}
