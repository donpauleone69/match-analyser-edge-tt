/**
 * Clip playlists from tagged matches.
 * Pure — no React, no IO.
 *
 * A clip is a window of one set's source video around a rally or a shot.
 * Times are source-video seconds (the same clock rallies and shots are tagged in).
 *
 * - Rally clips: rally start − lead → rally end + tail.
 * - Shot clips: contact − shotLead → next contact (or rally end) + tail.
 * - Playlist order: matches as given, then set, rally, shot.
 */

import type { DBMatch, DBRally, DBSet, DBShot, ShotReviewKind, ShotStroke, ShotWing } from '@/data'
import { isErrorEnding } from '@/rules/derive/rally/derivePointEndClass'

export type ClipSide = 'hero' | 'villain'
export type ClipOutcome = 'won' | 'lost'

export type ClipFilter =
  | { kind: 'highlights' }
  | {
      kind: 'review'
      side?: ClipSide
      reviewKind?: ShotReviewKind
      wing?: ShotWing
      stroke?: ShotStroke
    }
  | { kind: 'opening'; side: ClipSide; outcome?: ClipOutcome }
  | { kind: 'errors'; side: ClipSide }
  | { kind: 'winners'; side: ClipSide }
  | { kind: 'serve'; side: ClipSide; outcome?: ClipOutcome }
  | { kind: 'rallies'; rallyIds: string[] }

export interface ClipMatchInput {
  match: Pick<DBMatch, 'id' | 'player1_id'> & Partial<Pick<DBMatch, 'match_date' | 'player2_id'>>
  sets: Pick<DBSet, 'id' | 'set_number'>[]
  rallies: DBRally[]
  shots: DBShot[]
}

export type ClipPlaybackMode = 'rally' | 'shot'

export interface Clip {
  /** rally id for rally clips, shot id for shot clips */
  id: string
  matchId: string
  setId: string
  setNumber: number
  rallyId: string
  rallyIndex: number
  shotId: string | null
  shotIndex: number | null
  /** Contact time the clip is about (shot clips) */
  focusTime: number | null
  /** Active / shot window (shot clips) or rally window (rally clips) */
  start: number
  end: number
  /** Whole-rally padded window — used when playback mode is "rally" */
  rallyStart: number
  rallyEnd: number
  heroWon: boolean
  /** hero–villain before the rally */
  scoreBefore: string
}

/** Shot-based playlists support Whole rally ↔ Shot toggle (default = rally). */
export function isShotBasedClipFilter(filter: ClipFilter | null | undefined): boolean {
  return filter?.kind === 'review' || filter?.kind === 'opening'
}

/** Playback / EDL window for a clip given Whole rally vs Shot. */
export function resolveClipPlaybackWindow(
  clip: Clip,
  mode: ClipPlaybackMode
): { start: number; end: number } {
  if (mode === 'rally' || !clip.shotId) {
    return { start: clip.rallyStart, end: clip.rallyEnd }
  }
  return { start: clip.start, end: clip.end }
}

/** Copy clips with start/end set to the active playback mode (for EDL / duration). */
export function applyClipPlaybackMode(clips: Clip[], mode: ClipPlaybackMode): Clip[] {
  return clips.map((clip) => {
    const { start, end } = resolveClipPlaybackWindow(clip, mode)
    return { ...clip, start, end }
  })
}

export interface ClipWindowOptions {
  rallyLead: number
  rallyTail: number
  shotLead: number
  shotTail: number
}

export const DEFAULT_CLIP_WINDOW: ClipWindowOptions = {
  rallyLead: 1,
  rallyTail: 1,
  shotLead: 1.5,
  shotTail: 1,
}

/** Rally window in source seconds, or null when the rally has no times. */
export function deriveRallyWindow(
  rally: DBRally,
  rallyShots: DBShot[]
): { start: number; end: number } | null {
  const times = rallyShots.map((s) => s.timestamp_start).filter((t) => Number.isFinite(t))
  const start = rally.timestamp_start ?? (times.length > 0 ? Math.min(...times) : null)
  const endTagged = rally.timestamp_end ?? rally.end_of_point_time
  const end = endTagged ?? (times.length > 0 ? Math.max(...times) + 1.5 : null)
  if (start === null || end === null || !Number.isFinite(start) || !Number.isFinite(end)) return null
  return end > start ? { start, end } : { start, end: start + 1.5 }
}

