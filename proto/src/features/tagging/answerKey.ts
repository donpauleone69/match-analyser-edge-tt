/**
 * Answer key for the demo video (pure, no React). The demo video is drawn
 * from a script, so what was really played is known. This matches tagged
 * rallies to scripted ones by time and says, field by field, what is right.
 */

import { hitterOf, isError, otherSide, type Ending, type ShotTags, type Side } from './rally'
import type { ScriptRally, VideoScript } from './script'

/** As much of a video as the key needs. A video with no script has no key. */
export type KeyVideo = { id: string; script?: VideoScript }

/** As much of a tagged rally as the key reads. Times are seconds in `videoId`. */
export type KeyRally = {
  id: string
  videoId: string
  server: Side
  contacts: number[]
  ending: Ending | null
  fa: number | null
  shots: ShotTags[]
  /** A point added with no video. The key does not mark these. */
  point?: true
}

export const KEY_FIELDS = ['taps', 'server', 'result', 'wing', 'stroke', 'firstAttack', 'timing'] as const
export type KeyField = (typeof KEY_FIELDS)[number]

export const KEY_FIELD_LABEL: Record<KeyField, string> = {
  taps: 'Taps',
  server: 'Server',
  result: 'Result',
  wing: 'Wing',
  stroke: 'Stroke',
  firstAttack: 'First attack',
  timing: 'Timing',
}

/** A tap this close to the real contact counts as right. The report names the worst one. */
export const TIMING_OK_S = 0.2
/** How far either side of its contacts a rally still counts as that rally. */
const MATCH_PAD_S = 0.5

export type KeyCheck = {
  field: KeyField
  ok: boolean
  /** What the video played, in words for the panel. */
  want: string
  /** What was tagged. */
  got: string
  /** Lines to show when this is wrong. Each line is the whole sentence. */
  notes?: string[]
}

export type KeyTiming = {
  /** Distance of the worst tap from its contact, in seconds. */
  off: number
  /** Signed error of that tap: above zero is late, below is early. */
  late: number
  /** 1-based shot of the worst tap. */
  shot: number
  taps: number
}

export type RallyKey = {
  id: string
  /** Position in the list of rallies given. */
  index: number
  /** Seconds into its video where the real rally starts. */
  at: number
  checks: KeyCheck[]
  right: number
  of: number
  timing: KeyTiming
  /** Who really won the point, and who the tags give it to. */
  winner: Side
  taggedWinner: Side | null
}

export type KeyTotal = { right: number; of: number }

export type KeyReport = {
  /** Tagged rallies that match a rally in the video, in the order given. */
  rallies: RallyKey[]
  /** Rallies in the video, up to the last one tagged, with nothing tagged on them. */
  missed: { videoId: string; at: number; setNo: number }[]
  /** Tagged rallies where the video has no rally. */
  extra: { id: string; index: number; at: number }[]
  total: KeyTotal
  byField: Record<KeyField, KeyTotal>
  /** Over every matched tap. Null with nothing matched. */
  timing: KeyTiming | null
}

type Scripted = { videoId: string; order: number; rally: ScriptRally }

const span = (contacts: number[]) => ({
  a: contacts[0] - MATCH_PAD_S,
  b: contacts[contacts.length - 1] + MATCH_PAD_S,
})

function overlap(a: number[], b: number[]): number {
  const x = span(a)
  const y = span(b)
  return Math.min(x.b, y.b) - Math.max(x.a, y.a)
}

function winnerOfTags(r: Pick<KeyRally, 'server' | 'contacts' | 'ending'>): Side | null {
  if (!r.ending || r.contacts.length === 0) return null
  const hitter = hitterOf(r.server, r.contacts.length)
  return isError(r.ending) ? otherSide(hitter) : hitter
}

/** How far apart two taps can be and still count as the same lateness. */
const SAME_LATE_S = 0.15

