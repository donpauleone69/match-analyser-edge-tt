/**
 * One match as a JSON backup file, built from its rows. Import reads the
 * file back: it refuses a file it cannot read or a row a validator refuses,
 * links the opponent and event to a stored row with the same name (ignoring
 * case) or adds the file's row, and replaces a stored match with the same id.
 * Every other id is kept, so export then import gives the same rows.
 */
import { deriveNameKey } from '@/rules/dbRows'
import { validateDbRows } from '@/rules/dbValidate'
import {
  DB_COLUMNS,
  MATCH_FILE_FORMAT,
  SCHEMA_VERSION,
  type DbRows,
  type DbTable,
  type EventRow,
  type MatchFile,
  type OpponentRow,
  type RepoResult,
} from '@/types/db'
import type { MatchDb } from './db'
import { createRowId } from './ids'
import { dropUnlinkedNames, readMatchRows, refuse, refuseForeignIds, refuseInvalid, run, writeMatchRows, type ChildRows } from './repo'

const byKey = <T>(key: (row: T) => string) => (a: T, b: T) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0)
const byId = byKey<{ id: string }>((r) => r.id)

/** The file for one stored match. */
export function exportMatchFile(db: MatchDb, matchId: string, opts: { now?: number } = {}): Promise<RepoResult<MatchFile>> {
  const exportedAt = opts.now ?? Date.now()
  return run(() =>
    db.transaction('r', db.allTables(), async () => {
      const { match, children } = await readMatchRows(db, matchId)
      if (!match) refuse('missing', `match ${matchId} is not stored`)
      return {
        format: MATCH_FILE_FORMAT,
        schemaVersion: SCHEMA_VERSION,
        exportedAt,
        match,
        opponent: match.opponentId ? ((await db.opponents.get(match.opponentId)) ?? null) : null,
        event: match.eventId ? ((await db.events.get(match.eventId)) ?? null) : null,
        videos: [...children.videos].sort(byId),
        sets: [...children.sets].sort(byId),
        rallies: [...children.rallies].sort(byId),
        shots: [...children.shots].sort(byId),
        drafts: [...children.drafts].sort(byKey((d) => d.setId)),
      } satisfies MatchFile
    }),
  )
}

export function serializeMatchFile(file: MatchFile): string {
  return JSON.stringify(file)
}

/** `edge-tt-match-<date>-<opponent>.json`, letters, digits and dashes only. */
export function deriveMatchFileName(file: MatchFile): string {
  const slug = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  const parts = ['edge-tt-match', file.match.playedOn ?? '', slug(file.opponent?.name ?? '')].filter(Boolean)
  return `${parts.join('-') || 'edge-tt-match'}.json`
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const LISTS = ['videos', 'sets', 'rallies', 'shots', 'drafts'] as const

/** The file's shape, before any row is checked. Refuses what is not a schema v1 match file. */
function readFile(text: string): MatchFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    refuse('file', 'not a JSON file')
  }
  if (!isObject(data) || data.format !== MATCH_FILE_FORMAT) refuse('file', 'not a match file')
  if (data.schemaVersion !== SCHEMA_VERSION) {
    const newer = typeof data.schemaVersion === 'number' && data.schemaVersion > SCHEMA_VERSION
    refuse('file', newer ? `made by a newer app (schema ${data.schemaVersion})` : 'not a schema 1 match file')
  }
  if (!isObject(data.match) || typeof data.match.id !== 'string') refuse('file', 'no match row')
  for (const key of ['opponent', 'event'] as const) {
    if (data[key] !== null && !isObject(data[key])) refuse('file', `${key} is not a row`)
  }
  for (const key of LISTS) {
    if (!Array.isArray(data[key]) || !(data[key] as unknown[]).every(isObject)) refuse('file', `${key} is not a list of rows`)
  }
  const file = data as unknown as MatchFile
  const rows: [DbTable, object[]][] = [
    ['matches', [file.match]],
    ['opponents', file.opponent ? [file.opponent] : []],
    ['events', file.event ? [file.event] : []],
    ...LISTS.map((key): [DbTable, object[]] => [key, file[key]]),
  ]
  for (const [table, list] of rows) {
    const columns = new Set<string>(DB_COLUMNS[table])
    const extra = list.flatMap((row) => Object.keys(row).filter((k) => !columns.has(k)))
    if (extra.length) refuse('file', `${table} has fields schema ${SCHEMA_VERSION} does not: ${[...new Set(extra)].join(', ')}`)
  }
  return file
}

/** Every row of the file belongs to its match: links point inside the file. */
function refuseStrayRows(file: MatchFile) {
  const id = file.match.id
  const setIds = new Set(file.sets.map((s) => s.id))
  const rallyIds = new Set(file.rallies.map((r) => r.id))
  const stray =
    file.videos.some((v) => v.matchId !== id) ||
    file.sets.some((s) => s.matchId !== id) ||
    file.rallies.some((r) => !setIds.has(r.setId)) ||
    file.shots.some((s) => !rallyIds.has(s.rallyId)) ||
    file.drafts.some((d) => !setIds.has(d.setId)) ||
    file.match.opponentId !== (file.opponent?.id ?? null) ||
    file.match.eventId !== (file.event?.id ?? null)
  if (stray) refuse('file', 'rows that do not belong to the match')
}

type Named = OpponentRow | EventRow

/** The stored row with the file row's name, or the file row (under a new id when its id is taken). */
function relink<T extends Named>(stored: T[], row: T | null, prefix: string, now: number): { id: string | null; add: T | null } {
  if (!row) return { id: null, add: null }
  const same = stored.find((r) => deriveNameKey(r.name) === deriveNameKey(row.name))
  if (same) return { id: same.id, add: null }
  const taken = stored.some((r) => r.id === row.id)
  const add = taken ? { ...row, id: createRowId(prefix, now) } : row
  return { id: add.id, add }
}

export type ImportSummary = { matchId: string; replaced: boolean; put: number; deleted: number }

/** Reads a match file into the database in one transaction, or refuses it and writes nothing. */
export function importMatchFile(db: MatchDb, text: string, opts: { now?: number; today?: Date } = {}): Promise<RepoResult<ImportSummary>> {
  const now = opts.now ?? Date.now()
  return run(async () => {
    const file = readFile(text)
    refuseStrayRows(file)
    const children: ChildRows = { videos: file.videos, sets: file.sets, rallies: file.rallies, shots: file.shots, drafts: file.drafts }
    const fileRows: DbRows = {
      opponents: file.opponent ? [file.opponent] : [],
      events: file.event ? [file.event] : [],
      matches: [file.match],
      ...children,
    }
    refuseInvalid(validateDbRows(fileRows, opts.today))

    return db.transaction('rw', db.allTables(), async () => {
      const opponents = await db.opponents.toArray()
      const events = await db.events.toArray()
      const opponent = relink(opponents, file.opponent, 'o', now)
      const event = relink(events, file.event, 'e', now)
      const match = { ...file.match, opponentId: opponent.id, eventId: event.id }
      const stored = await readMatchRows(db, match.id)
      await refuseForeignIds(db, match.id, stored.children, children)
      const before: DbRows = { opponents, events, matches: stored.match ? [stored.match] : [], ...stored.children }
      const after: DbRows = {
        opponents: opponent.add ? [...opponents, opponent.add] : opponents,
        events: event.add ? [...events, event.add] : events,
        matches: [match],
        ...children,
      }
      const count = await writeMatchRows(db, before, after)
      count.deleted += await dropUnlinkedNames(db, stored.match, match)
      return { matchId: match.id, replaced: stored.match !== undefined, ...count }
    })
  })
}