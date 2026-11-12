/**
 * Local video file storage.
 *
 * Primary: Origin Private File System (OPFS) — durable app storage that
 * streams from disk, so multi-GB files aren't copied into IndexedDB.
 * Fallback / legacy: the original per-set IndexedDB store ('tt-match-videos'),
 * still read so videos saved before OPFS keep working.
 *
 * Keys are opaque strings (video asset ids; legacy keys are `${matchId}-${setNumber}`).
 */

export type LocalVideoStore = 'opfs' | 'idb'

const DB_NAME = 'tt-match-videos'
const STORE_NAME = 'videos'
const DB_VERSION = 1
const OPFS_DIR = 'videos'

interface StoredVideo {
  id: string
  file: File
  timestamp: number
}

// ---------------------------------------------------------------------------
// Legacy IndexedDB store
// ---------------------------------------------------------------------------

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

async function idbPut(key: string, file: File): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).put({ id: key, file, timestamp: Date.now() } satisfies StoredVideo)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function idbGet(key: string): Promise<File | null> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  return new Promise((resolve, reject) => {
    const request = tx.objectStore(STORE_NAME).get(key)
    request.onsuccess = () => resolve((request.result as StoredVideo | undefined)?.file ?? null)
    request.onerror = () => reject(request.error)
  })
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).delete(key)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ---------------------------------------------------------------------------
// OPFS
// ---------------------------------------------------------------------------

function opfsSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.storage && 'getDirectory' in navigator.storage
}

async function opfsDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory()
  return root.getDirectoryHandle(OPFS_DIR, { create: true })
}

function safeName(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_')
}

async function opfsPut(key: string, blob: Blob): Promise<boolean> {
  if (!opfsSupported()) return false
  const dir = await opfsDir()
  const handle = await dir.getFileHandle(safeName(key), { create: true })
  if (!('createWritable' in handle)) return false
  const writable = await handle.createWritable()
  try {
    await writable.write(blob)
    await writable.close()
  } catch (err) {
    await writable.abort().catch(() => undefined)
    await dir.removeEntry(safeName(key)).catch(() => undefined)
    throw err
  }
  return true
}

async function opfsGet(key: string): Promise<File | null> {
  if (!opfsSupported()) return null
  try {
    const dir = await opfsDir()
    const handle = await dir.getFileHandle(safeName(key))
    const file = await handle.getFile()
    return file.size > 0 ? file : null
  } catch {
    return null
  }
}

async function opfsDelete(key: string): Promise<void> {
  if (!opfsSupported()) return
  try {
    const dir = await opfsDir()
    await dir.removeEntry(safeName(key))
  } catch {
    // not there
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Write a video; returns where it landed. */
export async function putLocalVideo(key: string, blob: Blob, fileName = `${key}.mp4`): Promise<LocalVideoStore> {
  try {
    if (await opfsPut(key, blob)) return 'opfs'
  } catch (err) {
    console.warn('[videoStorage] OPFS write failed, falling back to IndexedDB:', err)
  }
  const file = blob instanceof File ? blob : new File([blob], fileName, { type: blob.type || 'video/mp4' })
  await idbPut(key, file)
  return 'idb'
}

/** Read a video from either store (OPFS first). */
export async function getLocalVideo(key: string): Promise<{ file: File; store: LocalVideoStore } | null> {
  const fromOpfs = await opfsGet(key)
  if (fromOpfs) return { file: fromOpfs, store: 'opfs' }
  const fromIdb = await idbGet(key).catch(() => null)
  return fromIdb ? { file: fromIdb, store: 'idb' } : null
}

export async function deleteLocalVideo(key: string): Promise<void> {
  await Promise.all([opfsDelete(key), idbDelete(key).catch(() => undefined)])
}

/** Ask the browser not to evict our storage under pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number; persisted: boolean } | null> {
  try {
    if (!navigator.storage?.estimate) return null
    const { usage = 0, quota = 0 } = await navigator.storage.estimate()
    const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false
    return { usage, quota, persisted }
  } catch {
    return null
  }
}

/** @deprecated legacy per-set key read; use the video asset service. */
export async function getVideoFile(sessionId: string): Promise<File | null> {
  return (await getLocalVideo(sessionId))?.file ?? null
}