interface RallyContext {
  input: ClipMatchInput
  rally: DBRally
  setNumber: number
  shots: DBShot[]
  window: { start: number; end: number }
  heroWon: boolean
  heroId: string
}

function sideOf(playerId: string | null, heroId: string): ClipSide {
  return playerId === heroId ? 'hero' : 'villain'
}

function rallyClip(ctx: RallyContext, opts: ClipWindowOptions): Clip {
  const { rally, input } = ctx
  const start = Math.max(0, ctx.window.start - opts.rallyLead)
  const end = ctx.window.end + opts.rallyTail
  return {
    id: rally.id,
    matchId: input.match.id,
    setId: rally.set_id,
    setNumber: ctx.setNumber,
    rallyId: rally.id,
    rallyIndex: rally.rally_index,
    shotId: null,
    shotIndex: null,
    focusTime: null,
    start,
    end,
    rallyStart: start,
    rallyEnd: end,
    heroWon: ctx.heroWon,
    scoreBefore: `${rally.player1_score_before}–${rally.player2_score_before}`,
  }
}

function shotClip(ctx: RallyContext, shot: DBShot, opts: ClipWindowOptions): Clip {
  const next = ctx.shots.find((s) => s.shot_index === shot.shot_index + 1)
  const rallyEnd = ctx.window.end
  const until = next ? Math.min(next.timestamp_start, rallyEnd) : rallyEnd
  const start = Math.max(0, Math.max(ctx.window.start - opts.rallyLead, shot.timestamp_start - opts.shotLead))
  const end = Math.max(until, shot.timestamp_start) + opts.shotTail
  const base = rallyClip(ctx, opts)
  return {
    ...base,
    id: shot.id,
    shotId: shot.id,
    shotIndex: shot.shot_index,
    focusTime: shot.timestamp_start,
    start,
    end,
  }
}

function wonBy(side: ClipSide, heroWon: boolean): boolean {
  return side === 'hero' ? heroWon : !heroWon
}

function matchesOutcome(side: ClipSide, heroWon: boolean, outcome?: ClipOutcome): boolean {
  if (!outcome) return true
  return outcome === 'won' ? wonBy(side, heroWon) : !wonBy(side, heroWon)
}

function clipsForRally(ctx: RallyContext, filter: ClipFilter, opts: ClipWindowOptions): Clip[] {
  const { rally, heroId, heroWon } = ctx
  switch (filter.kind) {
    case 'highlights':
      return rally.is_highlight ? [rallyClip(ctx, opts)] : []
    case 'rallies':
      return filter.rallyIds.includes(rally.id) ? [rallyClip(ctx, opts)] : []
    case 'errors':
      // The side that erred is the side that lost the point
      return isErrorEnding(rally.point_ending) && !wonBy(filter.side, heroWon) ? [rallyClip(ctx, opts)] : []
    case 'winners':
      return rally.point_ending === 'winner' && wonBy(filter.side, heroWon) ? [rallyClip(ctx, opts)] : []
    case 'serve':
      return sideOf(rally.server_id, heroId) === filter.side && matchesOutcome(filter.side, heroWon, filter.outcome)
        ? [rallyClip(ctx, opts)]
        : []
    case 'opening': {
      if (rally.first_attack_index === null) return []
      const shot = ctx.shots.find((s) => s.shot_index === rally.first_attack_index)
      if (!shot || sideOf(shot.player_id, heroId) !== filter.side) return []
      if (!matchesOutcome(filter.side, heroWon, filter.outcome)) return []
      return [shotClip(ctx, shot, opts)]
    }
    case 'review':
      return ctx.shots
        .filter((s) => {
          if (!s.shot_review_kind) return false
          if (filter.reviewKind && s.shot_review_kind !== filter.reviewKind) return false
          if (filter.side && sideOf(s.player_id, heroId) !== filter.side) return false
          if (filter.wing && s.shot_wing !== filter.wing) return false
          if (filter.stroke && s.shot_stroke !== filter.stroke) return false
          return true
        })
        .map((s) => shotClip(ctx, s, opts))
  }
}

