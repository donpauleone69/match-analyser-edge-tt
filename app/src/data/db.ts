/**
 * The match database on this device (Dexie over IndexedDB), schema v1 from
 * `types/db.ts`. Two databases with the same tables: the user's matches, and
 * the demo matches (reseeded from the seed, never mixed with the user's).
 *
 * Upgrade rule: additive only. A new schema adds `this.version(n).stores()`
 * with n = SCHEMA_VERSION + 1 and keeps every earlier `version()` call as it
 * is. It may add a table, an index, or an optional column (filled with null
 * in its `upgrade()`). It never deletes or renames a table, column or index,
 * never clears rows, and never rewrites a stored value. Dexie stores version n
 * as IndexedDB version n * 10.
 */
import Dexie, { type Table } from 'dexie'
import {
  DB_TABLES,
  SCHEMA_VERSION,
  type DbTable,
  type DraftRow,
  type EventRow,
  type MatchRow,
  type OpponentRow,
  type RallyRow,
  type SetRow,
  type ShotRow,
  type VideoRow,
} from '@/types/db'

/** Not `EdgeTTMatchAnalyser` or `tt-match-videos`: those are the old app's, removed by `cleanupOldStorage`. */
export const USER_DB_NAME = 'edge-tt-matches'
export const DEMO_DB_NAME = 'edge-tt-matches-demo'

export type MatchDbKind = 'user' | 'demo'

/** Primary key first, then the indexes the repositories query by. */
export const SCHEMA_V1_STORES: Record<DbTable, string> = {
  opponents: 'id, name',
  events: 'id, name',
  matches: 'id, createdAt, opponentId, eventId',
  videos: 'id, matchId',
  sets: 'id, matchId',
  rallies: 'id, setId',
  shots: 'id, rallyId',
  drafts: 'setId',
}

export class MatchDb extends Dexie {
  declare opponents: Table<OpponentRow, string>
  declare events: Table<EventRow, string>
  declare matches: Table<MatchRow, string>
  declare videos: Table<VideoRow, string>
  declare sets: Table<SetRow, string>
  declare rallies: Table<RallyRow, string>
  declare shots: Table<ShotRow, string>
  declare drafts: Table<DraftRow, string>
  /** Only a demo database may be cleared and reseeded. */
  kind: MatchDbKind

  constructor(name: string, kind: MatchDbKind) {
    super(name)
    this.kind = kind
    this.version(SCHEMA_VERSION).stores(SCHEMA_V1_STORES)
  }

  /** The eight tables, for a transaction over all of them. */
  allTables() {
    return DB_TABLES.map((name) => this.table(name))
  }
}

/** A database by name, not opened yet. The app uses `openMatchDb`; checks use their own names. */
export function createMatchDb(name: string, kind: MatchDbKind): MatchDb {
  return new MatchDb(name, kind)
}

const opened: Partial<Record<MatchDbKind, MatchDb>> = {}

/** The app's user or demo database, one instance each. Dexie opens it on first use. */
export function openMatchDb(kind: MatchDbKind): MatchDb {
  const db = opened[kind] ?? createMatchDb(kind === 'user' ? USER_DB_NAME : DEMO_DB_NAME, kind)
  opened[kind] = db
  return db
}
