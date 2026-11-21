import { expect, it } from 'vitest'
import { INVARIANTS } from './catalog'
import { SEED, TODAY } from '../lib/fixed'

const ctx = { matches: SEED, today: TODAY }

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
