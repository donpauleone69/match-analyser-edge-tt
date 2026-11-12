import { describe, it, expect } from 'vitest'
import { deriveSetTaggingStatus } from './deriveSetTaggingStatus'

const base = { is_tagged: false, tagging_phase: 'not_started' as const, tagging_started_at: null }

describe('deriveSetTaggingStatus', () => {
  it('is not started with no rallies and no phase', () => {
    expect(deriveSetTaggingStatus(base, 0)).toBe('not_started')
  })

  it('is in progress while rallies are being saved (legacy phase names)', () => {
    expect(deriveSetTaggingStatus({ ...base, tagging_phase: 'phase2_in_progress' }, 4)).toBe(
      'in_progress'
    )
    expect(deriveSetTaggingStatus({ ...base, tagging_phase: 'phase1_in_progress' }, 0)).toBe(
      'in_progress'
    )
  })

  it('is tagged once the session was ended', () => {
    expect(deriveSetTaggingStatus({ ...base, tagging_phase: 'phase2_complete' }, 15)).toBe('tagged')
    expect(deriveSetTaggingStatus({ ...base, is_tagged: true }, 0)).toBe('tagged')
  })
})
