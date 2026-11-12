/**
 * Reel export — cut a clip playlist out of the source videos into one MP4.
 *
 * In-browser ffmpeg.wasm, stream copy (no re-encode): fast and the reel is
 * only as big as the footage kept. Cuts land on the keyframe before each
 * requested start, so every segment's real duration is measured and stored
 * with the reel (source → reel map stays accurate).
 *
 * Sources are mounted read-only (WORKERFS), so the originals are never copied
 * into wasm memory; only the cut segments and the reel are. Keep reels short.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg'
import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'
import type { DBVideoAsset } from '@/data/entities/videoAssets'
import { videoAssetDb } from '@/data/entities/videoAssets'
import { applyMeasuredDurations, deriveTrimMapping, type Edl } from '@/rules/derive/clips/deriveClipEdl'
import { getSetVideoFile, probeVideo, storeReel } from './videoAssetService'

// FFFSType isn't re-exported by @ffmpeg/ffmpeg; its WORKERFS member is this string
const WORKERFS = 'WORKERFS' as Parameters<FFmpeg['mount']>[0]

export type ReelExportStage = 'loading' | 'cutting' | 'joining' | 'saving'

export interface ReelExportProgress {
  stage: ReelExportStage
  done: number
  total: number
}

/** Rough ceiling for what wasm memory holds comfortably (segments + reel). */
export const REEL_SIZE_LIMIT_BYTES = 700 * 1024 * 1024

export interface ReelPlan {
  missingSources: string[]
  estimatedBytes: number
  tooBig: boolean
}

/** Check every source is on this device and estimate the reel size from source bitrates. */
export async function planReel(edl: Edl): Promise<ReelPlan> {
  const missing: string[] = []
  let estimated = 0
  const seen = new Map<string, File | null>()
  for (const seg of edl.segments) {
    if (!seen.has(seg.sourceKey)) seen.set(seg.sourceKey, await getSetVideoFile(seg.matchId, seg.setNumber))
    const file = seen.get(seg.sourceKey)
    if (!file) {
      if (!missing.includes(seg.sourceKey)) missing.push(seg.sourceKey)
      continue
    }
    const asset = await videoAssetDb.getSetSource(seg.matchId, seg.setNumber)
    const duration = asset?.duration_s ?? (await probeVideo(file)).duration
    const bytesPerSecond = duration ? file.size / duration : 2_000_000
    estimated += bytesPerSecond * (seg.sourceEnd - seg.sourceStart + 2)
  }
  return { missingSources: missing, estimatedBytes: estimated, tooBig: estimated > REEL_SIZE_LIMIT_BYTES }
}

function fmt(seconds: number): string {
  return Math.max(0, seconds).toFixed(3)
}

export async function exportReel(input: {
  matchId: string
  label: string
  edl: Edl
  onProgress?: (p: ReelExportProgress) => void
}): Promise<DBVideoAsset> {
  const { edl, onProgress } = input
  if (edl.segments.length === 0) throw new Error('Nothing to export')
  const total = edl.segments.length

  const ffmpeg = new FFmpeg()
  const mounts: string[] = []
  const written: string[] = []
  try {
    onProgress?.({ stage: 'loading', done: 0, total })
    await ffmpeg.load({ coreURL, wasmURL })

    // Mount each source once
    const inputPath = new Map<string, string>()
    const sourceAssetIds: string[] = []
    for (const seg of edl.segments) {
      if (inputPath.has(seg.sourceKey)) continue
      const file = await getSetVideoFile(seg.matchId, seg.setNumber)
      if (!file) throw new Error(`Set ${seg.setNumber} video isn't on this device`)
      const dir = `/src${inputPath.size}`
      await ffmpeg.createDir(dir)
      await ffmpeg.mount(WORKERFS, { files: [file] }, dir)
      mounts.push(dir)
      inputPath.set(seg.sourceKey, `${dir}/${file.name}`)
      const asset = await videoAssetDb.getSetSource(seg.matchId, seg.setNumber)
      if (asset) sourceAssetIds.push(asset.id)
    }

    const measured: (number | null)[] = []
    for (let i = 0; i < edl.segments.length; i++) {
      const seg = edl.segments[i]
      onProgress?.({ stage: 'cutting', done: i, total })
      const out = `seg${i}.mp4`
      const code = await ffmpeg.exec([
        '-ss', fmt(seg.sourceStart),
        '-i', inputPath.get(seg.sourceKey)!,
        '-t', fmt(seg.sourceEnd - seg.sourceStart),
        '-map', '0:v:0',
        '-map', '0:a:0?',
        '-c', 'copy',
        '-avoid_negative_ts', 'make_zero',
        out,
      ])
      if (code !== 0) throw new Error(`Cutting clip ${i + 1} failed`)
      written.push(out)
      const data = await ffmpeg.readFile(out)
      const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
      measured.push((await probeVideo(new Blob([bytes as BlobPart], { type: 'video/mp4' }))).duration)
    }

    onProgress?.({ stage: 'joining', done: total, total })
    await ffmpeg.writeFile('list.txt', written.map((f) => `file '${f}'`).join('\n'))
    written.push('list.txt')
    const joinCode = await ffmpeg.exec([
      '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', '-movflags', '+faststart', 'reel.mp4',
    ])
    if (joinCode !== 0) throw new Error('Joining clips failed')
    for (const f of written) await ffmpeg.deleteFile(f).catch(() => undefined)
    written.length = 0

    onProgress?.({ stage: 'saving', done: total, total })
    const reel = await ffmpeg.readFile('reel.mp4')
    await ffmpeg.deleteFile('reel.mp4').catch(() => undefined)
    const blob = new Blob([reel as BlobPart], { type: 'video/mp4' })
    const mapped = applyMeasuredDurations(edl, measured)
    return await storeReel({
      matchId: input.matchId,
      label: input.label,
      blob,
      segments: mapped.segments,
      sourceAssetIds,
    })
  } finally {
    for (const dir of mounts) await ffmpeg.unmount(dir).catch(() => undefined)
    ffmpeg.terminate()
  }
}

/**
 * Cut one contiguous window from a set source into a `trimmed` video_asset.
 * Shot tags stay in source-video seconds; the asset keeps the segment map.
 */
export async function exportTrimmedSetVideo(input: {
  matchId: string
  setNumber: number
  sourceStart: number
  sourceEnd: number
  onProgress?: (p: ReelExportProgress) => void
}): Promise<DBVideoAsset> {
  const source = await videoAssetDb.getSetSource(input.matchId, input.setNumber)
  if (!source) throw new Error(`Set ${input.setNumber} has no source video`)
  const edl = deriveTrimMapping({
    matchId: input.matchId,
    setNumber: input.setNumber,
    sourceStart: input.sourceStart,
    sourceEnd: input.sourceEnd,
  })
  const cut = await exportReel({
    matchId: input.matchId,
    label: `Trimmed set ${input.setNumber}`,
    edl,
    onProgress: input.onProgress,
  })
  return videoAssetDb.update(cut.id, {
    kind: 'trimmed',
    set_number: input.setNumber,
    label: `Trimmed set ${input.setNumber}`,
    source_asset_ids: [source.id],
  })
}
