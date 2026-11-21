/**
 * Video files copied onto this device, in the origin private file system
 * (OPFS): `edge-tt-videos/<user|demo>/<video id>`, one folder per database so
 * reseeding the demo clears only its own copies. Not `videos`: that is the
 * reference app's folder, which `cleanupOldStorage` deletes. Demo stand-ins
 * have no file and never come here. Every call resolves; none throws.
 */
import { calculateLastModifiedMs, type VideoFileFacts } from '@/rules/videoFile'
import type { MatchRecord } from '@/types/match'
import type { MatchDbKind } from './db'

export const VIDEO_DIR = 'edge-tt-videos'

const CHUNK = 1024 * 1024

type DirWithKeys = FileSystemDirectoryHandle & { keys(): AsyncIterable<string> }

function opfsRoot(): Promise<FileSystemDirectoryHandle> | null {
  if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) return null
  return navigator.storage.getDirectory()
}

async function kindDir(kind: MatchDbKind, create: boolean): Promise<FileSystemDirectoryHandle | null> {
  try {
    const root = await opfsRoot()
    if (!root) return null
    const dir = await root.getDirectoryHandle(VIDEO_DIR, { create })
    return await dir.getDirectoryHandle(kind, { create })
  } catch {
    return null
  }
}

function safeName(videoId: string): string {
  return videoId.replace(/[^a-zA-Z0-9._-]/g, '_')
}

/** SHA-256 of the size and the first and last MiB, as hex. Null without SubtleCrypto (plain http off localhost). */
export async function fingerprintFile(file: Blob): Promise<string | null> {
  try {
    if (typeof crypto === 'undefined' || !crypto.subtle) return null
    const head = await file.slice(0, CHUNK).arrayBuffer()
    const tail = await file.slice(Math.max(0, file.size - CHUNK)).arrayBuffer()
    const size = new TextEncoder().encode(String(file.size))
    const joined = new Uint8Array(size.byteLength + head.byteLength + tail.byteLength)
    joined.set(size, 0)
    joined.set(new Uint8Array(head), size.byteLength)
    joined.set(new Uint8Array(tail), size.byteLength + head.byteLength)
    const digest = await crypto.subtle.digest('SHA-256', joined)
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}

export async function readFileFacts(file: File): Promise<VideoFileFacts> {
  return {
    fileName: file.name,
    sizeBytes: file.size,
    lastModifiedMs: calculateLastModifiedMs(file.lastModified),
    fingerprint: await fingerprintFile(file),
  }
}

/** Copies the file in. True when every byte landed; a failed copy leaves no file. */
export async function saveVideoFile(kind: MatchDbKind, videoId: string, file: Blob): Promise<boolean> {
  const dir = await kindDir(kind, true)
  if (!dir) return false
  const name = safeName(videoId)
  try {
    const handle = await dir.getFileHandle(name, { create: true })
    if (!('createWritable' in handle)) {
      await dir.removeEntry(name).catch(() => undefined)
      return false
    }
    // Chrome writes to a swap file and swaps it in on close, so a reader never sees half a copy.
    const writable = await handle.createWritable()
    await file.stream().pipeTo(writable)
    const stored = await handle.getFile()
    if (stored.size === file.size) return true
  } catch {
    /* quota, or no writable streams */
  }
  await dir.removeEntry(name).catch(() => undefined)
  return false
}

/** The stored copy, or null when it is not there. */
export async function readVideoFile(kind: MatchDbKind, videoId: string): Promise<File | null> {
  const dir = await kindDir(kind, false)
  if (!dir) return null
  try {
    const file = await (await dir.getFileHandle(safeName(videoId))).getFile()
    return file.size > 0 ? file : null
  } catch {
    return null
  }
}

/** File videos whose rows say their copy is on this device. */
export function storedVideoIds(matches: readonly MatchRecord[]): string[] {
  return matches.flatMap((m) => m.videos.filter((v) => v.kind === 'file' && v.storedOnDevice).map((v) => v.id))
}

/** The stored copies of these videos, by video id. Missing ones are left out. */
export async function readVideoFiles(kind: MatchDbKind, videoIds: readonly string[]): Promise<Record<string, File>> {
  const out: Record<string, File> = {}
  for (const id of videoIds) {
    const file = await readVideoFile(kind, id)
    if (file) out[id] = file
  }
  return out
}

export async function deleteVideoFiles(kind: MatchDbKind, videoIds: readonly string[]): Promise<void> {
  if (videoIds.length === 0) return
  const dir = await kindDir(kind, false)
  if (!dir) return
  for (const id of videoIds) await dir.removeEntry(safeName(id)).catch(() => undefined)
}

/** Deletes every copy in this database's folder except the given videos'. Returns the names removed. */
export async function pruneVideoFiles(kind: MatchDbKind, keepIds: readonly string[]): Promise<string[]> {
  const dir = await kindDir(kind, false)
  if (!dir) return []
  const keep = new Set(keepIds.map(safeName))
  const removed: string[] = []
  try {
    const names: string[] = []
    for await (const name of (dir as DirWithKeys).keys()) names.push(name)
    for (const name of names) {
      if (keep.has(name)) continue
      await dir.removeEntry(name, { recursive: true }).catch(() => undefined)
      removed.push(name)
    }
  } catch {
    /* leave the rest */
  }
  return removed
}

/** Names in this database's folder, for checks. */
export async function listVideoFiles(kind: MatchDbKind): Promise<string[]> {
  const dir = await kindDir(kind, false)
  if (!dir) return []
  const names: string[] = []
  try {
    for await (const name of (dir as DirWithKeys).keys()) names.push(name)
  } catch {
    /* none */
  }
  return names.sort()
}
