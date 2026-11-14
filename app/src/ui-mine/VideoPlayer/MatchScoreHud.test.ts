import { describe, expect, it } from 'vitest'
import { parseScorePair } from './MatchScoreHud'

describe('parseScorePair', () => {
  it('parses en-dash and hyphen scorelines', () => {
    expect(parseScorePair('3–5')).toEqual({ player1: 3, player2: 5 })
    expect(parseScorePair('10-8')).toEqual({ player1: 10, player2: 8 })
    expect(parseScorePair(' 0 – 0 ')).toEqual({ player1: 0, player2: 0 })
  })

  it('returns null for empty or malformed', () => {
    expect(parseScorePair(null)).toBeNull()
    expect(parseScorePair('')).toBeNull()
    expect(parseScorePair('won')).toBeNull()
  })
})
