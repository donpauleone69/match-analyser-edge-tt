import { describe, it, expect } from 'vitest'
import {
  allowInitiativeForLaterShot,
  allowListForRole,
  deriveShotTagRole,
} from './deriveShotTagRole'

describe('deriveShotTagRole', () => {
  it('labels serve, pre-offensive, attack, and later', () => {
    expect(deriveShotTagRole(1, 4)).toBe('serve')
    expect(deriveShotTagRole(2, 4)).toBe('pre_offensive')
    expect(deriveShotTagRole(3, 4)).toBe('pre_offensive')
    expect(deriveShotTagRole(4, 4)).toBe('first_attack')
    expect(deriveShotTagRole(5, 4)).toBe('later')
  })

  it('treats all post-serve shots as pre-offensive when no attack', () => {
    expect(deriveShotTagRole(2, null)).toBe('pre_offensive')
    expect(deriveShotTagRole(5, null)).toBe('pre_offensive')
  })
})

describe('allowListForRole', () => {
  it('gives attributes to serve/pre and quality to attack only', () => {
    expect(allowListForRole('serve').attributes).toBe(true)
    expect(allowListForRole('serve').shot_quality).toBe(false)
    expect(allowListForRole('pre_offensive').attributes).toBe(true)
    expect(allowListForRole('first_attack').shot_quality).toBe(true)
    expect(allowListForRole('first_attack').attributes).toBe(false)
    expect(allowListForRole('later').attributes).toBe(false)
    expect(allowListForRole('later').shot_quality).toBe(false)
  })
})

describe('allowInitiativeForLaterShot', () => {
  it('allows reply and next while the point continues', () => {
    expect(allowInitiativeForLaterShot(3, 2, 5)).toBe(true)
    expect(allowInitiativeForLaterShot(4, 2, 5)).toBe(true)
    expect(allowInitiativeForLaterShot(5, 2, 5)).toBe(false)
    expect(allowInitiativeForLaterShot(3, 2, 3)).toBe(false)
  })
})
