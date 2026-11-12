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

export type VideoAssetKind = 'source' | 'reel' | 'trimmed'
/** Where the device copy lives. 'idb' = legacy per-set IndexedDB store. */
export type VideoLocalStore = 'opfs' | 'idb'

export interface DBVideoAsset {
  id: string // va_{random}
  match_id: string
  set_number: number | null // sources/trimmed: the set it covers; reels: null
  kind: VideoAssetKind
  label: string | null // reels: playlist name; trimmed: human label

  file_name: string
  mime_type: string
  size_bytes: number
  duration_s: number | null
  width: number | null
  height: number | null
  /**
   * Browser File.lastModified at pick time (ms). OPFS rewrite loses original
   * lastModified — persist here so match date can stay honest without fake EXIF.
   */
  file_last_modified_ms?: number | null
  /** sha-256 of size + first and last MiB — identifies the file across devices */
  fingerprint: string | null

  local_store: VideoLocalStore | null
  /** Object key in the cloud bucket; signed URLs are made at play time */
  remote_path: string | null
  remote_uploaded_at: string | null
  /**
   * When set, the device copy was archived (bytes removed) while the asset row
   * and any cloud path remain. Tags stay in source-video seconds.
   */
  archived_locally_at?: string | null

  /** Reels / trimmed: map file time back to source-video seconds */
  source_asset_ids: string[] | null
  segments: EdlSegment[] | null

  created_at: string
  updated_at: string
}

export type NewVideoAsset = Omit<DBVideoAsset, 'id' | 'created_at' | 'updated_at'>
