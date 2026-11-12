import { describe, it, expect } from 'vitest'
import { deriveCompareTone } from './deriveCompareTone'

const v = (share: number, denominator = 10) => ({ share, denominator })

describe('deriveCompareTone', () => {
  it('greens the higher side for higher-is-better rows', () => {
    expect(deriveCompareTone(v(0.6), v(0.4), 'higher')).toEqual({ hero: 'good', villain: 'bad' })
  })

  it('inverts for errors (lower is better)', () => {
    expect(deriveCompareTone(v(0.67), v(0.2), 'lower')).toEqual({ hero: 'bad', villain: 'good' })
  })

  it('leaves small gaps, ties and empty denominators uncoloured', () => {
    expect(deriveCompareTone(v(0.5), v(0.52), 'higher')).toEqual({ hero: 'none', villain: 'none' })
    expect(deriveCompareTone(v(0.5), v(0.5), 'lower')).toEqual({ hero: 'none', villain: 'none' })
    expect(deriveCompareTone(v(1, 0), v(0.2), 'higher')).toEqual({ hero: 'none', villain: 'none' })
  })

  it('uses amber only on the higher side for amber rows', () => {
    expect(deriveCompareTone(v(0.3), v(0.9), 'amber')).toEqual({ hero: 'none', villain: 'amber' })
  })

  it('never colours neutral rows', () => {
    expect(deriveCompareTone(v(0.9), v(0.1), 'neutral')).toEqual({ hero: 'none', villain: 'none' })
  })
})
