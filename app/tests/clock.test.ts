import { expect, it } from 'vitest'
import { SEED as appSeed } from './lib/app'
import { NOW } from './lib/clock'
import { SEED } from './lib/fixed'

it('the clock is frozen at NOW', () => {
  expect(new Date().toISOString()).toBe(NOW.toISOString())
})

it('the app seed matches the fixed seed', () => {
  expect(appSeed).toEqual(SEED)
})
