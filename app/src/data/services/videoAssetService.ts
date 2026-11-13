/**
 * Video asset service — store, find and play match videos.
 *
 * Resolution order for a set's video: device copy (OPFS, then the legacy
 * per-set IndexedDB key) → cloud copy (short-lived signed URL) → missing.
 * Missing is an honest state the UI shows; links never silently break.
 */

import { videoAssetDb, type DBVideoAsset } from '@/data/entities/videoAssets'
import { matchDb } from '@/data/entities/matches/match.db'
import { getLocalVideo, putLocalVideo, deleteLocalVideo, requestPersistentStorage } from '@/helpers/videoStorage'
import { supabase, VIDEO_BUCKET } from '@/data/cloud/supabaseClient'
import { deriveTrimMapping, type EdlSegment } from '@/rules/derive/clips/deriveClipEdl'
import {
  isoDateFromEpochMs,
  shouldApplyVideoMatchDate,
} from '@/rules/matchContext'
import {
  findMatchesByVideoFingerprint,
  type VideoFingerprintHit,
} from '@/rules/matchDuplicate'

export type VideoOrigin = 'device' | 'cloud'

export interface ResolvedVideo {
  url: string
  origin: VideoOrigin
  asset: DBVideoAsset | null
}

export type VideoAvailability = 'device' | 'device+cloud' | 'cloud' | 'missing'

const SIGNED_URL_SECONDS = 60 * 60 * 4
const FINGERPRINT_CHUNK = 1024 * 1024

export function legacySetVideoKey(matchId: string, setNumber: number): string {
  return `${matchId}-${setNumber}`
}

/** sha-256 of size + first and last MiB. null when SubtleCrypto isn't available (http on LAN). */
export async function fingerprintFile(file: Blob): Promise<string | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null
  const head = await file.slice(0, FINGERPRINT_CHUNK).arrayBuffer()
  const tail = await file.slice(Math.max(0, file.size - FINGERPRINT_CHUNK)).arrayBuffer()
  const sizeBytes = new TextEncoder().encode(String(file.size))
  const joined = new Uint8Array(sizeBytes.byteLength + head.byteLength + tail.byteLength)
  joined.set(sizeBytes, 0)
  joined.set(new Uint8Array(head), sizeBytes.byteLength)
  joined.set(new Uint8Array(tail), sizeBytes.byteLength + head.byteLength)
  const digest = await crypto.subtle.digest('SHA-256', joined)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Duration and size from the browser's own decoder; nulls if it can't read it. */
export function probeVideo(file: Blob): Promise<{ duration: number | null; width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve({ duration: null, width: null, height: null })
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    const done = (result: { duration: number | null; width: number | null; height: number | null }) => {
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      resolve(result)
    }
    const timer = setTimeout(() => done({ duration: null, width: null, height: null }), 15000)
    video.preload = 'metadata'
    video.muted = true
    video.onloadedmetadata = () => {
      clearTimeout(timer)
      done({
        duration: Number.isFinite(video.duration) ? video.duration : null,
        width: video.videoWidth || null,
        height: video.videoHeight || null,
      })
    }
    video.onerror = () => {
      clearTimeout(timer)
      done({ duration: null, width: null, height: null })
    }
    video.src = url
  })
}

async function localFileFor(asset: DBVideoAsset): Promise<File | null> {
  const direct = await getLocalVideo(asset.id)
  if (direct) return direct.file
  if (asset.kind === 'source' && asset.set_number !== null) {
    const legacy = await getLocalVideo(legacySetVideoKey(asset.match_id, asset.set_number))
    if (legacy) return legacy.file
  }
  return null
}

/**
 * If the match date isn't locked as manual, set it from File.lastModified.
 * Returns true when the match row was updated. Never invents EXIF.
 */
export async function maybeApplyMatchDateFromVideo(
  matchId: string,
  lastModifiedMs: number | null | undefined
): Promise<boolean> {
  const date = lastModifiedMs != null ? isoDateFromEpochMs(lastModifiedMs) : null
  if (!date) return false
  try {
    const match = await matchDb.getById(matchId)
    if (!match) return false
    if (!shouldApplyVideoMatchDate(match.match_date_source)) return false
    if (match.match_date === date && match.match_date_source === 'video') return false
    await matchDb.update(matchId, { match_date: date, match_date_source: 'video' })
    return true
  } catch (err) {
    console.error('[videoAssetService] match date from video failed:', err)
    return false
  }
}

