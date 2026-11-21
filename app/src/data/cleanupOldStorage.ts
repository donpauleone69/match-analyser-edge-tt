/**
 * Removes what older builds of this product left in the browser, by exact
 * name or by a key prefix only they used. Found in git history (the reference
 * app at tag `pre-refactor-v0.17.28` and every proto build). Unknown names
 * are left alone, and so is every key `settingsStore` reads
 * (`SETTINGS_STORAGE_KEYS`). Run on boot; a second run finds nothing.
 *
 * New code must not reuse a name listed here: a Supabase client needs its own
 * `auth.storageKey`, and the on-device video copy another directory name.
 */

/** Dexie database of the reference app; its per-set video store. */
export const OLD_DATABASES = ['EdgeTTMatchAnalyser', 'tt-match-videos'] as const

/** Origin private file system: the reference app's video copies. */
export const OLD_OPFS_DIRS = ['videos'] as const

export const OLD_LOCAL_KEYS = [
  'tt-tagger-session', // app taggingStore persist (Dec 2025)
  'tagging-session-storage', // app taggingSessionStore persist
  'video-playback-storage', // app videoPlaybackStore persist
  'edge-tt-local-device-session', // app cloudStore
  'edgett.cloudSync.v1', // app cloud sync state
  'edgett.deviceId', // app cloud sync device id
  'edge-tt-tagging-mode:v1:last', // app tagging mode
  'edge-tt.answer-layout', // proto v0.14.0 to v0.16.5
  'proto-tag-timings', // proto v0.16 tag log
  'proto-fresh-theme', // proto-fresh theme
] as const

export const OLD_LOCAL_PREFIXES = [
  'edge-tt-account-profile:', // app cloudStore profile per user
  'edgett.tus.', // app resumable upload urls
  'edge-tt-pass1-draft:v1:', // app Pass 1 draft per set
  'edge-tt-simple-draft:v1:', // app Simple tagging draft per set
  'edge-tt-rally-tagging-mode:v1:', // app tagging mode per rally
] as const

/** supabase-js v2 session of the reference app's cloud sync: `sb-<project ref>-auth-token`. */
export const OLD_SUPABASE_AUTH_KEY = /^sb-[a-z0-9]+-auth-token(-code-verifier)?$/

export const OLD_SESSION_KEYS = ['proto-tag-timings'] as const

export type CleanupReport = {
  databases: string[]
  opfsDirs: string[]
  localKeys: string[]
  sessionKeys: string[]
}

export function isOldLocalKey(key: string): boolean {
  return (
    (OLD_LOCAL_KEYS as readonly string[]).includes(key) ||
    OLD_LOCAL_PREFIXES.some((prefix) => key.startsWith(prefix)) ||
    OLD_SUPABASE_AUTH_KEY.test(key)
  )
}

function removeKeys(storage: () => Storage, isOld: (key: string) => boolean): string[] {
  try {
    const store = storage()
    const keys = Array.from({ length: store.length }, (_, i) => store.key(i)).filter((k): k is string => k !== null)
    const old = keys.filter(isOld)
    for (const key of old) store.removeItem(key)
    return old
  } catch {
    return []
  }
}

/** Resolves true when deleted. A tab of the old app holding it open can block; give up after `waitMs`. */
function deleteDatabase(name: string, waitMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), waitMs)
    const done = (ok: boolean) => {
      clearTimeout(timer)
      resolve(ok)
    }
    try {
      const request = indexedDB.deleteDatabase(name)
      request.onsuccess = () => done(true)
      request.onerror = () => done(false)
    } catch {
      done(false)
    }
  })
}

async function removeDatabases(waitMs: number): Promise<string[]> {
  if (typeof indexedDB === 'undefined') return []
  let present: string[] = [...OLD_DATABASES]
  try {
    if (indexedDB.databases) {
      const names = new Set((await indexedDB.databases()).map((d) => d.name))
      present = OLD_DATABASES.filter((name) => names.has(name))
    }
  } catch {
    /* no list: try each name; deleting a database that is not there does nothing */
  }
  const removed: string[] = []
  for (const name of present) if (await deleteDatabase(name, waitMs)) removed.push(name)
  return removed
}

async function removeOpfsDirs(): Promise<string[]> {
  const removed: string[] = []
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) return removed
    const root = await navigator.storage.getDirectory()
    for (const name of OLD_OPFS_DIRS) {
      try {
        await root.getDirectoryHandle(name)
      } catch {
        continue
      }
      await root.removeEntry(name, { recursive: true })
      removed.push(name)
    }
  } catch {
    /* leave the rest */
  }
  return removed
}

/** Deletes the old databases, video directory and keys. Never throws; reports what it removed. */
export async function cleanupOldStorage(opts: { waitMs?: number } = {}): Promise<CleanupReport> {
  const localKeys = removeKeys(() => localStorage, isOldLocalKey)
  const sessionKeys = removeKeys(() => sessionStorage, (key) => (OLD_SESSION_KEYS as readonly string[]).includes(key))
  const databases = await removeDatabases(opts.waitMs ?? 3000)
  const opfsDirs = await removeOpfsDirs()
  return { databases, opfsDirs, localKeys, sessionKeys }
}
