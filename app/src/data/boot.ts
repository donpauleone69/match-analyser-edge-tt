/**
 * Opens the database for the current mode and reads it. Demo mode is reseeded
 * when its database has no match, or when the caller asks (the Filled switch).
 * Old storage is removed once, on the first boot.
 */
import type { DemoMode, MatchRecord } from '@/types/match'
import type { RepoResult } from '@/types/db'
import { cleanupOldStorage } from './cleanupOldStorage'
import { openMatchDb, type MatchDb } from './db'
import { isEmpty, loadAll, reseedDemo, type LoadedMatches } from './matchRepo'
import { readStorageInfo, type StorageInfo } from './storage'

export type BootPayload = {
  db: MatchDb
  loaded: LoadedMatches
  storage: StorageInfo
}

let cleaned = false

async function onceCleanup() {
  if (cleaned) return
  cleaned = true
  await cleanupOldStorage()
}

/** The user database, or the demo database. `reseed` rewrites the demo database from the seed. */
export async function openMode(
  mode: DemoMode,
  seed: readonly MatchRecord[],
  reseed: boolean,
): Promise<RepoResult<BootPayload>> {
  const db = openMatchDb(mode === 'filled' ? 'demo' : 'user')
  if (mode === 'filled') {
    const fill = reseed ? { ok: true as const, value: true } : await isEmpty(db)
    if (!fill.ok) return fill
    if (fill.value) {
      const seeded = await reseedDemo(db, seed)
      if (!seeded.ok) return seeded
    }
  }
  const loaded = await loadAll(db)
  if (!loaded.ok) return loaded
  const storage = await readStorageInfo()
  return { ok: true, value: { db, loaded: loaded.value, storage } }
}

/** First open: drop old storage, then open the database for this mode. */
export async function bootDatabase(mode: DemoMode, seed: readonly MatchRecord[]): Promise<RepoResult<BootPayload>> {
  await onceCleanup()
  return openMode(mode, seed, false)
}
