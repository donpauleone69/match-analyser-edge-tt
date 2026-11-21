/**
 * What every repository shares: the never-throw result wrapper, reading one
 * match's rows, and writing only the rows that changed.
 */
import type { Table } from 'dexie'
import { stableJson } from '@/rules/dbRows'
import type { DbError, DbRows, EventRow, MatchRow, OpponentRow, RepoError, RepoResult } from '@/types/db'
import type { MatchDb } from './db'

/** Thrown inside a transaction to abort it; `run` turns it back into a result. */
export class Refusal extends Error {
  error: RepoError
  constructor(error: RepoError) {
    super('problem' in error ? error.problem : 'refused')
    this.error = error
  }
}

export function refuse(kind: 'conflict' | 'missing' | 'file', problem: string): never {
  throw new Refusal({ kind, problem })
}

export function refuseInvalid(errors: DbError[]) {
  if (errors.length > 0) throw new Refusal({ kind: 'invalid', errors })
}

/** Runs a repository call. A refusal or a database failure comes back as an error; nothing throws. */
export async function run<T>(fn: () => Promise<T>): Promise<RepoResult<T>> {
  try {
    return { ok: true, value: await fn() }
  } catch (err) {
    if (err instanceof Refusal) return { ok: false, error: err.error }
    const problem = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    return { ok: false, error: { kind: 'storage', problem } }
  }
}

export type ChildRows = Pick<DbRows, 'videos' | 'sets' | 'rallies' | 'shots' | 'drafts'>
export type StoredMatch = { match: MatchRow | undefined; children: ChildRows }

/** One match's row and its videos, sets, rallies, shots and drafts. Call inside a transaction. */
export async function readMatchRows(db: MatchDb, matchId: string): Promise<StoredMatch> {
  const match = await db.matches.get(matchId)
  const videos = await db.videos.where('matchId').equals(matchId).toArray()
  const sets = await db.sets.where('matchId').equals(matchId).toArray()
  const setIds = sets.map((s) => s.id)
  const rallies = setIds.length ? await db.rallies.where('setId').anyOf(setIds).toArray() : []
  const rallyIds = rallies.map((r) => r.id)
  const shots = rallyIds.length ? await db.shots.where('rallyId').anyOf(rallyIds).toArray() : []
  const drafts = setIds.length ? (await db.drafts.bulkGet(setIds)).filter((d) => d !== undefined) : []
  return { match, children: { videos, sets, rallies, shots, drafts } }
}

/** Every row, matches oldest `createdAt` first (the same time: by id). */
export async function readRows(db: MatchDb): Promise<DbRows> {
  return db.transaction('r', db.allTables(), async () => ({
    opponents: await db.opponents.toArray(),
    events: await db.events.toArray(),
    matches: await db.matches.orderBy('createdAt').toArray(),
    videos: await db.videos.toArray(),
    sets: await db.sets.toArray(),
    rallies: await db.rallies.toArray(),
    shots: await db.shots.toArray(),
    drafts: await db.drafts.toArray(),
  }))
}

export type WriteCount = { put: number; deleted: number }

/** Puts the rows that are new or differ, and deletes the stored ones `after` no longer has (when `drop`). */
async function writeDiff<T, K extends string>(
  table: Table<T, K>,
  before: readonly T[],
  after: readonly T[],
  key: (row: T) => K,
  drop: boolean,
): Promise<WriteCount> {
  const stored = new Map(before.map((row) => [key(row), stableJson(row)]))
  const put = after.filter((row) => stored.get(key(row)) !== stableJson(row))
  const keep = new Set(after.map(key))
  const gone = drop ? [...stored.keys()].filter((k) => !keep.has(k)) : []
  if (put.length) await table.bulkPut(put)
  if (gone.length) await table.bulkDelete(gone)
  return { put: put.length, deleted: gone.length }
}

/**
 * Writes one match from `before` to `after`: the match row and its children
 * are replaced (rows gone from `after` are deleted, so a re-saved rally's old
 * shots go), opponents and events are only added or changed. Call inside a
 * transaction over every table, so it all lands or none of it does.
 */