export function deriveClips(
  matches: ClipMatchInput[],
  filter: ClipFilter,
  opts: ClipWindowOptions = DEFAULT_CLIP_WINDOW
): Clip[] {
  const clips: Clip[] = []
  for (const input of matches) {
    const heroId = input.match.player1_id
    const setNumberById = new Map(input.sets.map((s) => [s.id, s.set_number]))
    const shotsByRally = new Map<string, DBShot[]>()
    for (const shot of input.shots) {
      const list = shotsByRally.get(shot.rally_id) ?? []
      list.push(shot)
      shotsByRally.set(shot.rally_id, list)
    }
    const rallies = input.rallies
      .filter((r) => r.is_scoring && setNumberById.has(r.set_id))
      .sort(
        (a, b) =>
          (setNumberById.get(a.set_id) ?? 0) - (setNumberById.get(b.set_id) ?? 0) ||
          a.rally_index - b.rally_index
      )
    for (const rally of rallies) {
      const shots = (shotsByRally.get(rally.id) ?? []).sort((a, b) => a.shot_index - b.shot_index)
      const window = deriveRallyWindow(rally, shots)
      if (!window) continue
      const ctx: RallyContext = {
        input,
        rally,
        setNumber: setNumberById.get(rally.set_id) ?? 0,
        shots,
        window,
        heroWon: rally.winner_id === heroId,
        heroId,
      }
      clips.push(...clipsForRally(ctx, filter, opts))
    }
  }
  return clips
}

// ---------------------------------------------------------------------------
// Filter keys — stable strings for URLs and preset ids
// ---------------------------------------------------------------------------

const ANY = '*'

export function encodeClipFilter(filter: ClipFilter): string {
  switch (filter.kind) {
    case 'highlights':
      return 'highlights'
    case 'rallies':
      return `rallies.${filter.rallyIds.join(',')}`
    case 'errors':
    case 'winners':
      return `${filter.kind}.${filter.side}`
    case 'serve':
    case 'opening':
      return `${filter.kind}.${filter.side}.${filter.outcome ?? ANY}`
    case 'review':
      return [
        'review',
        filter.side ?? ANY,
        filter.reviewKind ?? ANY,
        filter.wing ?? ANY,
        filter.stroke ?? ANY,
      ].join('.')
  }
}

const SIDES: ClipSide[] = ['hero', 'villain']
const OUTCOMES: ClipOutcome[] = ['won', 'lost']

export function decodeClipFilter(key: string | null | undefined): ClipFilter | null {
  if (!key) return null
  const [kind, ...parts] = key.split('.')
  const side = SIDES.find((s) => s === parts[0])
  const opt = <T extends string>(value: string | undefined): T | undefined =>
    value && value !== ANY ? (value as T) : undefined
  switch (kind) {
    case 'highlights':
      return { kind: 'highlights' }
    case 'rallies':
      return { kind: 'rallies', rallyIds: parts.join('.').split(',').filter(Boolean) }
    case 'errors':
    case 'winners':
      return side ? { kind, side } : null
    case 'serve':
    case 'opening': {
      if (!side) return null
      const outcome = OUTCOMES.find((o) => o === parts[1])
      return { kind, side, ...(outcome ? { outcome } : {}) }
    }
    case 'review': {
      const filter: ClipFilter = { kind: 'review' }
      const s = opt<ClipSide>(parts[0])
      const rk = opt<ShotReviewKind>(parts[1])
      const wing = opt<ShotWing>(parts[2])
      const stroke = opt<ShotStroke>(parts[3])
      if (s) filter.side = s
      if (rk) filter.reviewKind = rk
      if (wing) filter.wing = wing
      if (stroke) filter.stroke = stroke
      return filter
    }
    default:
      return null
  }
}
