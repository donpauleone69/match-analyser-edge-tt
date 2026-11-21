import { expect, it } from 'vitest'
import {
  defaultMatchTab,
  derivePhase,
  emptySet,
  formatScore,
  formatSize,
  hasTaggedRallies,
  isArchived,
  isMatchTagged,
  isSpareSet,
  isUntouched,
  matchSetsWon,
  matchTitle,
  missingVideoIds,
  parseEntered,
  resultDiffers,
  resultSetCount,
  setRalliesWithoutVideo,
  setScoresDiffer,
  taggedResult,
  taggedScore,
  todayDate,
  SEED,
  type MatchRecord,
} from '../lib/app'
import { matchRecord } from '../lib/builders'

const byId = (id: string) => SEED.find((match) => match.id === id)!

it('todayDate is the fixed day', () => {
  expect(todayDate()).toBe('2026-11-21')
})

it('formatScore joins the two sides', () => {
  expect(formatScore({ me: 11, them: 9 })).toBe('11 - 9')
})

it('formatSize uses MB until 1000', () => {
  expect(formatSize(12)).toBe('12 MB')
  expect(formatSize(1500)).toBe('1.5 GB')
})

it('parseEntered reads both boxes', () => {
  expect(parseEntered({ me: '11', them: '8' })).toEqual({ me: 11, them: 8 })
  expect(parseEntered({ me: '', them: '8' })).toBeNull()
})

it('emptySet is an untagged set and later sets switch the server', () => {
  const set = emptySet(2)
  expect(set.setId).toBe(2)
  expect(set.rallies).toEqual([])
  expect(set.draft).toBeNull()
  expect(set.mark).toBeNull()
  expect(set.firstServer).toBe('them')
  expect(taggedScore(set)).toBeNull()
  expect(setScoresDiffer(set)).toBe(false)
})

it('a blank match is untouched and its only set is spare', () => {
  const match = matchRecord({ date: todayDate() })
  expect(isUntouched(match)).toBe(true)
  expect(isSpareSet(match, match.sets[0])).toBe(true)
  expect(isUntouched(matchRecord({ opponent: 'Sam' }))).toBe(false)
})

it('m-complete is titled, tagged and won 3 - 2', () => {
  const match = byId('m-complete')
  expect(matchTitle(match)).toBe('League final vs Pat')
  expect(derivePhase(match)).toBe('complete')
  expect(hasTaggedRallies(match)).toBe(true)
  expect(isMatchTagged(match)).toBe(true)
  expect(isArchived(match)).toBe(false)
  expect(resultSetCount(match)).toBe(5)
  expect(matchSetsWon(match)).toEqual({ me: 3, them: 2 })
  expect(taggedResult(match)).toEqual({ me: 3, them: 2 })
  expect(resultDiffers(match)).toBe(false)
  expect(defaultMatchTab(derivePhase(match))).toBe('insights')
  expect(defaultMatchTab('new')).toBe('tag')
})

it('m-new opens on Tag and m-h10 is the archived copy', () => {
  expect(derivePhase(byId('m-new'))).toBe('new')
  expect(hasTaggedRallies(byId('m-new'))).toBe(false)
  expect(isArchived(byId('m-h10'))).toBe(true)
})

it('missingVideoIds lists a rally whose video was removed', () => {
  const rally = { videoId: 'gone' } as MatchRecord['sets'][number]['rallies'][number]
  const match = matchRecord({
    videos: [],
    sets: [{ ...emptySet(1), rallies: [rally] }],
  })
  expect(missingVideoIds(match)).toEqual(['gone'])
  expect(setRalliesWithoutVideo(match, match.sets[0])).toBe(1)
})
