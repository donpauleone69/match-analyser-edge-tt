/**
 * Serve + receive story (Match Review — Sections B and C)
 *
 * Built only from Pass 1 fields: rallies.server_id, winner_id, point_ending,
 * first_attack_index and the contact taps (shots.shot_index / player_id).
 *
 * Every serve point gets exactly one outcome. Section B groups outcomes by
 * the server, Section C by the receiver — so B1+B2+B3 = 100% of a player's
 * serve points, and C splits the same points from the other side of the table.
 *
 * - Only is_scoring rallies with at least one tapped contact count.
 * - Shot 1 is the serve, shot 2 the return.
 * - The attacker is whoever hit the FOS shot (stored player_id, else parity).
 */

import type { DBRally, DBShot, PointEnding } from '@/data'
import { isErrorEnding } from '@/rules/derive/rally/derivePointEndClass'
import { shareOf, type CountShare, type SidePair, type StorySide } from './calculateMatchStory'

export type ServeOutcome =
  // Serve worked (B1)
  | 'ace'
  | 'passive_return_missed'
  | 'return_attack_missed'
  | 'server_attacked_first'
  // Serve punished (B2)
  | 'fault'
  | 'return_attack_winner'
  | 'return_attack_rally_on'
  // Neutral (B3)
  | 'receiver_attacked_later'
  | 'no_attack'
  | 'lucky'

export const SERVE_WORKED: ServeOutcome[] = ['ace', 'passive_return_missed', 'return_attack_missed', 'server_attacked_first']
export const SERVE_PUNISHED: ServeOutcome[] = ['fault', 'return_attack_winner', 'return_attack_rally_on']
export const SERVE_NEUTRAL: ServeOutcome[] = ['receiver_attacked_later', 'no_attack', 'lucky']

export type MissKind = 'net' | 'long' | 'wide'

export interface ServeReceiveInput {
  rallies: DBRally[]
  shots: DBShot[]
  heroId: string
}

export interface OutcomeLine {
  /** Share of the side's serve points (B) or receive points (C) */
  points: CountShare
  /** Of those, points the side won */
  won: CountShare
  /** Net / long / wide split, for outcomes that end in a miss */
  misses: Record<MissKind, number>
}

export interface ServeReceiveResult {
  hasPointData: boolean
  /** Per server: one line per outcome; denominator = that side's serve points */
  serve: SidePair<Record<ServeOutcome, OutcomeLine>>
  /** Per receiver: same outcomes; denominator = that side's receive points; won = receiver won */
  receive: SidePair<Record<ServeOutcome, OutcomeLine>>
  servePoints: SidePair<string[]>
  receivePoints: SidePair<string[]>
}

const OUTCOMES: ServeOutcome[] = [...SERVE_WORKED, ...SERVE_PUNISHED, ...SERVE_NEUTRAL]

function sideOf(playerId: string | null, heroId: string): StorySide {
  return playerId === heroId ? 'hero' : 'villain'
}

function otherSide(side: StorySide): StorySide {
  return side === 'hero' ? 'villain' : 'hero'
}

function missKind(ending: PointEnding | null): MissKind | null {
  if (ending === 'error_net') return 'net'
  if (ending === 'error_long') return 'long'
  if (ending === 'error_wide') return 'wide'
  return null
}

/**
 * Classify one serve point.
 * @param endIndex last tapped contact (1 = serve only)
 * @param fos first attack index (null = no attack)
 * @param attackerIsServer who hit the FOS shot
 */
export function deriveServeOutcome(
  endIndex: number,
  fos: number | null,
  ending: PointEnding | null,
  attackerIsServer: boolean
): ServeOutcome {
  const missed = ending !== null && isErrorEnding(ending)
  if (endIndex <= 1) {
    if (missed) return 'fault'
    return ending === 'lucky' ? 'lucky' : 'ace'
  }
  if (endIndex === 2 && ending === 'lucky') return 'lucky'
  if (fos === 2) {
    if (endIndex === 2) return missed ? 'return_attack_missed' : 'return_attack_winner'
    return 'return_attack_rally_on'
  }
  if (endIndex === 2 && missed) return 'passive_return_missed'
  if (fos !== null && fos >= 3) return attackerIsServer ? 'server_attacked_first' : 'receiver_attacked_later'
  return 'no_attack'
}

