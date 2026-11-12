import { describe, expect, it } from 'vitest'
import {
  MATCH_PLAYBACK_SPEED_STEPS,
  canNudgePlaybackSpeed,
  formatPlaybackSpeed,
  nudgePlaybackSpeed,
} from './playbackSpeeds'

describe('playbackSpeeds', () => {
  it('nudges along the shared ladder', () => {
    expect(nudgePlaybackSpeed(1, 1)).toBe(1.25)
    expect(nudgePlaybackSpeed(1, -1)).toBe(0.75)
    expect(nudgePlaybackSpeed(0.5, -1)).toBe(0.5)
    expect(nudgePlaybackSpeed(2, 1)).toBe(2)
  })

  it('snaps unknown rates before nudging', () => {
    expect(nudgePlaybackSpeed(0.9, 1)).toBe(1)
    expect(nudgePlaybackSpeed(0.9, -1)).toBe(0.75)
  })

  it('reports nudge bounds and formats labels', () => {
    expect(canNudgePlaybackSpeed(MATCH_PLAYBACK_SPEED_STEPS[0], -1)).toBe(false)
    expect(canNudgePlaybackSpeed(2, 1)).toBe(false)
    expect(formatPlaybackSpeed(0.75)).toBe('0.75×')
  })
})
