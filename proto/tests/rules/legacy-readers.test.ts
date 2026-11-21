import { expect, it } from 'vitest'
import { gradeOf, phaseOf } from '../lib/app'

it('lucky counts as a winner', () => {
  expect(phaseOf('me', 1, 'Lucky', 'me') === 'serve' && phaseOf('me', 1, 'Lucky', 'them') === 'receive').toBe(true)
})
it('grade uses the shown percent', () => {
  expect(gradeOf('serve', 13, 21)).toBe('Good')
})
it('grade under the shown percent stays Pass', () => {
  expect(gradeOf('serve', 12, 21)).toBe('Pass')
})