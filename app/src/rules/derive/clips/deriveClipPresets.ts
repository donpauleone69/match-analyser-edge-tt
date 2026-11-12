/**
 * Ready-made clip playlists for a set of matches, with counts.
 * Pure — no React, no IO.
 *
 * Groups (hero first):
 *   Work on   — shots flagged for review, all and per wing + stroke
 *   Highlights — starred rallies
 *   Attack    — opening attacks (FOS) by each side, and the ones lost
 *   Points    — errors, winners, points lost on serve
 * Presets with no clips are dropped; review patterns sort by count.
 */

import type { ShotReviewKind, ShotStroke, ShotWing } from '@/data'
import { deriveClips, encodeClipFilter, type ClipFilter, type ClipMatchInput } from './deriveClips'

export type ClipPresetGroup = 'work-on' | 'highlights' | 'attack' | 'points'

export interface ClipPreset {
  key: string
  group: ClipPresetGroup
  label: string
  count: number
  filter: ClipFilter
}

export interface ClipPresetNames {
  hero: string
  villain: string
}

const STROKE_LABEL: Record<ShotStroke, string> = {
  flick: 'Flick',
  loop: 'Loop',
  drive: 'Drive',
  smash: 'Smash',
  lob: 'Lob',
  block: 'Block',
  push: 'Push',
  chop: 'Chop',
}

const KIND_LABEL: Record<ShotReviewKind, string> = { technical: 'Technical', tactical: 'Tactical' }

export function formatClipShotType(wing: ShotWing | null | undefined, stroke: ShotStroke | null | undefined): string {
  const parts = [wing, stroke ? STROKE_LABEL[stroke] : null].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Shot type not tagged'
}

function reviewPatterns(matches: ClipMatchInput[], kind: ShotReviewKind): ClipPreset[] {
  const counts = new Map<string, { wing: ShotWing | null; stroke: ShotStroke | null; count: number }>()
  for (const m of matches) {
    const rallyIds = new Set(m.rallies.filter((r) => r.is_scoring).map((r) => r.id))
    for (const s of m.shots) {
      if (s.shot_review_kind !== kind || s.player_id !== m.match.player1_id || !rallyIds.has(s.rally_id)) continue
      if (!s.shot_wing && !s.shot_stroke) continue
      const key = `${s.shot_wing ?? '*'}|${s.shot_stroke ?? '*'}`
      const entry = counts.get(key) ?? { wing: s.shot_wing, stroke: s.shot_stroke, count: 0 }
      entry.count++
      counts.set(key, entry)
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .map(({ wing, stroke }) => {
      const filter: ClipFilter = {
        kind: 'review',
        side: 'hero',
        reviewKind: kind,
        ...(wing ? { wing } : {}),
        ...(stroke ? { stroke } : {}),
      }
      return {
        key: encodeClipFilter(filter),
        group: 'work-on' as const,
        label: `${KIND_LABEL[kind]} · ${formatClipShotType(wing, stroke)}`,
        count: 0,
        filter,
      }
    })
}

export function deriveClipPresets(matches: ClipMatchInput[], names: ClipPresetNames): ClipPreset[] {
  const make = (group: ClipPresetGroup, label: string, filter: ClipFilter): ClipPreset => ({
    key: encodeClipFilter(filter),
    group,
    label,
    count: 0,
    filter,
  })

  const candidates: ClipPreset[] = [
    make('work-on', `${names.hero} · all technical review`, { kind: 'review', side: 'hero', reviewKind: 'technical' }),
    ...reviewPatterns(matches, 'technical'),
    make('work-on', `${names.hero} · all tactical review`, { kind: 'review', side: 'hero', reviewKind: 'tactical' }),
    ...reviewPatterns(matches, 'tactical'),
    make('highlights', 'Highlights', { kind: 'highlights' }),
    make('attack', `${names.hero} · opening attacks`, { kind: 'opening', side: 'hero' }),
    make('attack', `${names.hero} · opening attacks lost`, { kind: 'opening', side: 'hero', outcome: 'lost' }),
    make('attack', `${names.villain} · opening attacks`, { kind: 'opening', side: 'villain' }),
    make('points', `${names.hero} · errors`, { kind: 'errors', side: 'hero' }),
    make('points', `${names.hero} · winners`, { kind: 'winners', side: 'hero' }),
    make('points', `${names.hero} · points lost on serve`, { kind: 'serve', side: 'hero', outcome: 'lost' }),
    make('points', `${names.villain} · winners`, { kind: 'winners', side: 'villain' }),
  ]

  const seen = new Set<string>()
  return candidates
    .filter((p) => (seen.has(p.key) ? false : (seen.add(p.key), true)))
    .map((p) => ({ ...p, count: deriveClips(matches, p.filter).length }))
    .filter((p) => p.count > 0)
}
