import { describe, expect, it } from 'vitest'
import { INVARIANTS, bestFaViolations, type InvariantCtx } from './catalog'
import { ROW_INVARIANTS } from './rows'
import { deriveDbRows, deriveMatchRecords, type RallyData } from '../lib/app'
import { SEED, TODAY } from '../lib/fixed'
import { goldenBestFa } from '../golden/derive'

const NOW = TODAY.getTime()
const ROWS = deriveDbRows(SEED, { now: NOW })
const SEED_CTX: InvariantCtx = { matches: SEED, today: TODAY }
const ROWS_CTX: InvariantCtx = { matches: deriveMatchRecords(ROWS).matches, today: TODAY }

const ids = [
  'I-1',
  'I-2',
  'I-3',
  'I-4',
  'I-5',
  'I-6',
  'I-7',
  'I-8',
  'I-9',
  'I-10',
  'I-11',
  'I-12',
  'I-20',
  'I-21',
  'I-22',
  'I-23',
  'I-24',
  'set-states',
  'I-30',
  'I-31',
  'I-32',
  'I-33',
  'I-34',
  'I-40',
  'I-41',
  'I-42',
  'I-43',
  'I-44',
  'I-50',
  'I-51',
  'I-52',
  'I-52',
  'I-53',
  'I-54',
  'I-55',
  'I-56',
  'I-57',
]

it('the catalog lists I-1 to I-57, and skips none', () => {
  expect(INVARIANTS.map((inv) => inv.id)).toEqual(ids)
  const skipped = INVARIANTS.filter((inv) => inv.kind === 'skip')
  expect(skipped.map((inv) => inv.id)).toEqual([])
})

it('the row invariants are I-58 to I-61', () => {
  expect(ROW_INVARIANTS.map((inv) => inv.id)).toEqual(['I-58', 'I-59', 'I-60', 'I-61'])
})

function runCatalog(ctx: InvariantCtx) {
  for (const inv of INVARIANTS) {
    const name = `${inv.id} ${inv.text}`
    if (inv.kind === 'skip') {
      it.skip(`${name} (skipped: ${inv.reason})`, () => {})
      continue
    }
    it(name, () => {
      const bad = inv.check?.(ctx) ?? [`${inv.id} has no check`]
      expect(bad, bad.slice(0, 20).join('\n')).toEqual([])
    })
  }
}

runCatalog(SEED_CTX)

describe('over the matches read back from rows built from the seed', () => {
  runCatalog(ROWS_CTX)
})

describe('over the rows built from the seed', () => {
  for (const inv of ROW_INVARIANTS) {
    it(`${inv.id} ${inv.text}`, () => {
      const bad = inv.check({ matches: SEED, rows: ROWS, now: NOW, today: TODAY })
      expect(bad, bad.slice(0, 20).join('\n')).toEqual([])
    })
  }
})

describe('I-6 takes Defence', () => {
  const saved = goldenBestFa().find((g) => g.name === 'n=6 no attack')!.rally
  const withStroke = (stroke: string): RallyData => ({
    ...saved,
    shots: saved.shots.map((s, i) => (i === 2 ? { ...s, stroke } : s)),
  })
  it('a Defence shot is in the key sets', () => {
    expect(bestFaViolations(withStroke('Defence'), 'defence')).toEqual([])
  })
  it('an old stroke name is not', () => {
    expect(bestFaViolations(withStroke('Loop'), 'loop').some((line) => line.includes('shot 3'))).toBe(true)
  })
})
