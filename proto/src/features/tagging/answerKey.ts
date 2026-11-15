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

/** A tap this close to the real contact, on average, counts as right. */
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
}

export type KeyTiming = {
  /** Mean distance from the real contacts, in seconds. */
  off: number
  /** Mean signed error: above zero is late, below is early. */
  late: number
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

/** Tap errors against the real contacts: by position when the count is right, else to the nearest. */
function timingOf(tagged: number[], real: number[]): KeyTiming {
  const errors = tagged.map((t, i) => {
    if (tagged.length === real.length) return t - real[i]
    const nearest = real.reduce((best, c) => (Math.abs(c - t) < Math.abs(best - t) ? c : best), real[0])
    return t - nearest
  })
  const n = Math.max(1, errors.length)
  return {
    off: errors.reduce((sum, e) => sum + Math.abs(e), 0) / n,
    late: errors.reduce((sum, e) => sum + e, 0) / n,
    taps: errors.length,
  }
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
  const checks: KeyCheck[] = [
    { field: 'taps', ok: m === n, want: String(n), got: String(m) },
    {
      field: 'server',
      ok: tagged.server === real.server,
      want: names[real.server],
      got: names[tagged.server],
    },
    { field: 'result', ok: tagged.ending === real.ending, want: real.ending, got: tagged.ending ?? 'None' },
  ]

  // Wing and stroke are asked for on the end shot and on the first attack.
  const pairs: { real: number; tagged: number }[] = []
  if (n > 1 && m > 1) pairs.push({ real: n, tagged: m })
  const sameFa = real.fa !== null && tagged.fa === real.fa && real.fa <= m
  if (sameFa && real.fa !== n && real.fa !== null) pairs.push({ real: real.fa, tagged: real.fa })
  if (pairs.length > 0) {
    for (const field of ['wing', 'stroke'] as const) {
      const want = pairs.map((p) => `shot ${p.real} ${real.play[p.real - 1][field]}`)
      const got = pairs.map((p) => `shot ${p.tagged} ${tagged.shots[p.tagged - 1]?.[field] ?? 'none'}`)
      const ok = pairs.every((p) => tagged.shots[p.tagged - 1]?.[field] === real.play[p.real - 1][field])
      checks.push({ field, ok, want: want.join(', '), got: got.join(', ') })
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

  const timing = timingOf(tagged.contacts, real.contacts)
  checks.push({
    field: 'timing',
    ok: timing.off <= TIMING_OK_S,
    want: `within ${seconds(TIMING_OK_S)}`,
    got: `${seconds(timing.off)} off`,
  })
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
  const allTaps: KeyTiming = { off: 0, late: 0, taps: 0 }
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
    const timing = timingOf(r.contacts, s.rally.contacts)
    allTaps.off += timing.off * timing.taps
    allTaps.late += timing.late * timing.taps
    allTaps.taps += timing.taps
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
    timing:
      allTaps.taps > 0
        ? { off: allTaps.off / allTaps.taps, late: allTaps.late / allTaps.taps, taps: allTaps.taps }
        : null,
  }
}
