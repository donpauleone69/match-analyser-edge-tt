import { describe, expect, it } from 'vitest'
import { parseScorePair, shortPlayerName } from './MatchScoreHud'

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

describe('shortPlayerName', () => {
  it('takes the first token', () => {
    expect(shortPlayerName('Pat Overton')).toBe('Pat')
    expect(shortPlayerName('  Sam  ')).toBe('Sam')
  })

  it('uses fallback when empty', () => {
    expect(shortPlayerName('', 'Hero')).toBe('Hero')
  })
})