export function calculateServeReceiveStory(input: ServeReceiveInput): ServeReceiveResult {
  const { rallies, shots, heroId } = input

  const shotsByRally = new Map<string, Map<number, DBShot>>()
  for (const shot of shots) {
    let byIndex = shotsByRally.get(shot.rally_id)
    if (!byIndex) {
      byIndex = new Map()
      shotsByRally.set(shot.rally_id, byIndex)
    }
    byIndex.set(shot.shot_index, shot)
  }

  const emptyBuckets = () =>
    Object.fromEntries(OUTCOMES.map((o) => [o, { ids: [] as string[], won: [] as string[], misses: { net: 0, long: 0, wide: 0 } }])) as Record<
      ServeOutcome,
      { ids: string[]; won: string[]; misses: Record<MissKind, number> }
    >
  const byServer: SidePair<ReturnType<typeof emptyBuckets>> = { hero: emptyBuckets(), villain: emptyBuckets() }
  const byReceiver: SidePair<ReturnType<typeof emptyBuckets>> = { hero: emptyBuckets(), villain: emptyBuckets() }
  const servePoints: SidePair<string[]> = { hero: [], villain: [] }
  const receivePoints: SidePair<string[]> = { hero: [], villain: [] }

  for (const rally of rallies) {
    if (!rally.is_scoring) continue
    const byIndex = shotsByRally.get(rally.id)
    if (!byIndex || byIndex.size === 0) continue

    const server = sideOf(rally.server_id, heroId)
    const receiver = otherSide(server)
    const winner = sideOf(rally.winner_id, heroId)
    const endIndex = Math.max(...byIndex.keys())
    const fos =
      typeof rally.first_attack_index === 'number' && rally.first_attack_index >= 2 ? rally.first_attack_index : null
    const fosShot = fos !== null ? byIndex.get(fos) : undefined
    const attacker: StorySide =
      fos === null ? server : fosShot ? sideOf(fosShot.player_id, heroId) : fos % 2 === 1 ? server : receiver
    const outcome = deriveServeOutcome(endIndex, fos, rally.point_ending, attacker === server)
    const kind = missKind(rally.point_ending)

    servePoints[server].push(rally.id)
    receivePoints[receiver].push(rally.id)
    const s = byServer[server][outcome]
    const r = byReceiver[receiver][outcome]
    s.ids.push(rally.id)
    r.ids.push(rally.id)
    if (winner === server) s.won.push(rally.id)
    if (winner === receiver) r.won.push(rally.id)
    if (kind) {
      s.misses[kind]++
      r.misses[kind]++
    }
  }

  const lines = (buckets: ReturnType<typeof emptyBuckets>, total: string[]) =>
    Object.fromEntries(
      OUTCOMES.map((o) => {
        const b = buckets[o]
        return [o, { points: shareOf(b.ids, total.length, total), won: shareOf(b.won, b.ids.length, b.ids), misses: b.misses }]
      })
    ) as Record<ServeOutcome, OutcomeLine>

  return {
    hasPointData: servePoints.hero.length + servePoints.villain.length > 0,
    serve: { hero: lines(byServer.hero, servePoints.hero), villain: lines(byServer.villain, servePoints.villain) },
    receive: {
      hero: lines(byReceiver.hero, receivePoints.hero),
      villain: lines(byReceiver.villain, receivePoints.villain),
    },
    servePoints,
    receivePoints,
  }
}

/** Merge outcome lines (e.g. B1 total) into one count/share over the same denominator. */
export function sumOutcomes(
  lines: Record<ServeOutcome, OutcomeLine>,
  outcomes: ServeOutcome[],
  total: string[]
): { points: CountShare; won: CountShare } {
  const ids = outcomes.flatMap((o) => lines[o].points.rallyIds)
  const won = outcomes.flatMap((o) => lines[o].won.rallyIds)
  return { points: shareOf(ids, total.length, total), won: shareOf(won, ids.length, ids) }
}
