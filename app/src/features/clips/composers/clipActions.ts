/**
 * Clips IO actions — the only place the Clips feature reads/writes video data.
 */

import { videoAssetDb } from '@/data'
import { uploadVideoAsset } from '@/data/cloud'
import {
  downloadAssetToDevice,
  getAssetFile,
  resolveAssetVideo,
  resolveSetVideo,
  storeSetVideo,
  type ResolvedVideo,
} from '@/data/services/videoAssetService'
import { exportReel, planReel, type ReelExportProgress, type ReelPlan } from '@/data/services/reelExportService'
import { deriveClipDownloadFileName, deriveClipEdl, type Edl } from '@/rules/derive/clips/deriveClipEdl'
import type { Clip } from '@/rules/derive/clips/deriveClips'

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

/** Export one clip window via the EDL cutter and trigger a browser download. */
export async function downloadClipFile(
  clip: Clip,
  onProgress?: (p: ReelExportProgress) => void,
): Promise<void> {
  const edl = deriveClipEdl([clip])
  const label = `Set ${clip.setNumber} · rally ${clip.rallyIndex}`
  const asset = await exportReel({
    matchId: clip.matchId,
    label,
    edl,
    onProgress,
  })
  const file = await getAssetFile(asset)
  if (!file) throw new Error('Exported clip is not on this device')
  const fileName = deriveClipDownloadFileName({
    setNumber: clip.setNumber,
    rallyIndex: clip.rallyIndex,
    sourceStart: clip.start,
    sourceEnd: clip.end,
  })
  const url = URL.createObjectURL(file)
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [new File([file], fileName, { type: file.type || 'video/mp4' })], title: fileName })
      return
    }
  } catch {
    // User cancelled share or share failed — fall through to download.
  }
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
