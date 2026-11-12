/**
 * Match bundle — one self-contained JSON document per match.
 *
 * The same document is the cloud sync row and the portable archive file
 * (analysis + video asset manifest). Pure: no Dexie, no network.
 *
 * Device-only fields (where a video sits on this device) are stripped.
 */

import type {
  DBMatch,
  DBPlayer,
  DBRally,
  DBSet,
  DBShot,
  DBTournament,
  DBVideoAsset,
} from '@/data'

export const MATCH_BUNDLE_SCHEMA_VERSION = 1
export const MATCH_BUNDLE_APP = 'edge-tt-match-analyser'

export type BundleVideoAsset = Omit<DBVideoAsset, 'local_store'>

export interface MatchBundle {
  schemaVersion: typeof MATCH_BUNDLE_SCHEMA_VERSION
  app: typeof MATCH_BUNDLE_APP
  exportedAt: string
  match: DBMatch
  sets: DBSet[]
  rallies: DBRally[]
  shots: DBShot[]
  players: DBPlayer[]
  tournament: DBTournament | null
  videoAssets: BundleVideoAsset[]
}

export interface MatchBundleParts {
  match: DBMatch
  sets: DBSet[]
  rallies: DBRally[]
  shots: DBShot[]
  players: DBPlayer[]
  tournament: DBTournament | null
  videoAssets: DBVideoAsset[]
}

export interface MatchBundleSummary {
  heroName: string
  villainName: string
  matchDate: string
  setsLabel: string | null
  pointsTagged: number
  videoCount: number
  cloudVideoCount: number
}

function stripDevice(asset: DBVideoAsset): BundleVideoAsset {
  const { local_store: _local, ...rest } = asset
  return rest
}

export function createMatchBundle(parts: MatchBundleParts, now: Date = new Date()): MatchBundle {
  const byId = <T extends { id: string }>(a: T, b: T) => a.id.localeCompare(b.id)
  return {
    schemaVersion: MATCH_BUNDLE_SCHEMA_VERSION,
    app: MATCH_BUNDLE_APP,
    exportedAt: now.toISOString(),
    match: parts.match,
    sets: [...parts.sets].sort(byId),
    rallies: [...parts.rallies].sort(byId),
    shots: [...parts.shots].sort(byId),
    players: [...parts.players].sort(byId),
    tournament: parts.tournament,
    videoAssets: parts.videoAssets.map(stripDevice).sort(byId),
  }
}

export class MatchBundleError extends Error {}

/** Validate an unknown JSON value as a bundle this app version can read. */
export function parseMatchBundle(value: unknown): MatchBundle {
  if (!value || typeof value !== 'object') throw new MatchBundleError('Not a match file')
  const v = value as Partial<MatchBundle>
  if (v.app !== MATCH_BUNDLE_APP) throw new MatchBundleError('Not a Match Analyser match file')
  if (typeof v.schemaVersion !== 'number') throw new MatchBundleError('Missing schema version')
  if (v.schemaVersion > MATCH_BUNDLE_SCHEMA_VERSION) {
    throw new MatchBundleError('This match was saved by a newer version of the app')
  }
  if (!v.match || typeof v.match.id !== 'string') throw new MatchBundleError('Match missing')
  for (const key of ['sets', 'rallies', 'shots', 'players', 'videoAssets'] as const) {
    if (!Array.isArray(v[key])) throw new MatchBundleError(`${key} missing`)
  }
  const matchId = v.match.id
  const setIds = new Set(v.sets!.map((s) => s.id))
  if (v.sets!.some((s) => s.match_id !== matchId)) throw new MatchBundleError('A set belongs to another match')
  if (v.rallies!.some((r) => !setIds.has(r.set_id))) throw new MatchBundleError('A rally has no set')
  const rallyIds = new Set(v.rallies!.map((r) => r.id))
  if (v.shots!.some((s) => !rallyIds.has(s.rally_id))) throw new MatchBundleError('A shot has no rally')
  return { tournament: null, ...v } as MatchBundle
}

/** Content hash — ignores exportedAt so an unchanged match hashes the same. */
export function hashMatchBundle(bundle: MatchBundle): string {
  const { exportedAt: _at, ...content } = bundle
  const text = JSON.stringify(content)
  // FNV-1a 32-bit, twice with different seeds → 16 hex chars
  let h1 = 0x811c9dc5
  let h2 = 0x01000193 ^ text.length
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193)
    h2 = Math.imul(h2 ^ c, 0x5bd1e995)
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0')
  return hex(h1) + hex(h2)
}

function fullName(p: DBPlayer | undefined, fallback: string): string {
  if (!p) return fallback
  return `${p.first_name} ${p.last_name}`.trim() || fallback
}

export function summarizeMatchBundle(bundle: MatchBundle): MatchBundleSummary {
  const players = new Map(bundle.players.map((p) => [p.id, p]))
  const sets = [...bundle.sets].sort((a, b) => a.set_number - b.set_number)
  const scored = sets.filter((s) => s.player1_score_final > 0 || s.player2_score_final > 0)
  return {
    heroName: fullName(players.get(bundle.match.player1_id), 'Hero'),
    villainName: bundle.match.player2_id ? fullName(players.get(bundle.match.player2_id), 'Opponent') : 'Opponent',
    matchDate: bundle.match.match_date,
    setsLabel: scored.length > 0 ? scored.map((s) => `${s.player1_score_final}–${s.player2_score_final}`).join(', ') : null,
    pointsTagged: bundle.rallies.filter((r) => r.is_scoring).length,
    videoCount: bundle.videoAssets.length,
    cloudVideoCount: bundle.videoAssets.filter((a) => a.remote_path).length,
  }
}

export function matchBundleTitle(summary: MatchBundleSummary): string {
  return `${summary.heroName} vs ${summary.villainName}`
}

/**
 * Merge incoming assets with this device's copies: keep where the file sits
 * locally, take everything else (metadata, cloud path, reel map) from the bundle.
 */
export function mergeVideoAssets(incoming: BundleVideoAsset[], local: DBVideoAsset[]): DBVideoAsset[] {
  const localById = new Map(local.map((a) => [a.id, a]))
  return incoming.map((a) => {
    const mine = localById.get(a.id)
    return {
      ...a,
      local_store: mine?.local_store ?? null,
      remote_path: a.remote_path ?? mine?.remote_path ?? null,
      remote_uploaded_at: a.remote_uploaded_at ?? mine?.remote_uploaded_at ?? null,
    }
  })
}