/** On Details open: apply earliest stored source-video lastModified if date isn't manual. */
export async function maybeApplyStoredVideoMatchDate(matchId: string): Promise<boolean> {
  try {
    const match = await matchDb.getById(matchId)
    if (!match || !shouldApplyVideoMatchDate(match.match_date_source)) return false
    const assets = await videoAssetDb.getByMatch(matchId)
    const msList = assets
      .filter((a) => a.kind === 'source')
      .map((a) => a.file_last_modified_ms)
      .filter((ms): ms is number => typeof ms === 'number' && ms > 0)
    if (msList.length === 0) return false
    return maybeApplyMatchDateFromVideo(matchId, Math.min(...msList))
  } catch (err) {
    console.error('[videoAssetService] stored video date failed:', err)
    return false
  }
}

/** Earliest YYYY-MM-DD from source assets' file_last_modified_ms, or null. */
export async function suggestedVideoMatchDate(matchId: string): Promise<string | null> {
  try {
    const assets = await videoAssetDb.getByMatch(matchId)
    const msList = assets
      .filter((a) => a.kind === 'source')
      .map((a) => a.file_last_modified_ms)
      .filter((ms): ms is number => typeof ms === 'number' && ms > 0)
    if (msList.length === 0) return null
    return isoDateFromEpochMs(Math.min(...msList))
  } catch {
    return null
  }
}

export type StoreSetVideoOptions = {
  /** Skip cross-match fingerprint warn (user chose Attach anyway). */
  force?: boolean
}

export type StoreSetVideoResult =
  | { status: 'stored'; asset: DBVideoAsset }
  | { status: 'duplicate'; hits: VideoFingerprintHit[]; fingerprint: string }

/** Cross-match fingerprint lookup (local library). */
export async function findAssetsByFingerprint(fingerprint: string): Promise<DBVideoAsset[]> {
  if (!fingerprint) return []
  const all = await videoAssetDb.getAll()
  return all.filter((a) => a.fingerprint === fingerprint)
}

/**
 * Probe for cross-match fingerprint duplicates before storing.
 * Same match+set reuse is not a duplicate. Null fingerprint → no hits.
 */
export async function checkSetVideoDuplicate(
  matchId: string,
  setNumber: number,
  file: File
): Promise<VideoFingerprintHit[]> {
  const fingerprint = await fingerprintFile(file)
  if (!fingerprint) return []
  const existing = await videoAssetDb.getSetSource(matchId, setNumber)
  if (existing?.fingerprint === fingerprint) return []
  const assets = await videoAssetDb.getAll()
  return findMatchesByVideoFingerprint(assets, fingerprint, { excludeMatchId: matchId })
}

/** Save a video picked for a set: write it to the device and register (or reuse) its asset. */
export async function storeSetVideo(
  matchId: string,
  setNumber: number,
  file: File,
  options: StoreSetVideoOptions = {}
): Promise<DBVideoAsset> {
  void requestPersistentStorage()
  const [fingerprint, meta] = await Promise.all([fingerprintFile(file), probeVideo(file)])
  const existing = await videoAssetDb.getSetSource(matchId, setNumber)
  const sameFile = existing && fingerprint && existing.fingerprint === fingerprint
  const lastModifiedMs =
    typeof file.lastModified === 'number' && file.lastModified > 0 ? file.lastModified : null

  if (!sameFile && fingerprint && !options.force) {
    const assets = await videoAssetDb.getAll()
    const hits = findMatchesByVideoFingerprint(assets, fingerprint, { excludeMatchId: matchId })
    if (hits.length > 0) {
      const err = new Error('DUPLICATE_VIDEO_FINGERPRINT') as Error & {
        code: 'DUPLICATE_VIDEO_FINGERPRINT'
        hits: VideoFingerprintHit[]
        fingerprint: string
      }
      err.code = 'DUPLICATE_VIDEO_FINGERPRINT'
      err.hits = hits
      err.fingerprint = fingerprint
      throw err
    }
  }

  const asset = sameFile
    ? existing
    : await videoAssetDb.create({
        match_id: matchId,
        set_number: setNumber,
        kind: 'source',
        label: null,
        file_name: file.name,
        mime_type: file.type || 'video/mp4',
        size_bytes: file.size,
        duration_s: meta.duration,
        width: meta.width,
        height: meta.height,
        file_last_modified_ms: lastModifiedMs,
        fingerprint,
        local_store: null,
        remote_path: null,
        remote_uploaded_at: null,
        source_asset_ids: null,
        segments: null,
      })

  const store = await putLocalVideo(asset.id, file, file.name)
  const updated = await videoAssetDb.update(asset.id, {
    local_store: store,
    ...(lastModifiedMs != null && !asset.file_last_modified_ms
      ? { file_last_modified_ms: lastModifiedMs }
      : sameFile && lastModifiedMs != null
        ? { file_last_modified_ms: lastModifiedMs }
        : {}),
  })
  await maybeApplyMatchDateFromVideo(matchId, lastModifiedMs ?? updated.file_last_modified_ms)
  return updated
}

