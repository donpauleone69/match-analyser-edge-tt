import { expect, it } from 'vitest'
import { canSaveEarly, isLegalEnd, isSetWon, setOverOnRule } from '../lib/app'
import { scoreFromWinners, winnersSide, withDetailsClause } from '../lib/builders'
import type { Side } from '../lib/app'

const legal: Side[] = [...winnersSide(9, 'them'), ...winnersSide(10, 'me'), 'me']
const deuce: Side[] = [...winnersSide(10, 'me'), ...winnersSide(10, 'them'), 'me', 'me']
const overrun: Side[] = [...winnersSide(11, 'me'), ...winnersSide(9, 'them'), 'me']
const early: Side[] = [...winnersSide(9, 'me'), ...winnersSide(7, 'them')]
const level: Side[] = [...winnersSide(5, 'me'), ...winnersSide(5, 'them')]

it('11 - 9 is a legal end', () => {
  expect(isLegalEnd(scoreFromWinners(legal)) && scoreFromWinners(legal).me === 11 && scoreFromWinners(legal).them === 9).toBe(true)
})
it('12 - 10 is a legal end', () => {
  expect(isLegalEnd(scoreFromWinners(deuce)) && scoreFromWinners(deuce).me === 12 && scoreFromWinners(deuce).them === 10).toBe(true)
})
it('12 - 9 is not a legal end', () => {
  expect(!isLegalEnd({ me: 12, them: 9 }) && isSetWon({ me: 12, them: 9 })).toBe(true)
})
it('11 - 10 is not a legal end', () => {
  expect(!isLegalEnd({ me: 11, them: 10 })).toBe(true)
})
it('9 - 7 is not a legal end', () => {
  expect(!isLegalEnd(scoreFromWinners(early))).toBe(true)
})
it('5 - 5 is not a legal end', () => {
  expect(!isLegalEnd(scoreFromWinners(level))).toBe(true)
})

it('set over at 11 - 9', () => {
  expect(setOverOnRule(legal)).toBe(true)
})
it('set over at 12 - 10', () => {
  expect(setOverOnRule(deuce)).toBe(true)
})
it('overrun is not set over', () => {
  expect(!setOverOnRule(overrun) && isSetWon(scoreFromWinners(overrun))).toBe(true)
})
it('empty is not set over', () => {
  expect(!setOverOnRule([])).toBe(true)
})
it('details match does not save a broken set', () => {
  expect(withDetailsClause(overrun, { me: 12, them: 9 }) && !setOverOnRule(overrun)).toBe(true)
})
it('details differ still sets over on the rule', () => {
  expect(setOverOnRule(legal)).toBe(true)
})

it('9 - 7 can be saved early', () => {
  expect(canSaveEarly(scoreFromWinners(early))).toBe(true)
})
it('5 - 5 is not an early save', () => {
  expect(!canSaveEarly(scoreFromWinners(level))).toBe(true)
})
it('10 - 10 is not an early save', () => {
  expect(!canSaveEarly({ me: 10, them: 10 })).toBe(true)
})