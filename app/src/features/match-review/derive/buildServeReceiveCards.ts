/**
 * Sections B (Serve) and C (Receive) — pure shaping of calculateServeReceiveStory.
 *
 * Each side shows its own serve (B) or receive (C) points, so rows keep their
 * own denominator: "40% (2/5)".
 */

import { shareOf, type CountShare, type SidePair, type StorySide } from '@/rules/analytics/calculateMatchStory'
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
import type { CompareCardModel, CompareRowModel, CompareSectionModel, MetricCellModel } from '../models'

interface Names {
  heroName: string
  villainName: string
}

const NO_VALUE = '—'
const SIDES: StorySide[] = ['hero', 'villain']

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
  /** Label for the `won` share (default "won") */
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

function hasAny(lines: SidePair<Record<ServeOutcome, OutcomeLine>>, outcomes: ServeOutcome[]): boolean {
  return SIDES.some((s) => outcomes.some((o) => lines[s][o].points.count > 0))
}

// ---------------------------------------------------------------------------
// Section B — Serve
// ---------------------------------------------------------------------------

function buildServeCards(story: ServeReceiveResult, names: Names): CompareCardModel[] {
  const serve = story.serve
  const total = (s: StorySide) => story.servePoints[s]
  const group = (s: StorySide, outcomes: ServeOutcome[]) => sumOutcomes(serve[s], outcomes, total(s))
  const line = (s: StorySide, o: ServeOutcome): CellSpec => ({ value: serve[s][o].points })
  const lineWon = (s: StorySide, o: ServeOutcome): CellSpec => ({ value: serve[s][o].points, won: serve[s][o].won })
  const lineMiss = (s: StorySide, o: ServeOutcome): CellSpec => ({ value: serve[s][o].points, misses: serve[s][o].misses })
  const attackedServe = (s: StorySide) => group(s, ['return_attack_winner', 'return_attack_missed', 'return_attack_rally_on'])

  const summaryRows: CompareRowModel[] = [
    row({ key: 'serve-worked', label: 'Serve worked', polarity: 'higher', side: (s) => ({ value: group(s, SERVE_WORKED).points }), evidenceTitle: (n) => `${n} · serve worked` }, names),
    row({ key: 'serve-punished', label: 'Serve punished', polarity: 'lower', side: (s) => ({ value: group(s, SERVE_PUNISHED).points }), evidenceTitle: (n) => `${n} · serve punished` }, names),
    row({ key: 'serve-neutral', label: 'Neutral', polarity: 'neutral', side: (s) => ({ value: group(s, SERVE_NEUTRAL).points }), evidenceTitle: (n) => `${n} · neutral serves` }, names),
    row({ key: 'faults', label: 'Faults', polarity: 'lower', side: (s) => lineMiss(s, 'fault'), evidenceTitle: (n) => `${n} · service faults` }, names),
    row(
      {
        key: 'serve-attacked',
        label: 'Opponent attacked the serve',
        polarity: 'lower',
        side: (s) => {
          const a = attackedServe(s)
          const missed = serve[s].return_attack_missed.points.rallyIds
          return { value: a.points, won: shareOf(missed, a.points.count, a.points.rallyIds), wonLabel: 'they missed' }
        },
        evidenceTitle: (n) => `${n} · serve attacked`,
      },
      names
    ),
    row({ key: 'server-attacked-first', label: 'Server attacked first', polarity: 'higher', side: (s) => lineWon(s, 'server_attacked_first'), evidenceTitle: (n) => `${n} · attacked first on serve` }, names),
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
      : 'The headline on each player’s serve: is it working, and where does it leak points?'

  const totals = (outcomes: ServeOutcome[]) =>
    `${names.heroName} ${pct(group('hero', outcomes).points.share)} · ${names.villainName} ${pct(group('villain', outcomes).points.share)} of serve points.`

  return [
    { id: 'B0', title: 'Serve summary', story: summaryStory, rows: summaryRows },
    {
      id: 'B1',
      title: 'Serve worked',
      story: `Won the point, forced a bad return, or set up the server's attack. ${totals(SERVE_WORKED)}`,
      rows: [
        ...(hasAny(serve, ['ace']) ? [row({ key: 'ace', label: 'Unreturned serve', polarity: 'higher', side: (s) => line(s, 'ace'), evidenceTitle: (n) => `${n} · unreturned serves` }, names)] : []),
        row({ key: 'passive-return-missed', label: 'Opponent missed a passive return', polarity: 'higher', side: (s) => lineMiss(s, 'passive_return_missed'), evidenceTitle: (n) => `${n} · passive return missed` }, names),
        row({ key: 'return-attack-missed', label: 'Opponent attacked the serve and missed', polarity: 'higher', side: (s) => lineMiss(s, 'return_attack_missed'), evidenceTitle: (n) => `${n} · return attack missed` }, names),
        row({ key: 'b1-server-attacked-first', label: 'Server attacked first', polarity: 'higher', side: (s) => lineWon(s, 'server_attacked_first'), evidenceTitle: (n) => `${n} · attacked first on serve` }, names),
      ],
    },
    {
      id: 'B2',
      title: 'Serve punished',
      story: `Gave the point away, or the serve was attacked. ${totals(SERVE_PUNISHED)}`,
      rows: [
        row({ key: 'fault', label: 'Faulted', polarity: 'lower', side: (s) => lineMiss(s, 'fault'), evidenceTitle: (n) => `${n} · service faults` }, names),
        row({ key: 'return-attack-winner', label: 'Serve attacked for a winner', polarity: 'lower', side: (s) => line(s, 'return_attack_winner'), evidenceTitle: (n) => `${n} · return winners against` }, names),
        row({ key: 'return-attack-rally-on', label: 'Serve attacked, rally went on', polarity: 'lower', side: (s) => lineWon(s, 'return_attack_rally_on'), evidenceTitle: (n) => `${n} · serve attacked, rally on` }, names),
      ],
    },
    {
      id: 'B3',
      title: 'Neutral',
      story: `The serve neither won nor lost the advantage. ${totals(SERVE_NEUTRAL)}`,
      rows: [
        row({ key: 'receiver-attacked-later', label: 'Opponent attacked later', polarity: 'neutral', side: (s) => lineWon(s, 'receiver_attacked_later'), evidenceTitle: (n) => `${n} · opponent attacked later` }, names),
        row({ key: 'serve-no-attack', label: 'No attack', polarity: 'neutral', side: (s) => lineWon(s, 'no_attack'), evidenceTitle: (n) => `${n} · no attack on serve` }, names),
        ...(hasAny(serve, ['lucky']) ? [row({ key: 'serve-lucky', label: 'Lucky net or edge', polarity: 'neutral', side: (s) => line(s, 'lucky'), evidenceTitle: (n) => `${n} · lucky on serve/return` }, names)] : []),
      ],
    },
  ]
}

// ---------------------------------------------------------------------------
// Section C — Receive
// ---------------------------------------------------------------------------

const ATTACKED: ServeOutcome[] = ['return_attack_winner', 'return_attack_missed', 'return_attack_rally_on']
const PASSIVE: ServeOutcome[] = ['ace', 'passive_return_missed', 'server_attacked_first', 'receiver_attacked_later', 'no_attack']
const NOT_DECIDED: ServeOutcome[] = ['fault', 'lucky']

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
      (m, o) => ({ net: m.net + recv[s][o].misses.net, long: m.long + recv[s][o].misses.long, wide: m.wide + recv[s][o].misses.wide }),
      { net: 0, long: 0, wide: 0 }
    )
  const within = (s: StorySide, outcomes: ServeOutcome[], whole: string[], withWon = false, withMiss = false): CellSpec => ({
    value: of(ids(s, outcomes), whole),
    ...(withWon ? { won: of(wonIds(s, outcomes), ids(s, outcomes)) } : {}),
    ...(withMiss ? { misses: misses(s, outcomes) } : {}),
  })

  const notDecidedCell = (s: StorySide): MetricCellModel => {
    const n = ids(s, NOT_DECIDED)
    return story.receivePoints[s].length === 0
      ? { text: NO_VALUE, tone: 'none', evidence: null }
      : { text: String(n.length), tone: 'none', evidence: n.length > 0 ? { title: `${s === 'hero' ? names.heroName : names.villainName} · not decided by the return`, rallyIds: n } : null }
  }

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

  return [
    {
      id: 'C1',
      title: 'Receive summary',
      story: summaryStory,
      rows: [
        row({ key: 'recv-attacked', label: 'Attacked the return', polarity: 'neutral', side: (s) => within(s, ATTACKED, decided(s), true), evidenceTitle: (n) => `${n} · attacked the return` }, names),
        row({ key: 'recv-passive', label: 'Passive return', polarity: 'neutral', side: (s) => within(s, PASSIVE, decided(s), true), evidenceTitle: (n) => `${n} · passive return` }, names),
        row({ key: 'recv-missed-attacking', label: 'Missed when attacking', polarity: 'lower', side: (s) => ({ value: of(ids(s, ['return_attack_missed']), attacked(s)) }), evidenceTitle: (n) => `${n} · return attack missed` }, names),
        row({ key: 'recv-missed-passive', label: 'Missed when passive', polarity: 'lower', side: (s) => ({ value: of(ids(s, ['ace', 'passive_return_missed']), passive(s)) }), evidenceTitle: (n) => `${n} · passive return missed` }, names),
        row({ key: 'recv-server-attacked', label: 'Server attacked after a passive return', polarity: 'lower', side: (s) => ({ value: of(ids(s, ['server_attacked_first']), passive(s)) }), evidenceTitle: (n) => `${n} · server attacked next` }, names),
        { key: 'recv-not-decided', label: 'Not decided by the return', hero: notDecidedCell('hero'), villain: notDecidedCell('villain') },
      ],
    },
    {
      id: 'C2',
      title: 'When the return is an attack',
      story: 'Is attacking the return paying off, or missing too much? Share of attacked returns.',
      rows: [
        row({ key: 'c2-winner', label: 'Winner', polarity: 'higher', side: (s) => within(s, ['return_attack_winner'], attacked(s)), evidenceTitle: (n) => `${n} · return winners` }, names),
        row({ key: 'c2-missed', label: 'Missed', polarity: 'lower', side: (s) => within(s, ['return_attack_missed'], attacked(s), false, true), evidenceTitle: (n) => `${n} · return attack missed` }, names),
        row({ key: 'c2-rally-on', label: 'Rally went on', polarity: 'neutral', side: (s) => within(s, ['return_attack_rally_on'], attacked(s), true), evidenceTitle: (n) => `${n} · attacked return, rally on` }, names),
      ],
      emptyMessage: 'No attacked returns marked yet',
    },
    {
      id: 'C3',
      title: 'When the return is passive',
      story: 'Does a passive return keep the point safe, or hand the server the attack? Share of passive returns.',
      rows: [
        row({ key: 'c3-missed', label: 'Missed', polarity: 'lower', side: (s) => within(s, ['ace', 'passive_return_missed'], passive(s), false, true), evidenceTitle: (n) => `${n} · passive return missed` }, names),
        row({ key: 'c3-server-attacked', label: 'Server attacked next', polarity: 'lower', side: (s) => within(s, ['server_attacked_first'], passive(s), true), evidenceTitle: (n) => `${n} · server attacked next` }, names),
        row({ key: 'c3-attacked-later', label: 'Receiver attacked later', polarity: 'higher', side: (s) => within(s, ['receiver_attacked_later'], passive(s), true), evidenceTitle: (n) => `${n} · attacked later on receive` }, names),
        row({ key: 'c3-no-attack', label: 'No attack', polarity: 'neutral', side: (s) => within(s, ['no_attack'], passive(s), true), evidenceTitle: (n) => `${n} · no attack on receive` }, names),
      ],
    },
  ]
}

export function buildServeReceiveSections(story: ServeReceiveResult, names: Names): CompareSectionModel[] {
  if (!story.hasPointData) return []
  return [
    {
      id: 'B',
      title: 'Your serve',
      question: 'Is your serve effective? Does it win points, force mistakes and set up your attack, or get punished?',
      cards: buildServeCards(story, names),
    },
    {
      id: 'C',
      title: 'Your receive',
      question: 'How do you choose to receive — attack or passive — and how well does each work?',
      cards: buildReceiveCards(story, names),
    },
  ]
}
