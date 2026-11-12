import { describe, expect, it } from 'vitest'
import {
  canOpenMatchReview,
  isMatchLibraryPath,
  isTrainingLibraryPath,
} from './canOpenMatchReview'

describe('canOpenMatchReview', () => {
  it('opens a match with no tournament and opponent only as a label', () => {
    expect(
      canOpenMatchReview({
        player1_id: 'hero-a',
        tournament_id: null,
        player2_id: null,
      })
    ).toBe(true)
  })

  it('rejects a match without a focal player', () => {
    expect(
      canOpenMatchReview({
        player1_id: '',
        tournament_id: 't1',
        player2_id: 'opp',
      })
    ).toBe(false)
  })
})

describe('library path kinds', () => {
  it('keeps Training out of the match path', () => {
    expect(isTrainingLibraryPath('/training')).toBe(true)
    expect(isTrainingLibraryPath('/training/compare')).toBe(true)
    expect(isTrainingLibraryPath('/matches')).toBe(false)
    expect(isMatchLibraryPath('/matches/abc')).toBe(true)
    expect(isMatchLibraryPath('/training')).toBe(false)
  })
})