const spoken = (seconds: number) => {
  const hundredths = Math.round(Math.abs(seconds) * 100)
  const text = hundredths % 10 === 0 ? (hundredths / 100).toFixed(1) : (hundredths / 100).toFixed(2)
  return `${text}s`
}
const lateness = (late: number) => `${spoken(late)} ${late > 0 ? 'late' : 'early'}`

/** One error per shot, only when the tap count matches. Shot numbers are 1-based. */
function tapErrors(tagged: number[], real: number[]): { shot: number; late: number }[] {
  if (tagged.length !== real.length || real.length === 0) return []
  return tagged.map((t, i) => ({ shot: i + 1, late: t - real[i] }))
}

/**
 * The worst tap decides. One tap over the bar is its own line. When every tap
 * is off by about the same amount, the rally gets one line.
 */
function timingNotes(errors: { shot: number; late: number }[]): { ok: boolean; notes: string[] } {
  if (errors.length === 0) return { ok: true, notes: [] }
  const worst = errors.reduce((a, b) => (Math.abs(b.late) > Math.abs(a.late) ? b : a))
  if (Math.abs(worst.late) <= TIMING_OK_S) return { ok: true, notes: [] }
  const lates = errors.map((e) => e.late)
  const spread = Math.max(...lates) - Math.min(...lates)
  if (spread <= SAME_LATE_S) return { ok: false, notes: [lateness(worst.late)] }
  return {
    ok: false,
    notes: errors
      .filter((e) => Math.abs(e.late) > TIMING_OK_S)
      .map((e) => `Shot ${e.shot} tapped ${lateness(e.late)}`),
  }
}

function timingOf(errors: { shot: number; late: number }[]): KeyTiming {
  const worst = errors.reduce((a, b) => (Math.abs(b.late) > Math.abs(a.late) ? b : a), errors[0])
  return { off: Math.abs(worst?.late ?? 0), late: worst?.late ?? 0, shot: worst?.shot ?? 0, taps: errors.length }
}

const DEFAULT_NAMES: Record<Side, string> = { me: 'You', them: 'Opponent' }
const faWord = (fa: number | null) => (fa === null ? 'No attack' : `Shot ${fa}`)
const seconds = (v: number) => `${v.toFixed(2)}s`

/** Field by field, one tagged rally against the rally the video played. */
export function compareRally(
  tagged: KeyRally,
  real: ScriptRally,
  names: Record<Side, string> = DEFAULT_NAMES
): KeyCheck[] {
  const n = real.contacts.length
  const m = tagged.contacts.length
  const countOk = m === n
  const checks: KeyCheck[] = [
    {
      field: 'taps',
      ok: countOk,
      want: String(n),
      got: String(m),
      notes: countOk ? undefined : [`${m} taps, video has ${n}`],
    },
    {
      field: 'server',
      ok: tagged.server === real.server,
      want: names[real.server],
      got: names[tagged.server],
    },
  ]

  // An odd count shifts the last shot, so the result, wing, stroke and first
  // attack are not compared: the count line is the mistake. They are asked
  // again once the count matches.
  if (countOk) {
    checks.push({
      field: 'result',
      ok: tagged.ending === real.ending,
      want: real.ending,
      got: tagged.ending ?? 'None',
    })
    const pairs: { real: number; tagged: number }[] = []
    if (n > 1) pairs.push({ real: n, tagged: m })
    const sameFa = real.fa !== null && tagged.fa === real.fa && real.fa <= m
    if (sameFa && real.fa !== n && real.fa !== null) pairs.push({ real: real.fa, tagged: real.fa })
    if (pairs.length > 0) {
      for (const field of ['wing', 'stroke'] as const) {
        const bad = pairs.filter(
          (p) => tagged.shots[p.tagged - 1]?.[field] !== real.play[p.real - 1][field]
        )
        checks.push({
          field,
          ok: bad.length === 0,
          want: pairs.map((p) => real.play[p.real - 1][field]).join(', '),
          got: pairs.map((p) => tagged.shots[p.tagged - 1]?.[field] ?? 'none').join(', '),
          notes: bad.map(
            (p) =>
              `Shot ${p.real} was ${real.play[p.real - 1][field]}, tagged ${tagged.shots[p.tagged - 1]?.[field] ?? 'none'}`
          ),
        })
      }
    }
    if (n > 1) {
      checks.push({
        field: 'firstAttack',
        ok: tagged.fa === real.fa,
        want: faWord(real.fa),
        got: faWord(tagged.fa),
      })
    }
    const errors = tapErrors(tagged.contacts, real.contacts)
    const timing = timingNotes(errors)
    checks.push({
      field: 'timing',
      ok: timing.ok,
      want: `within ${seconds(TIMING_OK_S)}`,
      got: timing.notes[0] ?? '',
      notes: timing.notes,
    })
  }
  return checks
}

