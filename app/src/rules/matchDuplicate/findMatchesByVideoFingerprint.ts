/**
 * Cross-match video fingerprint hits (product goal 10).
 * Pure — no React, no IO.
 */

export interface VideoFingerprintHit {
  assetId: string
  matchId: string
  setNumber: number | null
  kind: string
  fileName: string
}

export interface FingerprintAssetRow {
  id: string
  match_id: string
  set_number: number | null
  kind: string
  fingerprint: string | null
  file_name: string
}

export interface FindByFingerprintOptions {
  excludeMatchId?: string
  /** Default false: only kind === 'source'. */
  includeDerivatives?: boolean
}

function isTrainingMatchId(matchId: string): boolean {
  return matchId.startsWith('training:')
}

/**
 * Find other matches that already hold this source-video fingerprint.
 * Skips null/empty fingerprint and training assets.
 */
export function findMatchesByVideoFingerprint(
  assets: readonly FingerprintAssetRow[],
  fingerprint: string,
  options: FindByFingerprintOptions = {}
): VideoFingerprintHit[] {
  if (!fingerprint) return []

  const includeDerivatives = options.includeDerivatives === true
  const hits: VideoFingerprintHit[] = []

  for (const a of assets) {
    if (!a.fingerprint || a.fingerprint !== fingerprint) continue
    if (isTrainingMatchId(a.match_id)) continue
    if (options.excludeMatchId && a.match_id === options.excludeMatchId) continue
    if (!includeDerivatives && a.kind !== 'source') continue
    hits.push({
      assetId: a.id,
      matchId: a.match_id,
      setNumber: a.set_number,
      kind: a.kind,
      fileName: a.file_name,
    })
  }

  return hits
}