/** Store with soft-confirm path: returns duplicate hits instead of throwing when not forced. */
export async function storeSetVideoChecked(
  matchId: string,
  setNumber: number,
  file: File,
  options: StoreSetVideoOptions = {}
): Promise<StoreSetVideoResult> {
  try {
    const asset = await storeSetVideo(matchId, setNumber, file, options)
    return { status: 'stored', asset }
  } catch (e) {
    const err = e as { code?: string; hits?: VideoFingerprintHit[]; fingerprint?: string }
    if (err?.code === 'DUPLICATE_VIDEO_FINGERPRINT' && err.hits && err.fingerprint) {
      return { status: 'duplicate', hits: err.hits, fingerprint: err.fingerprint }
    }
    throw e
  }
}

/**
 * Register a set video that only exists under the legacy per-set key
 * (saved before assets existed). No copy — the file stays where it is.
 */
const adoptions = new Map<string, Promise<DBVideoAsset | null>>()

function adoptLegacySetVideo(matchId: string, setNumber: number): Promise<DBVideoAsset | null> {
  const key = legacySetVideoKey(matchId, setNumber)
  let pending = adoptions.get(key)
  if (!pending) {
    pending = adoptLegacySetVideoOnce(matchId, setNumber).finally(() => adoptions.delete(key))
    adoptions.set(key, pending)
  }
  return pending
}

async function adoptLegacySetVideoOnce(matchId: string, setNumber: number): Promise<DBVideoAsset | null> {
  const already = await videoAssetDb.getSetSource(matchId, setNumber)
  if (already) return already
  const legacy = await getLocalVideo(legacySetVideoKey(matchId, setNumber))
  if (!legacy) return null
  const meta = await probeVideo(legacy.file)
  return videoAssetDb.create({
    match_id: matchId,
    set_number: setNumber,
    kind: 'source',
    label: null,
    file_name: legacy.file.name || `${legacySetVideoKey(matchId, setNumber)}.mp4`,
    mime_type: legacy.file.type || 'video/mp4',
    size_bytes: legacy.file.size,
    duration_s: meta.duration,
    width: meta.width,
    height: meta.height,
    fingerprint: await fingerprintFile(legacy.file),
    local_store: legacy.store,
    remote_path: null,
    remote_uploaded_at: null,
    source_asset_ids: null,
    segments: null,
  })
}

export async function signedVideoUrl(remotePath: string): Promise<string | null> {
  if (!supabase) return null
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) return null
  const { data, error } = await supabase.storage.from(VIDEO_BUCKET).createSignedUrl(remotePath, SIGNED_URL_SECONDS)
  if (error) {
    console.warn('[videoAssets] signed URL failed:', error.message)
    return null
  }
  return data.signedUrl
}

export async function resolveAssetVideo(asset: DBVideoAsset): Promise<ResolvedVideo | null> {
  const file = await localFileFor(asset)
  if (file) return { url: URL.createObjectURL(file), origin: 'device', asset }
  if (asset.remote_path) {
    const url = await signedVideoUrl(asset.remote_path)
    if (url) return { url, origin: 'cloud', asset }
  }
  return null
}

/** Find a playable URL for a set's video. Caller revokes blob: URLs when done. */
export async function resolveSetVideo(matchId: string, setNumber: number): Promise<ResolvedVideo | null> {
  const asset = (await videoAssetDb.getSetSource(matchId, setNumber)) ?? (await adoptLegacySetVideo(matchId, setNumber))
  if (!asset) return null
  return resolveAssetVideo(asset)
}

/** Local file for a set (device only) — used by the tagger and reel export. */
export async function getSetVideoFile(matchId: string, setNumber: number): Promise<File | null> {
  const asset = (await videoAssetDb.getSetSource(matchId, setNumber)) ?? (await adoptLegacySetVideo(matchId, setNumber))
  return asset ? localFileFor(asset) : null
}

export async function getAssetFile(asset: DBVideoAsset): Promise<File | null> {
  return localFileFor(asset)
}

export async function deriveVideoAvailability(asset: DBVideoAsset): Promise<VideoAvailability> {
  const onDevice = Boolean(await localFileFor(asset))
  if (onDevice) return asset.remote_path ? 'device+cloud' : 'device'
  return asset.remote_path ? 'cloud' : 'missing'
}

/** Save an exported reel and its segment map. */
export async function storeReel(input: {
  matchId: string
  label: string
  blob: Blob
  segments: EdlSegment[]
  sourceAssetIds: string[]
}): Promise<DBVideoAsset> {
  const meta = await probeVideo(input.blob)
  const fileName = `${input.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.mp4`
  const asset = await videoAssetDb.create({
    match_id: input.matchId,
    set_number: null,
    kind: 'reel',
    label: input.label,
    file_name: fileName,
    mime_type: 'video/mp4',
    size_bytes: input.blob.size,
    duration_s: meta.duration,
    width: meta.width,
    height: meta.height,
    fingerprint: await fingerprintFile(input.blob),
    local_store: null,
    remote_path: null,
    remote_uploaded_at: null,
    source_asset_ids: input.sourceAssetIds,
    segments: input.segments,
  })
  const store = await putLocalVideo(asset.id, input.blob, fileName)
  return videoAssetDb.update(asset.id, { local_store: store })
}