/**
 * The whole comparison. `rallies` are the saved rallies to mark, in video
 * order. A point added with no video is skipped. Deleted rallies are not in
 * this list. `videos` are the match's videos in play order.
 */
export function answerKey(
  videos: KeyVideo[],
  rallies: KeyRally[],
  names: Record<Side, string> = DEFAULT_NAMES
): KeyReport {
  const scripted: Scripted[] = videos.flatMap((v, vi) =>
    (v.script?.rallies ?? []).map((rally, i) => ({ videoId: v.id, order: vi * 1e6 + i, rally }))
  )
  const tagged = rallies
    .map((r, index) => ({ r, index }))
    .filter(({ r }) => !r.point && r.contacts.length > 0)

  // Best overlap first, each side used once.
  const pairs = tagged
    .flatMap(({ r, index }) =>
      scripted
        .filter((s) => s.videoId === r.videoId)
        .map((s) => ({ index, s, over: overlap(r.contacts, s.rally.contacts) }))
        .filter((p) => p.over > 0)
    )
    .sort((a, b) => b.over - a.over)
  const matchOf = new Map<number, Scripted>()
  const used = new Set<Scripted>()
  for (const p of pairs) {
    if (matchOf.has(p.index) || used.has(p.s)) continue
    matchOf.set(p.index, p.s)
    used.add(p.s)
  }

  const byField = Object.fromEntries(KEY_FIELDS.map((f) => [f, { right: 0, of: 0 }])) as Record<
    KeyField,
    KeyTotal
  >
  const total: KeyTotal = { right: 0, of: 0 }
  let worst: KeyTiming | null = null
  const keyed: RallyKey[] = []
  const extra: KeyReport['extra'] = []

  for (const { r, index } of tagged) {
    const s = matchOf.get(index)
    if (!s) {
      extra.push({ id: r.id, index, at: r.contacts[0] })
      continue
    }
    const checks = compareRally(r, s.rally, names)
    for (const c of checks) {
      byField[c.field].of += 1
      total.of += 1
      if (c.ok) {
        byField[c.field].right += 1
        total.right += 1
      }
    }
    const errors = tapErrors(r.contacts, s.rally.contacts)
    const timing = timingOf(errors)
    if (errors.length > 0 && (!worst || timing.off > worst.off)) worst = timing
    keyed.push({
      id: r.id,
      index,
      at: s.rally.contacts[0],
      checks,
      right: checks.filter((c) => c.ok).length,
      of: checks.length,
      timing,
      winner: s.rally.winner,
      taggedWinner: winnerOfTags(r),
    })
  }

  // A rally counts as missed only inside the sets being tagged and before the last one tagged.
  const matched = [...used]
  const sets = new Set(matched.map((s) => `${s.videoId}:${s.rally.setNo}`))
  const lastOrder = Math.max(-1, ...matched.map((s) => s.order))
  const missed = scripted
    .filter((s) => !used.has(s) && s.order < lastOrder && sets.has(`${s.videoId}:${s.rally.setNo}`))
    .map((s) => ({ videoId: s.videoId, at: s.rally.contacts[0], setNo: s.rally.setNo }))

  return {
    rallies: keyed,
    missed,
    extra,
    total,
    byField,
    timing: worst,
  }
}