export async function writeMatchRows(db: MatchDb, before: DbRows, after: DbRows): Promise<WriteCount> {
  const id = (row: { id: string }) => row.id
  const counts = [
    await writeDiff(db.opponents, before.opponents, after.opponents, id, false),
    await writeDiff(db.events, before.events, after.events, id, false),
    await writeDiff(db.matches, before.matches, after.matches, id, true),
    await writeDiff(db.videos, before.videos, after.videos, id, true),
    await writeDiff(db.sets, before.sets, after.sets, id, true),
    await writeDiff(db.rallies, before.rallies, after.rallies, id, true),
    await writeDiff(db.shots, before.shots, after.shots, id, true),
    await writeDiff(db.drafts, before.drafts, after.drafts, (d) => d.setId, true),
  ]
  return counts.reduce((sum, c) => ({ put: sum.put + c.put, deleted: sum.deleted + c.deleted }), { put: 0, deleted: 0 })
}

/**
 * Refuses rows of this match whose ids are stored under another parent: a put
 * by id would move that row here. Drafts are keyed by a set id checked here.
 */
export async function refuseForeignIds(db: MatchDb, matchId: string, before: ChildRows, after: ChildRows) {
  const videos = await db.videos.bulkGet(after.videos.map((v) => v.id))
  const video = videos.find((v) => v !== undefined && v.matchId !== matchId)
  if (video) refuse('conflict', `video ${video.id} belongs to match ${video.matchId}`)
  const sets = await db.sets.bulkGet(after.sets.map((s) => s.id))
  const set = sets.find((s) => s !== undefined && s.matchId !== matchId)
  if (set) refuse('conflict', `set ${set.id} belongs to match ${set.matchId}`)
  const ownSets = new Set([...before.sets, ...after.sets].map((s) => s.id))
  const rallies = await db.rallies.bulkGet(after.rallies.map((r) => r.id))
  const rally = rallies.find((r) => r !== undefined && !ownSets.has(r.setId))
  if (rally) refuse('conflict', `rally ${rally.id} belongs to set ${rally.setId}`)
  const ownRallies = new Set([...before.rallies, ...after.rallies].map((r) => r.id))
  const shots = await db.shots.bulkGet(after.shots.map((s) => s.id))
  const shot = shots.find((s) => s !== undefined && !ownRallies.has(s.rallyId))
  if (shot) refuse('conflict', `shot ${shot.id} belongs to rally ${shot.rallyId}`)
}

const bareOpponent = (o: OpponentRow) => [o.club, o.handedness, o.style, o.birthYear, o.notes].every((v) => v === null)
const bareEvent = (e: EventRow) => [e.location, e.rankingStatus, e.importance].every((v) => v === null)

/**
 * After a match's opponent or event link changed: the row it used to link to
 * is deleted when no match links to it now and nothing but its name was
 * entered. So committing "Bo" then "Bob" leaves one row. Returns rows deleted.
 */
export async function dropUnlinkedNames(db: MatchDb, before: MatchRow | undefined, after: MatchRow | undefined): Promise<number> {
  let deleted = 0
  const was = before?.opponentId ?? null
  if (was !== null && was !== (after?.opponentId ?? null) && (await db.matches.where('opponentId').equals(was).count()) === 0) {
    const row = await db.opponents.get(was)
    if (row && bareOpponent(row)) {
      await db.opponents.delete(was)
      deleted += 1
    }
  }
  const wasEvent = before?.eventId ?? null
  if (wasEvent !== null && wasEvent !== (after?.eventId ?? null) && (await db.matches.where('eventId').equals(wasEvent).count()) === 0) {
    const row = await db.events.get(wasEvent)
    if (row && bareEvent(row)) {
      await db.events.delete(wasEvent)
      deleted += 1
    }
  }
  return deleted
}

/** Moves a match's `updatedAt` to now when one of its rows was written on its own. */
export async function touchMatch(db: MatchDb, matchId: string, now: number) {
  const match = await db.matches.get(matchId)
  if (match && match.updatedAt < now) await db.matches.update(matchId, { updatedAt: now })
}
