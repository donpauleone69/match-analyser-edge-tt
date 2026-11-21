import { expect, it } from 'vitest'
import { emptySet, formatMatchDate, matchName, matchResultLine, matchRowLine, matchRowStatus, taggedResultReady } from '../lib/app'
import { matchRecord, openSet, video, wonSet } from '../lib/builders'
import { TODAY } from '../lib/fixed'
import type { SetData } from '../lib/app'

it('date this year', () => {
  expect(formatMatchDate('2026-11-11', TODAY)).toBe('11 Nov')
})
it('date another year', () => {
  expect(formatMatchDate('2025-10-04', TODAY)).toBe('4 Oct 2025')
})
it('no date', () => {
  expect(formatMatchDate('', TODAY)).toBe('')
})
it('won', () => {
  expect(matchResultLine(matchRecord({ result: { me: 3, them: 1 } }))).toBe('Won 3 - 1')
})
it('lost', () => {
  expect(matchResultLine(matchRecord({ result: { me: 1, them: 3 } }))).toBe('Lost 1 - 3')
})
it('level', () => {
  expect(matchResultLine(matchRecord({ result: { me: 2, them: 2 } }))).toBe('2 - 2')
})
it('no result line', () => {
  expect(matchResultLine(matchRecord())).toBe('')
})

const named = matchRecord({
  opponent: 'Sam',
  event: 'Club night',
  date: '2026-11-11',
  result: { me: 3, them: 1 },
})
it('name is the opponent', () => {
  expect(matchName(named)).toBe('vs Sam')
})
it('event is last', () => {
  expect(matchRowLine(named)).toBe('11 Nov · Won 3 - 1 · Club night')
})
it('event is the name', () => {
  expect(matchName(matchRecord({ event: 'Club night' }))).toBe('Club night')
})
it('event stays off line 2', () => {
  expect(matchRowLine(matchRecord({ event: 'Club night', date: '2026-11-11' }))).toBe('11 Nov')
})
it('new match', () => {
  expect(matchName(matchRecord())).toBe('New match')
})
it('unnamed once there is video', () => {
  expect(matchName(matchRecord({ videos: [video('v')] }))).toBe('Unnamed match')
})

const fresh = matchRecord()
it('no video', () => {
  const s = matchRowStatus(fresh)
  expect(s.text === 'No video' && s.tab === 'tag').toBe(true)
})

const ready = matchRecord({ opponent: 'Kim', videos: [video('v')] })
it('not tagged', () => {
  const s = matchRowStatus(ready)
  expect(s.text === 'Not tagged' && s.tab === 'tag').toBe(true)
})

const tagging = matchRecord({
  opponent: 'Sam',
  videos: [video('v')],
  sets: [wonSet(1), openSet(2)],
  result: { me: 3, them: 1 },
})
it('continue wins', () => {
  const s = matchRowStatus(tagging)
  expect(s.kind === 'continue' && s.text === 'Continue set 2' && s.setId === 2 && s.tab === 'tag').toBe(true)
})

const readyResult = matchRecord({
  videos: [video('v')],
  sets: [wonSet(1), wonSet(2)],
})
it('tagged result ready', () => {
  expect(taggedResultReady(readyResult)).toBe(true)
})
it('no result', () => {
  const s = matchRowStatus(readyResult)
  expect(s.text === 'No result' && s.tab === 'details' && s.kind === 'no-result').toBe(true)
})

const stillOpen = matchRecord({
  videos: [video('v')],
  sets: [wonSet(1), wonSet(2), openSet(3)],
})
it('continue before no result', () => {
  const s = matchRowStatus(stillOpen)
  expect(s.kind === 'continue' && s.setId === 3).toBe(true)
})

const archived = matchRecord({
  videos: [video('v', true)],
  sets: [wonSet(1), wonSet(2), openSet(3)],
})
it('archived has no continue', () => {
  expect(matchRowStatus(archived).kind === 'no-result').toBe(true)
})

const part = matchRecord({
  videos: [video('v')],
  sets: [
    {
      ...emptySet(1),
      finished: true,
      rallies: [{ winner: 'me' } as SetData['rallies'][number]],
    },
  ],
})
it('part tagged', () => {
  const s = matchRowStatus(part)
  expect(s.text === 'Part tagged' && s.tab === 'tag').toBe(true)
})

const tagged = matchRecord({
  opponent: 'Pat',
  videos: [video('v')],
  sets: [wonSet(1), wonSet(2)],
  result: { me: 2, them: 0 },
  tagDone: true,
})
it('tagged', () => {
  const s = matchRowStatus(tagged)
  expect(s.text === 'Tagged' && s.tab === 'insights').toBe(true)
})