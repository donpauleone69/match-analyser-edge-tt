/**
 * Matches in the database. Every write runs the `rules/dbValidate.ts`
 * checks first and refuses rows that fail; a refused or failed call writes
 * nothing. Calls return a `RepoResult` and never throw.
 */
import { deriveDbRows, deriveMatchRecords, deriveSetRowId, EMPTY_ROWS } from '@/rules/dbRows'
import { validateDbRows, validateDraftRow, validateRallyRow } from '@/rules/dbValidate'
import type { DbError, DbRows, EventRow, OpponentRow, RallyRow, RepoResult, ShotRow } from '@/types/db'
import type { MatchRecord, RemovedVideo } from '@/types/match'
import type { Draft } from '@/types/rally'
import type { MatchDb } from './db'
import {
  dropUnlinkedNames,
  readMatchRows,
  readRows,
  refuse,
  refuseForeignIds,
  refuseInvalid,
  run,
  touchMatch,
  writeMatchRows,
  type WriteCount,
} from './repo'

export type LoadedMatches = {
  /** Oldest `createdAt` first, ties by id; the Matches list sorts them with `sortNewestFirst`. */
  matches: MatchRecord[]
  removedVideos: Record<string, RemovedVideo>
  opponents: OpponentRow[]
  events: EventRow[]
}

/** Every stored row. */
export function readAllRows(db: MatchDb): Promise<RepoResult<DbRows>> {
  return run(() => readRows(db))
}

/** The whole database as the match store holds it. */
export function loadAll(db: MatchDb): Promise<RepoResult<LoadedMatches>> {
  return run(async () => {
    const rows = await readRows(db)
    const { matches, removedVideos } = deriveMatchRecords(rows)
    const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name)
    return { matches, removedVideos, opponents: [...rows.opponents].sort(byName), events: [...rows.events].sort(byName) }
  })
}

export type SaveMatchOptions = {
  /** The store's removed videos; one that rallies or marks of this match still name is kept as a row. */
  removedVideos?: Readonly<Record<string, RemovedVideo>>
  now?: number
  today?: Date
}

/**
 * Writes one match as it is in memory: its row, videos, sets, rallies with
 * their shots, and drafts, in one transaction. Only changed rows are written;
 * rows the match no longer has are deleted. The opponent and event text link
 * to the row with that name (ignoring case and outer spaces) or make one, so
 * call it for those two fields when the box is committed, not per keystroke.
 * A row the match stops linking to goes when nothing else uses it.
 */
export function saveMatch(db: MatchDb, match: MatchRecord, opts: SaveMatchOptions = {}): Promise<RepoResult<WriteCount>> {
  const now = opts.now ?? Date.now()
  return run(() =>
    db.transaction('rw', db.allTables(), async () => {
      const stored = await readMatchRows(db, match.id)
      const before: DbRows = {
        opponents: await db.opponents.toArray(),
        events: await db.events.toArray(),
        matches: stored.match ? [stored.match] : [],
        ...stored.children,
      }
      const after = deriveDbRows([match], { now, prev: before, removedVideos: opts.removedVideos })
      refuseInvalid(validateDbRows(after, opts.today))
      await refuseForeignIds(db, match.id, stored.children, after)
      const count = await writeMatchRows(db, before, after)
      count.deleted += await dropUnlinkedNames(db, stored.match, after.matches[0])
      return count
    }),
  )
}

/** Deletes a match and every row under it. Its opponent and event rows stay. Deleting a match that is not stored is fine. */
export function deleteMatch(db: MatchDb, matchId: string): Promise<RepoResult<WriteCount>> {
  return run(() =>
    db.transaction('rw', db.allTables(), async () => {
      const stored = await readMatchRows(db, matchId)
      const before: DbRows = { ...EMPTY_ROWS, matches: stored.match ? [stored.match] : [], ...stored.children }
      return writeMatchRows(db, before, EMPTY_ROWS)
    }),
  )
}

/** The open rally of one set, written on every tap; null clears it. One draft per set. */
export function saveDraft(
  db: MatchDb,
  matchId: string,
  setNumber: number,
  draft: Draft | null,
  opts: { now?: number } = {},
): Promise<RepoResult<void>> {
  const now = opts.now ?? Date.now()
  const setId = deriveSetRowId(matchId, setNumber)
  return run(() =>
    db.transaction('rw', [db.sets, db.videos, db.drafts, db.matches], async () => {
      if (draft === null) {
        if (await db.drafts.get(setId)) {
          await db.drafts.delete(setId)
          await touchMatch(db, matchId, now)
        }
        return
      }
      const row = { setId, rally: draft }
      refuseInvalid(validateDraftRow(row))
      if (!(await db.sets.get(setId))) refuse('missing', `set ${setId} is not stored`)
      const video = await db.videos.get(draft.videoId)
      if (!video || video.matchId !== matchId) {
        refuseInvalid([{ table: 'drafts', id: setId, field: 'rally.videoId', problem: 'names a row that is not there' }])
      }
      await db.drafts.put(row)
      await touchMatch(db, matchId, now)
    }),
  )
}

