import { expect, it } from 'vitest'
import { goldenBestFa } from '../golden/derive'
import { syncGolden } from '../golden/serialize'
import { bestFaViolations } from '../invariants/catalog'
import { winnerOf } from '../lib/app'

const saved = goldenBestFa()

for (const item of saved) {
  it(`${item.name} keeps I-5 to I-10`, () => {
    const bad = bestFaViolations(item.rally, item.name)
    expect(bad, bad.slice(0, 20).join('\n')).toEqual([])
    if (item.name === 'n=1 Winner') expect(item.rally.idea?.result).toBe('Ace')
    if (item.name === 'n=1 Net') expect(item.rally.idea?.result).toBe('Serve fault')
    if (item.name === 'n=4 FA at 3') expect(item.rally.fa).toBe(3)
    if (item.name === 'n=6 no attack') expect(item.rally.fa).toBeNull()
    if (item.name === 'n=9 FA at 2') expect(item.rally.fa).toBe(2)
    if (item.name === 'rally one server them') expect(item.rally.server).toBe('them')
    if (item.name === 'Point to against End') {
      expect(item.rally.idea?.check).toBe('Check the point')
      expect(item.rally.winner).not.toBe(winnerOf(item.rally))
    }
  })
}

it('best + FA saves match the golden file', () => {
  const { actual, saved: file } = syncGolden('best-fa-save.json', saved)
  expect(actual).toEqual(file)
})
