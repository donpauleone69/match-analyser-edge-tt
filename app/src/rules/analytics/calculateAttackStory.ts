/**
 * Attack + finish story (Match Review — cards A3, A4, D1, D2, F4)
 *
 * Built only from Pass 1 fields:
 * - rallies.first_attack_index (FOS), server_id, winner_id, point_ending, point_miss_reason
 * - shots.shot_index, player_id, shot_wing, shot_stroke (first attack)
 *
 * - Only is_scoring rallies count.
 * - Anyone who is not the hero is on the Villain side (null id = unnamed Villain).
 * - The attacker is whoever hit the FOS shot (stored player_id, else server parity).
 * - The rally end is the last saved shot index.
 * - Errors are attributed to the last hitter (same as calculateMatchStory).
 */

import type { DBRally, DBShot, PointMissReason } from '@/data'
import { isErrorEnding } from '@/rules/derive/rally/derivePointEndClass'
import { shareOf, type CountShare, type SidePair, type StorySide } from './calculateMatchStory'

export interface AttackStoryInput {
  rallies: DBRally[]
  shots: DBShot[]
  heroId: string
}

export type AttackTiming = 'return' | 'third_ball' | 'later'

export type WinPhase = 'no_attack' | 'on_attack' | 'within_3' | 'continuation'

export interface AttackWeaponLine {
  /** e.g. "FH|loop"; "?|?" when wing/stroke were not tagged */
  key: string
  wing: DBShot['shot_wing']
  stroke: DBShot['shot_stroke']
  /** First attacks with this wing + stroke */
  used: CountShare
  /** Of those, points won */
  won: CountShare
}

export type MissReasonKey = PointMissReason | 'untagged'

export interface AttackStoryResult {
  hasPointData: boolean
  totalPoints: number

  // A3 — Who attacks
  /** Rallies where this side made the first attack (share of all points) */
  attackedFirst: SidePair<CountShare>
  /** Of those, points won (share of attackedFirst) */
  wonWhenAttackedFirst: SidePair<CountShare>
  /** Rallies where nobody attacked (share of all points) — not per side */
  noAttack: CountShare

  // A4 — When points are won (share of own points won; four rows add to 100%)
  winPhase: Record<WinPhase, SidePair<CountShare>>

  // D1 — When I attack (share of own first attacks); won = share of that timing
  attackTiming: Record<AttackTiming, SidePair<{ used: CountShare; won: CountShare }>>

  // D2 — What I attack with
  weapons: SidePair<AttackWeaponLine[]>

  // F4 — Why I missed (share of own errors)
  missReasons: SidePair<Record<MissReasonKey, CountShare>>
}

const MISS_REASON_KEYS: MissReasonKey[] = [
  'technical',
  'timing',
  'footwork',
  'positioning',
  'misread',
  'forced',
  'untagged',
]

function sideOf(playerId: string | null, heroId: string): StorySide {
  return playerId === heroId ? 'hero' : 'villain'
}

function otherSide(side: StorySide): StorySide {
  return side === 'hero' ? 'villain' : 'hero'
}

function emptyIds(): SidePair<string[]> {
  return { hero: [], villain: [] }
}

/** Side that hit shot n: stored player_id when present, else server parity (odd = server). */
function sideForShot(
  n: number,
  rally: DBRally,
  shotsByIndex: Map<number, DBShot>,
  heroId: string
): StorySide {
  const shot = shotsByIndex.get(n)
  if (shot) return sideOf(shot.player_id, heroId)
  const serverSide = sideOf(rally.server_id, heroId)
  return n % 2 === 1 ? serverSide : otherSide(serverSide)
}

/** Attack timing from the attacker's point of view. */
export function deriveAttackTiming(fos: number, attackerIsServer: boolean): AttackTiming {
  if (!attackerIsServer && fos === 2) return 'return'
  if (attackerIsServer && fos === 3) return 'third_ball'
  return 'later'
}

/** Where in the rally the point ended relative to the first attack. */
export function deriveWinPhase(fos: number | null, endIndex: number): WinPhase {
  if (fos === null) return 'no_attack'
  const gap = endIndex - fos
  if (gap <= 0) return 'on_attack'
  if (gap <= 3) return 'within_3'
  return 'continuation'
}

