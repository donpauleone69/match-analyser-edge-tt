import { describe, it, expect } from 'vitest'
import { derivePointEndClass } from './derivePointEndClass'

describe('derivePointEndClass', () => {
  it('classifies shot-1 errors as service faults', () => {
    expect(derivePointEndClass(1, 'error_net')).toBe('service_fault')
    expect(derivePointEndClass(1, 'error_long')).toBe('service_fault')
    expect(derivePointEndClass(1, 'error_wide')).toBe('service_fault')
  })

  it('classifies shot-2 errors as receive errors', () => {
    expect(derivePointEndClass(2, 'error_net')).toBe('receive_error')
    expect(derivePointEndClass(2, 'error_long')).toBe('receive_error')
    expect(derivePointEndClass(2, 'error_wide')).toBe('receive_error')
  })

  it('passes through later errors and non-errors', () => {
    expect(derivePointEndClass(3, 'error_net')).toBe('error_net')
    expect(derivePointEndClass(5, 'error_long')).toBe('error_long')
    expect(derivePointEndClass(4, 'error_wide')).toBe('error_wide')
    expect(derivePointEndClass(1, 'winner')).toBe('winner')
    expect(derivePointEndClass(4, 'lucky')).toBe('lucky')
  })
})
