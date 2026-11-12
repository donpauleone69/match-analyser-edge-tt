/**
 * Cloud sync — match bundles in Supabase Postgres, videos in a private bucket.
 *
 * Local-first: Dexie is the source of truth on each device. Push sends a
 * match's bundle; pull replaces the device copy. One editor per match, so a
 * revision number per match detects "changed on another device" and the user
 * picks which copy wins (no field-level merge).
 */

import { db } from '@/data/db'
import { videoAssetDb } from '@/data/entities/videoAssets'
import { getAssetFile } from '@/data/services/videoAssetService'
import { supabase, cloudAnonKey, cloudUrl, MATCH_BUNDLES_TABLE, VIDEO_BUCKET } from './supabaseClient'
import { resumableUpload } from './resumableUpload'
import { readMatchBundle, writeMatchBundle } from './bundleStore'
import {
  hashMatchBundle,
  matchBundleTitle,
  parseMatchBundle,
  summarizeMatchBundle,
  MATCH_BUNDLE_SCHEMA_VERSION,
  type MatchBundleSummary,
} from './matchBundle'

export interface CloudMatchRow {
  match_id: string
  title: string
  match_date: string | null
  revision: number
  updated_at: string
  device_id: string | null
  summary: Partial<MatchBundleSummary>
}

export type LocalSyncStatus = 'never' | 'synced' | 'changed'

export type PushResult =
  | { status: 'pushed'; revision: number }
  | { status: 'unchanged'; revision: number }
  | { status: 'conflict'; remoteRevision: number; remoteUpdatedAt: string }

interface SyncEntry {
  revision: number
  hash: string
  syncedAt: string
}

const SYNC_STATE_KEY = 'edgett.cloudSync.v1'
const DEVICE_ID_KEY = 'edgett.deviceId'

function readState(): Record<string, SyncEntry> {
  try {
    return JSON.parse(localStorage.getItem(SYNC_STATE_KEY) ?? '{}') as Record<string, SyncEntry>
  } catch {
    return {}
  }
}

