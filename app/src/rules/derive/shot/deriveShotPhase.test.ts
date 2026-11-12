import { describe, it, expect } from 'vitest'
import { deriveShotPhase } from './deriveShotPhase'

describe('deriveShotPhase', () => {
  it('marks shot 1 as serve', () => {
    expect(deriveShotPhase(1, 3)).toBe('serve')
    expect(deriveShotPhase(1, null)).toBe('serve')
  })

  it('marks every later shot as pre_offensive when there is no attack', () => {
    expect(deriveShotPhase(2, null)).toBe('pre_offensive')
    expect(deriveShotPhase(5, null)).toBe('pre_offensive')
  })

  it('uses first_attack_index for offensive phases', () => {
    expect(deriveShotPhase(2, 4)).toBe('pre_offensive')
    expect(deriveShotPhase(3, 4)).toBe('pre_offensive')
    expect(deriveShotPhase(4, 4)).toBe('first_offensive')
    expect(deriveShotPhase(5, 4)).toBe('fos_plus_1')
    expect(deriveShotPhase(6, 4)).toBe('fos_plus_2')
    expect(deriveShotPhase(7, 4)).toBe('continuation')
  })

  it('treats invalid first_attack_index (< 2) like no attack', () => {
    expect(deriveShotPhase(3, 1)).toBe('pre_offensive')
    expect(deriveShotPhase(3, 0)).toBe('pre_offensive')
  })
})
