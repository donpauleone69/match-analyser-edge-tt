import { describe, it, expect } from 'vitest'
import {
  derivePass1ShotTagAllowList,
  derivePass1ShotTagRole,
  type Pass1ShotTagAllowList,
} from './derivePass1ShotTagRole'

const NONE: Pass1ShotTagAllowList = {
  shot_wing: false,
  shot_is_pivot: false,
  shot_stroke: false,
  shot_initiative: false,
  shot_is_high: false,
  shot_is_safe: false,
  shot_spin: false,
  shot_placement: false,
  shot_depth: false,
  shot_contact: false,
  shot_quality: false,
  shot_is_weak: false,
  shot_is_heavy: false,
}

function allow(partial: Partial<Pass1ShotTagAllowList>): Pass1ShotTagAllowList {
  return { ...NONE, ...partial }
}

const SERVE_RF = {
  shot_spin: true,
  shot_placement: true,
  shot_depth: true,
  shot_is_weak: true,
  shot_is_high: true,
  shot_is_heavy: true,
} as const

const PRE_RF = {
  shot_wing: true,
  shot_placement: true,
  shot_depth: true,
  shot_is_weak: true,
  shot_is_high: true,
  shot_is_heavy: true,
} as const

describe('derivePass1ShotTagRole', () => {
  it('labels roles for a mid-rally attack', () => {
    expect(derivePass1ShotTagRole(1, 4, 7)).toBe('serve')
    expect(derivePass1ShotTagRole(2, 4, 7)).toBe('before_attack')
    expect(derivePass1ShotTagRole(3, 4, 7)).toBe('ball_before_attack')
    expect(derivePass1ShotTagRole(4, 4, 7)).toBe('first_attack')
    expect(derivePass1ShotTagRole(5, 4, 7)).toBe('reply')
    expect(derivePass1ShotTagRole(6, 4, 7)).toBe('later')
    expect(derivePass1ShotTagRole(7, 4, 7)).toBe('end_shot')
  })

  it('treats the serve as the ball before the attack when FOS = 2', () => {
    expect(derivePass1ShotTagRole(1, 2, 5)).toBe('ball_before_attack')
    expect(derivePass1ShotTagRole(2, 2, 5)).toBe('first_attack')
  })

  it('labels non-serve shots before_attack when nobody attacked', () => {
    expect(derivePass1ShotTagRole(1, null, 5)).toBe('serve')
    expect(derivePass1ShotTagRole(2, null, 5)).toBe('before_attack')
    expect(derivePass1ShotTagRole(4, null, 5)).toBe('before_attack')
    expect(derivePass1ShotTagRole(5, null, 5)).toBe('end_shot')
  })

  it('keeps first_attack ahead of end_shot when attack is the end shot', () => {
    expect(derivePass1ShotTagRole(3, 3, 3)).toBe('first_attack')
  })

  it('treats a reply that is the end as end_shot', () => {
    expect(derivePass1ShotTagRole(4, 3, 4)).toBe('end_shot')
  })

  it('serve end (endIndex = 1) stays serve', () => {
    expect(derivePass1ShotTagRole(1, null, 1)).toBe('serve')
  })

  it('ignores an invalid first attack (before 2 or past the end)', () => {
    expect(derivePass1ShotTagRole(2, 1, 4)).toBe('before_attack')
    expect(derivePass1ShotTagRole(3, 6, 4)).toBe('before_attack')
    expect(derivePass1ShotTagRole(4, 6, 4)).toBe('end_shot')
  })

  it('works while the end is unmarked', () => {
    expect(derivePass1ShotTagRole(2, 3, null)).toBe('ball_before_attack')
    expect(derivePass1ShotTagRole(3, 3, null)).toBe('first_attack')
    expect(derivePass1ShotTagRole(4, 3, null)).toBe('reply')
    expect(derivePass1ShotTagRole(5, 3, null)).toBe('later')
  })
})

