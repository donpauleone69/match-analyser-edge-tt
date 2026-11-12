/**
 * Video Asset Entity Types
 *
 * A video asset is one video file with a stable id, independent of where it
 * lives. Rally and shot times stay in the source video's clock; a reel keeps
 * the segment map back to its sources.
 *
 * - source: an original recording covering one set (set_number)
 * - reel:   an exported gameplay/clip reel built from source segments
 */

import type { EdlSegment } from '@/rules/derive/clips/deriveClipEdl'

export type VideoAssetKind = 'source' | 'reel'
/** Where the device copy lives. 'idb' = legacy per-set IndexedDB store. */
export type VideoLocalStore = 'opfs' | 'idb'

export interface DBVideoAsset {
  id: string // va_{random}
  match_id: string
  set_number: number | null // sources: the set it covers; reels: null
  kind: VideoAssetKind
  label: string | null // reels: playlist name

  file_name: string
  mime_type: string
  size_bytes: number
  duration_s: number | null
  width: number | null
  height: number | null
  /** sha-256 of size + first and last MiB — identifies the file across devices */
  fingerprint: string | null

  local_store: VideoLocalStore | null
  /** Object key in the cloud bucket; signed URLs are made at play time */
  remote_path: string | null
  remote_uploaded_at: string | null

  /** Reels only */
  source_asset_ids: string[] | null
  segments: EdlSegment[] | null

  created_at: string
  updated_at: string
}

export type NewVideoAsset = Omit<DBVideoAsset, 'id' | 'created_at' | 'updated_at'>