export function calculateAttackStory(input: AttackStoryInput): AttackStoryResult {
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

  const scoring = rallies.filter((r) => r.is_scoring)
  const totalPoints = scoring.length

  const pointsWon = emptyIds()
  const attackedFirst = emptyIds()
  const wonWhenAttackedFirst = emptyIds()
  const noAttack: string[] = []
  const winPhaseIds: Record<WinPhase, SidePair<string[]>> = {
    no_attack: emptyIds(),
    on_attack: emptyIds(),
    within_3: emptyIds(),
    continuation: emptyIds(),
  }
  const timingUsed: Record<AttackTiming, SidePair<string[]>> = {
    return: emptyIds(),
    third_ball: emptyIds(),
    later: emptyIds(),
  }
  const timingWon: Record<AttackTiming, SidePair<string[]>> = {
    return: emptyIds(),
    third_ball: emptyIds(),
    later: emptyIds(),
  }
  const weaponUsed: SidePair<Map<string, string[]>> = { hero: new Map(), villain: new Map() }
  const weaponWon: SidePair<Map<string, string[]>> = { hero: new Map(), villain: new Map() }
  const weaponMeta = new Map<string, { wing: DBShot['shot_wing']; stroke: DBShot['shot_stroke'] }>()
  const errors = emptyIds()
  const missIds: SidePair<Record<MissReasonKey, string[]>> = {
    hero: Object.fromEntries(MISS_REASON_KEYS.map((k) => [k, []])) as unknown as Record<
      MissReasonKey,
      string[]
    >,
    villain: Object.fromEntries(MISS_REASON_KEYS.map((k) => [k, []])) as unknown as Record<
      MissReasonKey,
      string[]
    >,
  }

  for (const rally of scoring) {
    const byIndex = shotsByRally.get(rally.id) ?? new Map<number, DBShot>()
    const winnerSide = sideOf(rally.winner_id, heroId)
    const serverSide = sideOf(rally.server_id, heroId)
    pointsWon[winnerSide].push(rally.id)

    const endIndex = byIndex.size > 0 ? Math.max(...byIndex.keys()) : null
    const fos =
      typeof rally.first_attack_index === 'number' && rally.first_attack_index >= 2
        ? rally.first_attack_index
        : null

    if (fos === null) {
      noAttack.push(rally.id)
    } else {
      const attacker = sideForShot(fos, rally, byIndex, heroId)
      attackedFirst[attacker].push(rally.id)
      const attackerWon = winnerSide === attacker
      if (attackerWon) wonWhenAttackedFirst[attacker].push(rally.id)

      const timing = deriveAttackTiming(fos, attacker === serverSide)
      timingUsed[timing][attacker].push(rally.id)
      if (attackerWon) timingWon[timing][attacker].push(rally.id)

      const fosShot = byIndex.get(fos)
      const wing = fosShot?.shot_wing ?? null
      const stroke = fosShot?.shot_stroke ?? null
      const key = `${wing ?? '?'}|${stroke ?? '?'}`
      weaponMeta.set(key, { wing, stroke })
      const used = weaponUsed[attacker].get(key) ?? []
      used.push(rally.id)
      weaponUsed[attacker].set(key, used)
      if (attackerWon) {
        const won = weaponWon[attacker].get(key) ?? []
        won.push(rally.id)
        weaponWon[attacker].set(key, won)
      }
    }

    if (endIndex !== null) {
      winPhaseIds[deriveWinPhase(fos, endIndex)][winnerSide].push(rally.id)
    }

    if (isErrorEnding(rally.point_ending)) {
      const misser =
        endIndex !== null ? sideForShot(endIndex, rally, byIndex, heroId) : otherSide(winnerSide)
      errors[misser].push(rally.id)
      const reason: MissReasonKey = rally.point_miss_reason ?? 'untagged'
      const bucket = missIds[misser][reason] ?? missIds[misser].untagged
      bucket.push(rally.id)
    }
  }

  const side = <T>(fn: (s: StorySide) => T): SidePair<T> => ({
    hero: fn('hero'),
    villain: fn('villain'),
  })

  const winPhase = Object.fromEntries(
    (Object.keys(winPhaseIds) as WinPhase[]).map((phase) => [
      phase,
      side((s) => shareOf(winPhaseIds[phase][s], pointsWon[s].length, pointsWon[s])),
    ])
  ) as Record<WinPhase, SidePair<CountShare>>

  const attackTiming = Object.fromEntries(
    (Object.keys(timingUsed) as AttackTiming[]).map((timing) => [
      timing,
      side((s) => ({
        used: shareOf(timingUsed[timing][s], attackedFirst[s].length, attackedFirst[s]),
        won: shareOf(
          timingWon[timing][s],
          timingUsed[timing][s].length,
          timingUsed[timing][s]
        ),
      })),
    ])
  ) as Record<AttackTiming, SidePair<{ used: CountShare; won: CountShare }>>

  const weapons = side((s) =>
    [...weaponUsed[s].entries()]
      .map(([key, ids]): AttackWeaponLine => {
        const meta = weaponMeta.get(key) ?? { wing: null, stroke: null }
        return {
          key,
          wing: meta.wing,
          stroke: meta.stroke,
          used: shareOf(ids, attackedFirst[s].length, attackedFirst[s]),
          won: shareOf(weaponWon[s].get(key) ?? [], ids.length, ids),
        }
      })
      .sort((a, b) => b.used.count - a.used.count || a.key.localeCompare(b.key))
  )

  const missReasons = side(
    (s) =>
      Object.fromEntries(
        MISS_REASON_KEYS.map((k) => [k, shareOf(missIds[s][k], errors[s].length, errors[s])])
      ) as Record<MissReasonKey, CountShare>
  )

  return {
    hasPointData: totalPoints > 0,
    totalPoints,
    attackedFirst: side((s) => shareOf(attackedFirst[s], totalPoints)),
    wonWhenAttackedFirst: side((s) =>
      shareOf(wonWhenAttackedFirst[s], attackedFirst[s].length, attackedFirst[s])
    ),
    noAttack: shareOf(noAttack, totalPoints),
    winPhase,
    attackTiming,
    weapons,
    missReasons,
  }
}