/** Download a cloud copy onto this device. */
export async function downloadAssetToDevice(asset: DBVideoAsset): Promise<DBVideoAsset> {
  if (!asset.remote_path) throw new Error('This video has no cloud copy')
  const url = await signedVideoUrl(asset.remote_path)
  if (!url) throw new Error('Sign in to download from the cloud')
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Download failed (${response.status})`)
  const blob = await response.blob()
  const store = await putLocalVideo(asset.id, blob, asset.file_name)
  return videoAssetDb.update(asset.id, { local_store: store })
}

export async function removeAssetFromDevice(asset: DBVideoAsset): Promise<DBVideoAsset> {
  await deleteLocalVideo(asset.id)
  return videoAssetDb.update(asset.id, { local_store: null })
}

/** Synthetic match_id bucket for a player’s training clips (not a real match). */
export function trainingVideoMatchId(playerId: string): string {
  return `training:${playerId}`
}

/** Store one training clip in video_assets (same OPFS store as match video). */
export async function storeTrainingClip(input: {
  playerId: string
  file: File
  label: string
}): Promise<DBVideoAsset> {
  const matchId = trainingVideoMatchId(input.playerId)
  const meta = await probeVideo(input.file)
  const fingerprint = await fingerprintFile(input.file)
  const lastModifiedMs =
    typeof input.file.lastModified === 'number' && input.file.lastModified > 0
      ? input.file.lastModified
      : null
  const asset = await videoAssetDb.create({
    match_id: matchId,
    set_number: null,
    kind: 'source',
    label: input.label,
    file_name: input.file.name,
    mime_type: input.file.type || 'video/mp4',
    size_bytes: input.file.size,
    duration_s: meta.duration,
    width: meta.width,
    height: meta.height,
    file_last_modified_ms: lastModifiedMs,
    fingerprint,
    local_store: null,
    remote_path: null,
    remote_uploaded_at: null,
    archived_locally_at: null,
    source_asset_ids: null,
    segments: null,
  })
  const store = await putLocalVideo(asset.id, input.file, input.file.name)
  return videoAssetDb.update(asset.id, { local_store: store })
}

/** Archive = remove device bytes; keep the asset row and any cloud path. Tags untouched. */
export async function archiveAssetLocally(asset: DBVideoAsset): Promise<DBVideoAsset> {
  await deleteLocalVideo(asset.id)
  return videoAssetDb.update(asset.id, {
    local_store: null,
    archived_locally_at: new Date().toISOString(),
  })
}

/** Retrieve a previously archived (or cloud-only) asset onto this device. */
export async function retrieveAssetToDevice(asset: DBVideoAsset): Promise<DBVideoAsset> {
  const restored = await downloadAssetToDevice(asset)
  return videoAssetDb.update(restored.id, { archived_locally_at: null })
}

/**
 * Register a trimmed derivative of a set source. The cut file's clock maps to
 * source time via `segments` (same EDL pattern as reels). Shot tags stay in source seconds.
 */
export async function storeTrimmedSetVideo(input: {
  matchId: string
  setNumber: number
  sourceAsset: DBVideoAsset
  blob: Blob
  sourceStart: number
  sourceEnd: number
  label?: string
}): Promise<DBVideoAsset> {
  const edl = deriveTrimMapping({
    matchId: input.matchId,
    setNumber: input.setNumber,
    sourceStart: input.sourceStart,
    sourceEnd: input.sourceEnd,
  })
  const meta = await probeVideo(input.blob)
  const fileName = `set-${input.setNumber}-trim-${Math.round(input.sourceStart)}-${Math.round(input.sourceEnd)}.mp4`
  const asset = await videoAssetDb.create({
    match_id: input.matchId,
    set_number: input.setNumber,
    kind: 'trimmed',
    label: input.label ?? `Trimmed set ${input.setNumber}`,
    file_name: fileName,
    mime_type: 'video/mp4',
    size_bytes: input.blob.size,
    duration_s: meta.duration,
    width: meta.width,
    height: meta.height,
    fingerprint: await fingerprintFile(input.blob),
    local_store: null,
    remote_path: null,
    remote_uploaded_at: null,
    archived_locally_at: null,
    source_asset_ids: [input.sourceAsset.id],
    segments: edl.segments,
  })
  const store = await putLocalVideo(asset.id, input.blob, fileName)
  return videoAssetDb.update(asset.id, { local_store: store })
}
