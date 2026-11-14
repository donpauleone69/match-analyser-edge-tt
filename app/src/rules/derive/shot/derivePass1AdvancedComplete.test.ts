import { describe, it, expect } from 'vitest'
import { derivePass1AdvancedDataComplete } from './derivePass1AdvancedComplete'

describe('derivePass1AdvancedDataComplete', () => {
  it('is false when advanced choice fields are empty (basic-only save)', () => {
    expect(
      derivePass1AdvancedDataComplete({
        end: 4,
        fos: 3,
        shots: {
          1: {},
          2: {},
          3: { wing: 'FH', stroke: 'Loop' },
          4: { wing: 'BH', stroke: 'Block', standing: 'level' },
        },
      })
    ).toBe(false)
  })

  it('is true when phase optionals are filled for a short attack rally (MA-77)', () => {
    expect(
      derivePass1AdvancedDataComplete({
        end: 3,
        fos: 3,
        shots: {
          1: {
            spin: 'under',
            depth: 'short',
          },
          2: {
            wing: 'BH',
            depth: 'long',
          },
          3: {
            wing: 'FH',
            stroke: 'Loop',
            tableContact: 'over_table',
          },
        },
      })
    ).toBe(true)
  })

  it('does not require placement or quality (MA-77)', () => {
    expect(
      derivePass1AdvancedDataComplete({
        end: 2,
        fos: 2,
        shots: {
          1: { spin: 'top', depth: 'half' },
          2: {
            wing: 'FH',
            stroke: 'Flick',
            tableContact: 'over_table',
          },
        },
      })
    ).toBe(true)
  })

  it('requires initiative on reply when allow-listed', () => {
    const base = {
      end: 4,
      fos: 2,
      shots: {
        1: { spin: 'top', depth: 'half' },
        2: {
          wing: 'FH',
          stroke: 'Flick',
          tableContact: 'over_table',
        },
        3: { wing: 'BH', stroke: 'Block' },
        4: { wing: 'FH', stroke: 'Drive' },
      },
    }
    expect(derivePass1AdvancedDataComplete(base)).toBe(false)
    expect(
      derivePass1AdvancedDataComplete({
        ...base,
        shots: {
          ...base.shots,
          3: { wing: 'BH', stroke: 'Block', standing: 'ahead' },
        },
      })
    ).toBe(true)
  })

  it('serve-only needs serve optionals only (no placement)', () => {
    expect(
      derivePass1AdvancedDataComplete({
        end: 1,
        fos: null,
        shots: { 1: {} },
      })
    ).toBe(false)
    expect(
      derivePass1AdvancedDataComplete({
        end: 1,
        fos: null,
        shots: {
          1: { spin: 'side', depth: 'long' },
        },
      })
    ).toBe(true)
  })
})