/**
 * One rally and its shots in one transaction. A re-save replaces the shots:
 * shot rows the new list does not have are deleted. The set and the video must
 * be stored, in one match, and no other rally of the set may hold its place.
 * Places must stay 0 to k-1, so this saves a rally in place or adds one at the
 * end; a save that moves other rallies goes through `saveMatch`.
 */
export function saveRally(db: MatchDb, rally: RallyRow, shots: readonly ShotRow[], opts: { now?: number } = {}): Promise<RepoResult<WriteCount>> {
  const now = opts.now ?? Date.now()
  return run(() =>
    db.transaction('rw', [db.sets, db.videos, db.rallies, db.shots, db.matches], async () => {
      refuseInvalid(validateRallyRow(rally, shots))
      const set = await db.sets.get(rally.setId)
      if (!set) refuse('missing', `set ${rally.setId} is not stored`)
      const video = await db.videos.get(rally.videoId)
      const link: DbError = { table: 'rallies', id: rally.id, field: 'videoId', problem: 'names a row that is not there' }
      if (!video || video.matchId !== set.matchId) refuseInvalid([link])
      const stored = await db.rallies.get(rally.id)
      if (stored && stored.setId !== rally.setId) refuse('conflict', `rally ${rally.id} belongs to set ${stored.setId}`)
      const inSet = await db.rallies.where('setId').equals(rally.setId).toArray()
      const deleted = rally.deletedAt !== null
      const holder = inSet.find((r) => r.id !== rally.id && r.position === rally.position && (r.deletedAt !== null) === deleted)
      if (holder) refuse('conflict', `rally ${holder.id} holds place ${rally.position} in set ${rally.setId}`)
      const next = [...inSet.filter((r) => r.id !== rally.id), rally]
      for (const inDeleted of [false, true]) {
        const places = next.filter((r) => (r.deletedAt !== null) === inDeleted).map((r) => r.position).sort((a, b) => a - b)
        const at = places.findIndex((p, i) => p !== i)
        if (at >= 0) refuseInvalid([{ table: 'rallies', id: rally.id, field: 'position', problem: `${at}: numbered 0 up with no gap in set ${rally.setId}` }])
      }
      const storedShots = await db.shots.bulkGet(shots.map((s) => s.id))
      const foreign = storedShots.find((s) => s !== undefined && s.rallyId !== rally.id)
      if (foreign) refuse('conflict', `shot ${foreign.id} belongs to rally ${foreign.rallyId}`)
      const oldShots = await db.shots.where('rallyId').equals(rally.id).primaryKeys()
      const keep = new Set(shots.map((s) => s.id))
      const gone = oldShots.filter((id) => !keep.has(id))
      await db.rallies.put(rally)
      if (gone.length) await db.shots.bulkDelete(gone)
      if (shots.length) await db.shots.bulkPut([...shots])
      await touchMatch(db, set.matchId, now)
      return { put: 1 + shots.length, deleted: gone.length }
    }),
  )
}

/**
 * Rows for a list of matches written together (the demo seed): match i gets
 * `createdAt` now + i, so the database reads them back in list order.
 */
export function deriveListRows(matches: readonly MatchRecord[], now: number): DbRows {
  const rows = deriveDbRows(matches, { now })
  rows.matches = rows.matches.map((m, i) => ({ ...m, createdAt: now + i, updatedAt: now + i }))
  return rows
}

/** Empties the demo database and writes these matches. Refused on the user's database. */
export function reseedDemo(db: MatchDb, seed: readonly MatchRecord[], opts: { now?: number; today?: Date } = {}): Promise<RepoResult<WriteCount>> {
  const now = opts.now ?? Date.now()
  return run(async () => {
    if (db.kind !== 'demo') refuse('conflict', 'only the demo database is reseeded')
    const rows = deriveListRows(seed, now)
    refuseInvalid(validateDbRows(rows, opts.today))
    return db.transaction('rw', db.allTables(), async () => {
      for (const table of db.allTables()) await table.clear()
      let put = 0
      for (const table of db.allTables()) {
        const list = rows[table.name as keyof DbRows] as unknown[]
        if (list.length) await table.bulkAdd(list)
        put += list.length
      }
      return { put, deleted: 0 }
    })
  })
}

/** True when the database has no match. */
export function isEmpty(db: MatchDb): Promise<RepoResult<boolean>> {
  return run(async () => (await db.matches.count()) === 0)
}
