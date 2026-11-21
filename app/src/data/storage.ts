/**
 * How the browser keeps this site's data. Persistent storage is not cleared
 * when the device runs short of space. Null means the browser does not say.
 */
export type StorageInfo = {
  persisted: boolean | null
  /** Bytes this site uses, and may use. */
  usage: number | null
  quota: number | null
}

const manager = (): StorageManager | null =>
  typeof navigator !== 'undefined' && navigator.storage ? navigator.storage : null

/** Asks for persistent storage. True when granted (or already granted); null when the browser cannot. */
export async function requestPersistentStorage(): Promise<boolean | null> {
  const storage = manager()
  if (!storage?.persist) return null
  try {
    return await storage.persist()
  } catch {
    return null
  }
}

export async function readStorageInfo(): Promise<StorageInfo> {
  const storage = manager()
  const info: StorageInfo = { persisted: null, usage: null, quota: null }
  if (!storage) return info
  try {
    if (storage.persisted) info.persisted = await storage.persisted()
  } catch {
    /* leave null */
  }
  try {
    if (storage.estimate) {
      const estimate = await storage.estimate()
      info.usage = estimate.usage ?? null
      info.quota = estimate.quota ?? null
    }
  } catch {
    /* leave null */
  }
  return info
}
