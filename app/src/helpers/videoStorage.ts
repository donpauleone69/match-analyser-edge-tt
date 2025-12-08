/**
 * Video File Storage using IndexedDB
 * Persists video files locally so they survive page refresh
 */

const DB_NAME = 'tt-match-videos'
const STORE_NAME = 'videos'
const DB_VERSION = 1

interface StoredVideo {
  id: string  // sessionId (matchId-setNumber)
  file: File
  timestamp: number
}

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

export async function saveVideoFile(sessionId: string, file: File): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  
  const video: StoredVideo = {
    id: sessionId,
    file,
    timestamp: Date.now(),
  }
  
  store.put(video)
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getVideoFile(sessionId: string): Promise<File | null> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  
  return new Promise((resolve, reject) => {
    const request = store.get(sessionId)
    request.onsuccess = () => {
      const result = request.result as StoredVideo | undefined
      resolve(result?.file || null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deleteVideoFile(sessionId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  
  store.delete(sessionId)
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Cleanup old videos (older than 7 days)
export async function cleanupOldVideos(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
  
  return new Promise((resolve, reject) => {
    const request = store.openCursor()
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        const video = cursor.value as StoredVideo
        if (video.timestamp < sevenDaysAgo) {
          cursor.delete()
        }
        cursor.continue()
      }
    }
    
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}




