/**
 * Good / bad colour for a Hero | Villain comparison row.
 * Pure — no React, no IO.
 *
 * - 'higher': the bigger share is better (points won, winners, serve hold).
 * - 'lower':  the smaller share is better (errors, miss rates).
 * - 'amber':  high is a warning, not a win (points handed over by the opponent).
 * - 'neutral': never coloured (mix rows such as "when points are won").
 *
 * Only the better side is 'good' and the worse side 'bad'. Ties, empty
 * denominators and gaps under minGap stay 'none'.
 */

export type CompareTone = 'good' | 'bad' | 'amber' | 'none'
export type ComparePolarity = 'higher' | 'lower' | 'amber' | 'neutral'

export interface CompareValue {
  share: number
  denominator: number
}

export interface CompareTones {
  hero: CompareTone
  villain: CompareTone
}

const NONE: CompareTones = { hero: 'none', villain: 'none' }

export function deriveCompareTone(
  hero: CompareValue,
  villain: CompareValue,
  polarity: ComparePolarity,
  minGap = 0.05
): CompareTones {
  if (polarity === 'neutral') return NONE
  if (hero.denominator === 0 || villain.denominator === 0) return NONE

  const gap = hero.share - villain.share
  if (Math.abs(gap) < minGap || gap === 0) return NONE

  if (polarity === 'amber') {
    return gap > 0 ? { hero: 'amber', villain: 'none' } : { hero: 'none', villain: 'amber' }
  }

  const heroBetter = polarity === 'higher' ? gap > 0 : gap < 0
  return heroBetter ? { hero: 'good', villain: 'bad' } : { hero: 'bad', villain: 'good' }
}
