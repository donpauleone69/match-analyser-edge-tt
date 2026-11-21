/**
 * Telling whether a picked file is the video a row describes. The fingerprint
 * is a hash of the size and the first and last MiB (`fingerprintFile` in
 * `app/src/data/videoFiles.ts`), so a renamed or re-dated copy still matches.
 * Without a hash on both sides (no SubtleCrypto, or a row from before 8.3),
 * name, exact size and last modified must agree.
 */
export type VideoFileFacts = {
  fileName: string
  sizeBytes: number
  lastModifiedMs: number | null
  fingerprint: string | null
}

/** `File.lastModified` as stored: whole ms after 0, else null. */
export function calculateLastModifiedMs(value: number): number | null {
  return Number.isInteger(value) && value > 0 ? value : null
}

export function isSameVideoFile(stored: VideoFileFacts, picked: VideoFileFacts): boolean {
  if (stored.fingerprint && picked.fingerprint) return stored.fingerprint === picked.fingerprint
  if (stored.sizeBytes !== picked.sizeBytes || stored.fileName !== picked.fileName) return false
  return stored.lastModifiedMs === null || picked.lastModifiedMs === null || stored.lastModifiedMs === picked.lastModifiedMs
}
