/**
 * Clips IO actions — the only place the Clips feature reads/writes video data.
 */

import { videoAssetDb } from '@/data'
import { uploadVideoAsset } from '@/data/cloud'
import {
  downloadAssetToDevice,
  resolveAssetVideo,
  resolveSetVideo,
  storeSetVideo,
  type ResolvedVideo,
} from '@/data/services/videoAssetService'
import { exportReel, planReel, type ReelExportProgress, type ReelPlan } from '@/data/services/reelExportService'
import type { Edl } from '@/rules/derive/clips/deriveClipEdl'

export type { ReelExportProgress, ReelPlan }

export async function loadClipVideo(matchId: string, setNumber: number): Promise<ResolvedVideo | null> {
  return resolveSetVideo(matchId, setNumber)
}

/** Keep a video picked in the clip player as that set's video. */
export async function saveClipVideoFromUrl(matchId: string, setNumber: number, pickedUrl: string): Promise<string> {
  const blob = await (await fetch(pickedUrl)).blob()
  const file = new File([blob], `${matchId}-${setNumber}.mp4`, { type: blob.type || 'video/mp4' })
  await storeSetVideo(matchId, setNumber, file)
  return URL.createObjectURL(file)
}

export async function loadReelVideo(assetId: string): Promise<ResolvedVideo | null> {
  const asset = await videoAssetDb.getById(assetId)
  return asset ? resolveAssetVideo(asset) : null
}

export async function checkReel(edl: Edl): Promise<ReelPlan> {
  return planReel(edl)
}

export async function saveReel(input: {
  matchId: string
  label: string
  edl: Edl
  onProgress: (p: ReelExportProgress) => void
}) {
  return exportReel(input)
}

export async function backUpReel(assetId: string): Promise<void> {
  await uploadVideoAsset(assetId)
}

export async function fetchReelToDevice(assetId: string): Promise<void> {
  const asset = await videoAssetDb.getById(assetId)
  if (!asset) throw new Error('Reel not found')
  await downloadAssetToDevice(asset)
}
