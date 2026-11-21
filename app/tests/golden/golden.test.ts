import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
import { SEED, TODAY } from '../lib/fixed'
import { goldenBestFa, goldenGlobal, goldenMatch } from './derive'
import { serialize, syncGolden } from './serialize'

function same(rel: string, value: unknown) {
  const { actual, saved } = syncGolden(rel, value)
  expect(actual).toEqual(saved)
}

for (const match of SEED) {
  it(`match ${match.id}`, () => {
    same(`matches/${match.id}.json`, goldenMatch(match, SEED, TODAY))
  })
}

it('global insights', () => {
  same('global.json', goldenGlobal(SEED, TODAY))
})

it('best + FA saves', () => {
  same('best-fa-save.json', goldenBestFa())
})

it('seed sha256', () => {
  const sha256 = createHash('sha256').update(serialize(SEED)).digest('hex')
  same('seed.sha256.json', { sha256 })
})
