/**
 * Clips — view model types
 */

import type { Clip, ClipFilter } from '@/rules/derive/clips/deriveClips'
import type { ClipPreset, ClipPresetGroup } from '@/rules/derive/clips/deriveClipPresets'
import type { VideoAvailability } from '@/data/services/videoAssetService'

export interface ClipRowModel {
  clip: Clip
  /** e.g. "BH Loop · shot 3" or "Rally 12" */
  title: string
  /** e.g. "Set 1 · 3–5 · won" (+ match name in library mode) */
  subtitle: string
  heroWon: boolean
  durationLabel: string
}

export interface ClipPresetGroupModel {
  group: ClipPresetGroup
  label: string
  presets: ClipPreset[]
}

export interface ClipPlaylistModel {
  key: string
  label: string
  filter: ClipFilter
  rows: ClipRowModel[]
  totalSeconds: number
}

export interface ReelRowModel {
  assetId: string
  matchId: string
  label: string
  createdLabel: string
  sizeLabel: string
  durationLabel: string
  clipCount: number
  availability: VideoAvailability
}
