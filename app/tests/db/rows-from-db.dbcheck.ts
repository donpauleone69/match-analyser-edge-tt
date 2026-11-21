// Node half of `npm run check:db`: the demo rows Chrome read back from IndexedDB
// (DB_ROWS_FILE) give the seed, pass the invariant catalog and reproduce every
// golden output. Not part of `npm test`; check-db.mjs runs it with its own config.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { INVARIANTS } from '../invariants/catalog'
import { ROW_INVARIANTS } from '../invariants/rows'
import { goldenGlobal, goldenMatch } from '../golden/derive'
import { serialize, syncGolden } from '../golden/serialize'
import { DB_COLUMNS, TABLES, deriveDbRows, deriveListRows, deriveMatchRecords, stableJson, type DbRows } from '../lib/app'
import { SEED, TODAY } from '../lib/fixed'

const file = process.env.DB_ROWS_FILE
if (!file) throw new Error('DB_ROWS_FILE is not set: run npm run check:db')
if (process.env.UPDATE_GOLDEN === '1') throw new Error('check:db never writes golden files')

const NOW = TODAY.getTime()
const ROWS = JSON.parse(readFileSync(file, 'utf8')) as DbRows
const BACK = deriveMatchRecords(ROWS)

function canon(rows: DbRows): string {
  const out: Record<string, unknown[]> = {}
  for (const table of TABLES) {
    const key = (row: object) => String((row as Record<string, unknown>)[DB_COLUMNS[table][0]])
    out[table] = [...(rows[table] as object[])].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0))
  }
  return stableJson(out)
}

it('the rows read from the database are the rows written', () => {
  expect(canon(ROWS)).toBe(canon(deriveListRows(SEED, NOW)))
})

it('they read back as the seed, in seed order', () => {
  expect(BACK.matches.map((m) => m.id)).toEqual(SEED.map((m) => m.id))
  expect(serialize(BACK.matches)).toBe(serialize(SEED))
})

describe('invariant catalog over the matches read from the database', () => {
  for (const inv of INVARIANTS) {
    it(`${inv.id} ${inv.text}`, () => {
      expect(inv.kind).not.toBe('skip')
      const bad = inv.check?.({ matches: BACK.matches, today: TODAY }) ?? [`${inv.id} has no check`]
      expect(bad, bad.slice(0, 20).join('\n')).toEqual([])
    })
  }
})

describe('row invariants over the database rows', () => {
  const ctx = { matches: BACK.matches, rows: ROWS, now: NOW, today: TODAY }
  for (const inv of ROW_INVARIANTS.filter((i) => i.id !== 'I-60')) {
    it(`${inv.id} ${inv.text}`, () => {
      const bad = inv.check(ctx)
      expect(bad, bad.slice(0, 20).join('\n')).toEqual([])
    })
  }
  // I-60 builds rows again with no stored rows, so every match would get one
  // createdAt; the demo seed staggers them (deriveListRows). Same check, with
  // the stored rows as `prev` so their times are kept.
  it('I-60 rows built again from the matches read back, keeping stored times, are the same rows', () => {
    const again = deriveDbRows(BACK.matches, { now: NOW, prev: ROWS, removedVideos: BACK.removedVideos })
    expect(canon(again)).toBe(canon(ROWS))
  })
})

describe('golden outputs from the database rows', () => {
  const same = (rel: string, value: unknown) => {
    const { actual, saved } = syncGolden(rel, value)
    expect(actual).toEqual(saved)
  }
  for (const match of BACK.matches) {
    it(`match ${match.id}`, () => same(`matches/${match.id}.json`, goldenMatch(match, BACK.matches, TODAY)))
  }
  it('global insights', () => same('global.json', goldenGlobal(BACK.matches, TODAY)))
  it('seed sha256', () => {
    const sha256 = createHash('sha256').update(serialize(BACK.matches)).digest('hex')
    same('seed.sha256.json', { sha256 })
  })
})