function writeEntry(matchId: string, entry: SyncEntry | null) {
  const state = readState()
  if (entry) state[matchId] = entry
  else delete state[matchId]
  localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state))
}

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = `dev_${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export function getSyncEntry(matchId: string): SyncEntry | null {
  return readState()[matchId] ?? null
}

async function requireUser() {
  if (!supabase) throw new Error('Cloud is not set up for this app')
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) throw new Error('Sign in to use the cloud')
  return { client: supabase, user, accessToken: data.session!.access_token }
}

export async function getLocalSyncStatus(matchId: string): Promise<LocalSyncStatus> {
  const entry = getSyncEntry(matchId)
  if (!entry) return 'never'
  const bundle = await readMatchBundle(matchId)
  if (!bundle) return 'never'
  return hashMatchBundle(bundle) === entry.hash ? 'synced' : 'changed'
}

export async function listCloudMatches(): Promise<CloudMatchRow[]> {
  const { client } = await requireUser()
  const { data, error } = await client
    .from(MATCH_BUNDLES_TABLE)
    .select('match_id,title,match_date,revision,updated_at,device_id,summary')
    .is('deleted_at', null)
    .order('match_date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as CloudMatchRow[]
}

export async function pushMatch(matchId: string, opts: { force?: boolean } = {}): Promise<PushResult> {
  const { client, user } = await requireUser()
  const bundle = await readMatchBundle(matchId)
  if (!bundle) throw new Error('Match not found on this device')
  const hash = hashMatchBundle(bundle)
  const entry = getSyncEntry(matchId)

  const { data: remote, error: readError } = await client
    .from(MATCH_BUNDLES_TABLE)
    .select('revision,updated_at')
    .eq('match_id', matchId)
    .maybeSingle()
  if (readError) throw new Error(readError.message)

  const remoteRevision = (remote?.revision as number | undefined) ?? 0
  if (remote && entry && entry.hash === hash && entry.revision === remoteRevision) {
    return { status: 'unchanged', revision: remoteRevision }
  }
  if (remote && !opts.force && (entry?.revision ?? 0) !== remoteRevision) {
    return { status: 'conflict', remoteRevision, remoteUpdatedAt: remote.updated_at as string }
  }

  const summary = summarizeMatchBundle(bundle)
  const revision = remoteRevision + 1
  const { error } = await client.from(MATCH_BUNDLES_TABLE).upsert(
    {
      user_id: user.id,
      match_id: matchId,
      schema_version: MATCH_BUNDLE_SCHEMA_VERSION,
      revision,
      title: matchBundleTitle(summary),
      match_date: bundle.match.match_date?.slice(0, 10) || null,
      summary,
      bundle,
      device_id: getDeviceId(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
    { onConflict: 'user_id,match_id' }
  )
  if (error) throw new Error(error.message)
  writeEntry(matchId, { revision, hash, syncedAt: new Date().toISOString() })
  return { status: 'pushed', revision }
}

/** Replace this device's copy with the cloud copy. */
export async function pullMatch(matchId: string): Promise<void> {
  const { client } = await requireUser()
  const { data, error } = await client
    .from(MATCH_BUNDLES_TABLE)
    .select('bundle,revision')
    .eq('match_id', matchId)
    .single()
  if (error) throw new Error(error.message)
  const bundle = parseMatchBundle(data.bundle)
  await writeMatchBundle(bundle)
  const local = await readMatchBundle(matchId)
  writeEntry(matchId, {
    revision: data.revision as number,
    hash: local ? hashMatchBundle(local) : hashMatchBundle(bundle),
    syncedAt: new Date().toISOString(),
  })
}

export interface SyncAllResult {
  pushed: string[]
  pulled: string[]
  conflicts: string[]
  failed: { matchId: string; message: string }[]
}

/**
 * Push every match changed here; pull every cloud match that is new or newer
 * and not changed here. Matches changed on both sides are reported, not touched.
 */
export async function syncAll(): Promise<SyncAllResult> {
  await requireUser()
  const result: SyncAllResult = { pushed: [], pulled: [], conflicts: [], failed: [] }
  const remote = await listCloudMatches()
  const remoteById = new Map(remote.map((r) => [r.match_id, r]))
  const localIds = (await db.matches.toCollection().primaryKeys()) as string[]

  for (const matchId of localIds) {
    try {
      const status = await getLocalSyncStatus(matchId)
      const row = remoteById.get(matchId)
      const entry = getSyncEntry(matchId)
      const remoteNewer = row && row.revision !== (entry?.revision ?? 0)
      if (status === 'synced' && !remoteNewer) continue
      if (status === 'synced' && remoteNewer) {
        await pullMatch(matchId)
        result.pulled.push(matchId)
        continue
      }
      const pushed = await pushMatch(matchId)
      if (pushed.status === 'conflict') result.conflicts.push(matchId)
      else if (pushed.status === 'pushed') result.pushed.push(matchId)
    } catch (err) {
      result.failed.push({ matchId, message: err instanceof Error ? err.message : String(err) })
    }
  }

  for (const row of remote) {
    if (localIds.includes(row.match_id)) continue
    try {
      await pullMatch(row.match_id)
      result.pulled.push(row.match_id)
    } catch (err) {
      result.failed.push({ matchId: row.match_id, message: err instanceof Error ? err.message : String(err) })
    }
  }
  return result
}

/** Upload a video file from this device to the private bucket, then re-push the match. */
export async function uploadVideoAsset(
  assetId: string,
  onProgress?: (sent: number, total: number) => void,
): Promise<void> {
  const { user, accessToken } = await requireUser()
  const asset = await videoAssetDb.getById(assetId)
  if (!asset) throw new Error('Video not found')
  const file = await getAssetFile(asset)
  if (!file) throw new Error('This video is not on this device')
  const ext = (asset.file_name.split('.').pop() || 'mp4').toLowerCase()
  const path = `${user.id}/${asset.match_id}/${asset.id}.${ext}`
  await resumableUpload({
    baseUrl: cloudUrl!,
    anonKey: cloudAnonKey!,
    accessToken,
    bucket: VIDEO_BUCKET,
    objectPath: path,
    file,
    contentType: asset.mime_type || 'video/mp4',
    onProgress,
  })
  await videoAssetDb.update(asset.id, { remote_path: path, remote_uploaded_at: new Date().toISOString() })
  if (await db.matches.get(asset.match_id)) await pushMatch(asset.match_id, { force: true })
}
