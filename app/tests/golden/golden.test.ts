import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { deriveDbRows, deriveMatchRecords, type MatchRecord } from '../lib/app'
import { SEED, TODAY } from '../lib/fixed'
import { goldenBestFa, goldenGlobal, goldenMatch } from './derive'
import { serialize, syncGolden } from './serialize'

function same(rel: string, value: unknown) {
  const { actual, saved } = syncGolden(rel, value)
  expect(actual).toEqual(saved)
}

function goldenSuite(all: MatchRecord[]) {
  for (const match of all) {
    it(`match ${match.id}`, () => {
      same(`matches/${match.id}.json`, goldenMatch(match, all, TODAY))
    })
  }

  it('global insights', () => {
    same('global.json', goldenGlobal(all, TODAY))
  })

  it('seed sha256', () => {
    const sha256 = createHash('sha256').update(serialize(all)).digest('hex')
    same('seed.sha256.json', { sha256 })
  })
}

goldenSuite(SEED)

it('best + FA saves', () => {
  same('best-fa-save.json', goldenBestFa())
})

describe('from rows built from the seed', () => {
  const back = deriveMatchRecords(deriveDbRows(SEED, { now: TODAY.getTime() })).matches
  it('reads back all fourteen matches', () => {
    expect(back.map((m) => m.id)).toEqual(SEED.map((m) => m.id))
  })
  goldenSuite(back)
})
