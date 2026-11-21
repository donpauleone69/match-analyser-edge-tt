import { expect, it } from 'vitest'
import { phaseOf } from '../lib/app'

it('lucky counts as a winner', () => {
  expect(phaseOf('me', 1, 'Lucky', 'me') === 'serve' && phaseOf('me', 1, 'Lucky', 'them') === 'receive').toBe(true)
})