describe('derivePass1ShotTagAllowList', () => {
  describe('rally with attack: fos = 4, end = 7', () => {
    const fos = 4
    const end = 7

    it('serve: RF spin/placement/depth/Weak·High·Heavy', () => {
      expect(derivePass1ShotTagAllowList(1, fos, end)).toEqual(allow({ ...SERVE_RF }))
    })

    it('early pre-offensive: RF wing/placement/depth/attrs', () => {
      expect(derivePass1ShotTagAllowList(2, fos, end)).toEqual(allow({ ...PRE_RF }))
    })

    it('ball before attack: High + RF pre-offensive fields', () => {
      expect(derivePass1ShotTagAllowList(3, fos, end)).toEqual(
        allow({ ...PRE_RF, shot_is_high: true })
      )
    })

    it('first attack: wing, stroke, safe + contact/quality', () => {
      expect(derivePass1ShotTagAllowList(4, fos, end)).toEqual(
        allow({
          shot_wing: true,
          shot_is_pivot: true,
          shot_stroke: true,
          shot_is_safe: true,
          shot_contact: true,
          shot_quality: true,
        })
      )
    })

    it('reply: wing, stroke, initiative', () => {
      expect(derivePass1ShotTagAllowList(5, fos, end)).toEqual(
        allow({
          shot_wing: true,
          shot_is_pivot: true,
          shot_stroke: true,
          shot_initiative: true,
        })
      )
    })

    it('later fos+2 (not end): wing, stroke, initiative', () => {
      expect(derivePass1ShotTagAllowList(6, fos, end)).toEqual(
        allow({
          shot_wing: true,
          shot_stroke: true,
          shot_initiative: true,
        })
      )
    })

    it('end shot: wing + stroke (+ pivot from Pass 1 end)', () => {
      expect(derivePass1ShotTagAllowList(7, fos, end)).toEqual(
        allow({ shot_wing: true, shot_is_pivot: true, shot_stroke: true })
      )
    })
  })

  describe('serve and FOS = 2', () => {
    it('serve gets High + RF serve fields', () => {
      expect(derivePass1ShotTagAllowList(1, 2, 5)).toEqual(
        allow({ ...SERVE_RF, shot_is_high: true })
      )
    })

    it('shot 2 is first attack with safe + contact/quality', () => {
      expect(derivePass1ShotTagAllowList(2, 2, 5)).toEqual(
        allow({
          shot_wing: true,
          shot_is_pivot: true,
          shot_stroke: true,
          shot_is_safe: true,
          shot_contact: true,
          shot_quality: true,
        })
      )
    })

    it('shot 3 is reply with initiative', () => {
      expect(derivePass1ShotTagAllowList(3, 2, 5)).toEqual(
        allow({
          shot_wing: true,
          shot_is_pivot: true,
          shot_stroke: true,
          shot_initiative: true,
        })
      )
    })
  })

  describe('High never lands on the attack itself', () => {
    it('only fos - 1 across a rally (plus RF attrs on serve/pre)', () => {
      const highs = [1, 2, 3, 4, 5, 6, 7].filter(
        (i) => derivePass1ShotTagAllowList(i, 5, 7).shot_is_high
      )
      // serve + pre (2..4 ball-before) have RF attributes High; FA+ later do not
      expect(highs).toEqual([1, 2, 3, 4])
    })
  })

  describe('Safe only on the first attack', () => {
    it('only fos across a rally', () => {
      const safes = [1, 2, 3, 4, 5, 6, 7].filter(
        (i) => derivePass1ShotTagAllowList(i, 3, 7).shot_is_safe
      )
      expect(safes).toEqual([3])
    })

    it('safe stays allowed when the attack is also the end shot', () => {
      expect(derivePass1ShotTagAllowList(3, 3, 3)).toEqual(
        allow({
          shot_wing: true,
          shot_is_pivot: true,
          shot_stroke: true,
          shot_is_safe: true,
          shot_contact: true,
          shot_quality: true,
        })
      )
    })
  })

  describe('reply that is also the end shot', () => {
    it('keeps wing + stroke and initiative (End pills sit alongside)', () => {
      expect(derivePass1ShotTagAllowList(4, 3, 4)).toEqual(
        allow({
          shot_wing: true,
          shot_is_pivot: true,
          shot_stroke: true,
          shot_initiative: true,
        })
      )
    })
  })

  describe('no first attack (push rallies / unforced errors)', () => {
    it('serve: RF serve fields', () => {
      expect(derivePass1ShotTagAllowList(1, null, 4)).toEqual(allow({ ...SERVE_RF }))
    })

    it('middle shots: RF pre-offensive (no High without FOS ball-before)', () => {
      expect(derivePass1ShotTagAllowList(2, null, 4)).toEqual(allow({ ...PRE_RF }))
      expect(derivePass1ShotTagAllowList(3, null, 4)).toEqual(allow({ ...PRE_RF }))
    })

    it('end shot (before_attack): wing + stroke (+ RF pre attrs merge)', () => {
      // end is also RF pre_offensive when fos null → wing/placement/depth/attrs + Pass1 pivot
      expect(derivePass1ShotTagAllowList(4, null, 4)).toEqual(
        allow({
          ...PRE_RF,
          shot_is_pivot: true,
          shot_stroke: true,
        })
      )
    })

    it('end shot at index 2 (receive error) still gets wing + stroke', () => {
      expect(derivePass1ShotTagAllowList(2, null, 2)).toEqual(
        allow({
          ...PRE_RF,
          shot_is_pivot: true,
          shot_stroke: true,
        })
      )
    })
  })

  describe('serve as the end shot (endIndex = 1)', () => {
    it('gets RF serve fields — no wing/stroke on a serve end', () => {
      expect(derivePass1ShotTagAllowList(1, null, 1)).toEqual(allow({ ...SERVE_RF }))
    })
  })

  describe('invalid first attack is ignored', () => {
    it('fos past the end behaves as no attack', () => {
      expect(derivePass1ShotTagAllowList(2, 4, 2)).toEqual(
        allow({
          ...PRE_RF,
          shot_is_pivot: true,
          shot_stroke: true,
        })
      )
      expect(derivePass1ShotTagAllowList(1, 4, 2)).toEqual(allow({ ...SERVE_RF }))
    })

    it('fos < 2 behaves as no attack', () => {
      expect(derivePass1ShotTagAllowList(1, 1, 3)).toEqual(allow({ ...SERVE_RF }))
      expect(derivePass1ShotTagAllowList(2, 1, 3)).toEqual(allow({ ...PRE_RF }))
    })
  })

  describe('end not marked yet', () => {
    it('still allows attack / reply / ball-before tags + RF merge', () => {
      expect(derivePass1ShotTagAllowList(2, 3, null)).toEqual(
        allow({ ...PRE_RF, shot_is_high: true })
      )
      expect(derivePass1ShotTagAllowList(3, 3, null)).toEqual(
        allow({
          shot_wing: true,
          shot_is_pivot: true,
          shot_stroke: true,
          shot_is_safe: true,
          shot_contact: true,
          shot_quality: true,
        })
      )
      expect(derivePass1ShotTagAllowList(4, 3, null)).toEqual(
        allow({
          shot_wing: true,
          shot_is_pivot: true,
          shot_stroke: true,
          shot_initiative: true,
        })
      )
    })

    it('grants RF pre-offensive when no fos/end yet on shot 5', () => {
      // fos null → pre_offensive for shot > 1
      expect(derivePass1ShotTagAllowList(5, null, null)).toEqual(allow({ ...PRE_RF }))
    })
  })

  it('never allows anything for invalid shot indices', () => {
    expect(derivePass1ShotTagAllowList(0, 2, 5)).toEqual(NONE)
    expect(derivePass1ShotTagAllowList(-1, null, 5)).toEqual(NONE)
  })

  it('exposes Pass 1 + RF optional flags', () => {
    expect(Object.keys(derivePass1ShotTagAllowList(3, 3, 5)).sort()).toEqual([
      'shot_contact',
      'shot_depth',
      'shot_initiative',
      'shot_is_heavy',
      'shot_is_high',
      'shot_is_pivot',
      'shot_is_safe',
      'shot_is_weak',
      'shot_placement',
      'shot_quality',
      'shot_spin',
      'shot_stroke',
      'shot_wing',
    ])
  })
})
