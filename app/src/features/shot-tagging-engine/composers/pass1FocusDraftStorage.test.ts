import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearPass1FocusDraft,
  draftHasWork,
  loadPass1FocusDraft,
  savePass1FocusDraft,
  type Pass1FocusDraftSnapshot,
} from './pass1FocusDraftStorage'
import { timelineFromContacts } from './pass1FocusModel'

const setId = 'set-draft-1'

function installMemoryLocalStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
  })
}

function baseDraft(
  overrides: Partial<Pass1FocusDraftSnapshot> = {}
): Pass1FocusDraftSnapshot {
  return {
    version: 1,
    setId,
    matchId: 'match-1',
    setNumber: 1,
    phase: 'tapping',
    contactTimes: [1.2, 1.8],
    openRally: null,
    selectedShot: null,
    savedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('pass1FocusDraftStorage', () => {
  beforeEach(() => {
    installMemoryLocalStorage()
    clearPass1FocusDraft(setId)
  })

  it('round-trips a tapping draft', () => {
    savePass1FocusDraft(baseDraft())
    const loaded = loadPass1FocusDraft(setId)
    expect(loaded?.phase).toBe('tapping')
    expect(loaded?.contactTimes).toEqual([1.2, 1.8])
  })

  it('round-trips a form draft with noFirstAttack', () => {
    const timeline = timelineFromContacts([1, 2, 3])
    savePass1FocusDraft(
      baseDraft({
        phase: 'form',
        contactTimes: [],
        openRally: {
          serveTimestamp: 1,
          endTimestamp: 3,
          timeline: { ...timeline, noFirstAttack: true },
          isHighlight: false,
        },
        selectedShot: 3,
      })
    )
    const loaded = loadPass1FocusDraft(setId)
    expect(loaded?.phase).toBe('form')
    expect(loaded?.openRally?.timeline.noFirstAttack).toBe(true)
    expect(loaded?.selectedShot).toBe(3)
  })

  it('clears empty drafts instead of storing them', () => {
    savePass1FocusDraft(baseDraft({ contactTimes: [], openRally: null }))
    expect(loadPass1FocusDraft(setId)).toBeNull()
    expect(draftHasWork(baseDraft({ contactTimes: [] }))).toBe(false)
  })
})
