/**
 * Pure shaping of clips into rows and preset groups. No React, no IO.
 */

import type { DBShot } from '@/data'
import type { Clip, ClipFilter, ClipMatchInput } from '@/rules/derive/clips/deriveClips'
import { formatClipShotType, type ClipPreset, type ClipPresetGroup } from '@/rules/derive/clips/deriveClipPresets'
import type { ClipPresetGroupModel, ClipRowModel } from '../models'

const GROUP_LABEL: Record<ClipPresetGroup, string> = {
  'work-on': 'Work on',
  highlights: 'Highlights · show-reel',
  attack: 'Opening attacks',
  points: 'Points',
}

const GROUP_ORDER: ClipPresetGroup[] = ['work-on', 'highlights', 'attack', 'points']

export function groupClipPresets(presets: ClipPreset[]): ClipPresetGroupModel[] {
  return GROUP_ORDER.map((group) => ({
    group,
    label: GROUP_LABEL[group],
    presets: presets.filter((p) => p.group === group),
  })).filter((g) => g.presets.length > 0)
}

export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.round(total))
  const m = Math.floor(s / 60)
  return m > 0 ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`
}

export function buildClipRows(
  clips: Clip[],
  inputs: ClipMatchInput[],
  filter: ClipFilter,
  matchLabels: Map<string, string> | null
): ClipRowModel[] {
  const shotById = new Map<string, DBShot>()
  for (const m of inputs) for (const s of m.shots) shotById.set(s.id, s)

  return clips.map((clip) => {
    const shot = clip.shotId ? shotById.get(clip.shotId) : undefined
    const title = shot
      ? `${formatClipShotType(shot.shot_wing, shot.shot_stroke)} · shot ${shot.shot_index}`
      : `Rally ${clip.rallyIndex}`
    const parts = [
      matchLabels?.get(clip.matchId) ?? null,
      `Set ${clip.setNumber}`,
      shot ? `Rally ${clip.rallyIndex}` : null,
      clip.scoreBefore,
      filter.kind === 'rallies' || filter.kind === 'highlights' || filter.kind === 'review'
        ? clip.heroWon ? 'won' : 'lost'
        : null,
    ].filter(Boolean)
    return {
      clip,
      title,
      subtitle: parts.join(' · '),
      heroWon: clip.heroWon,
      durationLabel: formatSeconds(clip.end - clip.start),
    }
  })
}
