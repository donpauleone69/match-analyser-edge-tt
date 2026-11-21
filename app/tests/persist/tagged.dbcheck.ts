// Node half of `npm run check:persist`. The rows are a match after six tagged
// rallies, read back from IndexedDB (PERSIST_ROWS_FILE). The invariant catalog
// and the golden derivation run over those rows. Not part of `npm test`.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { INVARIANTS } from '../invariants/catalog'
import { ROW_INVARIANTS } from '../invariants/rows'
import { goldenGlobal, goldenMatch } from '../golden/derive'
import { deriveDbRows, deriveMatchRecords, stableJson, type DbRows } from '../lib/app'
import { TODAY } from '../lib/fixed'

const file = process.env.PERSIST_ROWS_FILE
if (!file) throw new Error('PERSIST_ROWS_FILE is not set: run npm run check:persist')

const NOW = TODAY.getTime()
const ROWS = JSON.parse(readFileSync(file, 'utf8')) as DbRows
const BACK = deriveMatchRecords(ROWS)

function canon(rows: DbRows): string {
  const out: Record<string, unknown[]> = {}
  for (const [table, list] of Object.entries(rows)) {
    const key = table === 'drafts' ? 'setId' : 'id'
    out[table] = [...(list as object[])].sort((a, b) => {
      const ak = String((a as Record<string, unknown>)[key])
      const bk = String((b as Record<string, unknown>)[key])
      return ak < bk ? -1 : ak > bk ? 1 : 0
    })
  }
  return stableJson(out)
}

/**
 * The six-rally script tags m-partial and does not change its entered result,
 * and it puts rallies on videos the seed census did not count. check:db covers
 * those seed counts. Here the only allowed lines are these three.
 */
const KNOWN = new Map<string, string[]>([
  ['I-44 an entered result is a real best of 3, 5 or 7, and a complete match agrees with taggedResult', [
    'm-partial set 0 rally 0 (-): complete result 3-1 tagged 4-0',
  ]],
  ['I-52 a re-added video takes the missing id and position', [
    'seed set 0 rally 0 (-): 28 probes, expected 26',
  ]],
  ['I-53 a new mark that fits is at least 60s and starts in free time', [
    'seed set 0 rally 0 (-): 311 probes, 18 ok, expected 311 probes and 29 ok',
  ]],
])

describe('invariant catalog over the tagged rows', () => {
  for (const inv of INVARIANTS) {
    const name = `${inv.id} ${inv.text}`
    it(name, () => {
      expect(inv.kind).not.toBe('skip')
      const bad = inv.check?.({ matches: BACK.matches, today: TODAY }) ?? [`${inv.id} has no check`]
      expect(bad, bad.slice(0, 20).join('\n')).toEqual(KNOWN.get(name) ?? [])
    })
  }
})

describe('row invariants over the tagged rows', () => {
  const ctx = { matches: BACK.matches, rows: ROWS, now: NOW, today: TODAY }
  for (const inv of ROW_INVARIANTS.filter((item) => item.id !== 'I-60')) {
    it(`${inv.id} ${inv.text}`, () => {
      const bad = inv.check(ctx)
      expect(bad, bad.slice(0, 20).join('\n')).toEqual([])
    })
  }
  // I-60 with no stored rows gives every match one createdAt. The seed staggers
  // them. Same check as check:db: pass the stored rows as `prev`.
  it('I-60 rows built again from the matches read back, keeping stored times, are the same rows', () => {
    const again = deriveDbRows(BACK.matches, { now: NOW, prev: ROWS, removedVideos: BACK.removedVideos })
    expect(canon(again)).toBe(canon(ROWS))
  })
})

describe('golden derivation over the tagged rows', () => {
  it('each match and the global cards derive, and derive the same way twice', () => {
    for (const match of BACK.matches) {
      const once = goldenMatch(match, BACK.matches, TODAY)
      const twice = goldenMatch(match, BACK.matches, TODAY)
      expect(twice).toEqual(once)
    }
    expect(goldenGlobal(BACK.matches, TODAY)).toEqual(goldenGlobal(BACK.matches, TODAY))
  })
})
