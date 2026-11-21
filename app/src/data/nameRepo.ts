/**
 * Opponent and event rows. A match links to one by id, so a rename shows on
 * every match that links to it. Names are trimmed and unique ignoring case.
 * Linking a typed name to a row, or making one, happens in `saveMatch`.
 */
import { deriveNameKey } from '@/rules/dbRows'
import { validateEventRow, validateOpponentRow } from '@/rules/dbValidate'
import type { DbError, EventRow, OpponentRow, RepoResult } from '@/types/db'
import type { MatchDb } from './db'
import { refuse, refuseInvalid, run } from './repo'

type NameTable = 'opponents' | 'events'

const LINK = { opponents: 'opponentId', events: 'eventId' } as const
const WORD = { opponents: 'opponent', events: 'event' } as const

function validateNamed(table: NameTable, row: OpponentRow | EventRow, today?: Date): DbError[] {
  return table === 'opponents' ? validateOpponentRow(row as OpponentRow, today) : validateEventRow(row as EventRow)
}

/** The ids of the matches that link to the row. */
async function linkedMatchIds(db: MatchDb, table: NameTable, id: string): Promise<string[]> {
  return db.matches.where(LINK[table]).equals(id).primaryKeys()
}

function rename(db: MatchDb, table: NameTable, id: string, name: string, now: number, today?: Date) {
  return run(() =>
    db.transaction('rw', [db.table(table), db.matches], async () => {
      const rows = (await db.table(table).toArray()) as (OpponentRow | EventRow)[]
      const row = rows.find((r) => r.id === id)
      if (!row) refuse('missing', `${WORD[table]} ${id} is not stored`)
      const next = { ...row, name: name.trim(), updatedAt: Math.max(now, row.createdAt) }
      refuseInvalid(validateNamed(table, next, today))
      const clash = rows.find((r) => r.id !== id && deriveNameKey(r.name) === deriveNameKey(next.name))
      if (clash) refuse('conflict', `${next.name} is already the ${WORD[table]} ${clash.name}`)
      await db.table(table).put(next)
      return { matchIds: await linkedMatchIds(db, table, id) }
    }),
  )
}

function remove(db: MatchDb, table: NameTable, id: string) {
  return run(() =>
    db.transaction('rw', [db.table(table), db.matches], async () => {
      const used = await linkedMatchIds(db, table, id)
      if (used.length) refuse('conflict', `${used.length} match${used.length === 1 ? '' : 'es'} link to this ${WORD[table]}`)
      await db.table(table).delete(id)
    }),
  )
}

/** Renames an opponent; every match that links to it shows the new name. Returns those matches. */
export function renameOpponent(db: MatchDb, id: string, name: string, opts: { now?: number; today?: Date } = {}): Promise<RepoResult<{ matchIds: string[] }>> {
  return rename(db, 'opponents', id, name, opts.now ?? Date.now(), opts.today)
}

export function renameEvent(db: MatchDb, id: string, name: string, opts: { now?: number } = {}): Promise<RepoResult<{ matchIds: string[] }>> {
  return rename(db, 'events', id, name, opts.now ?? Date.now())
}

/** Removes an opponent no match links to. Refused while one does. */
export function removeOpponent(db: MatchDb, id: string): Promise<RepoResult<void>> {
  return remove(db, 'opponents', id)
}

export function removeEvent(db: MatchDb, id: string): Promise<RepoResult<void>> {
  return remove(db, 'events', id)
}
