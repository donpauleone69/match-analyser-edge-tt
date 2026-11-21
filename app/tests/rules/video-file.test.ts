import { describe, expect, it } from 'vitest'
import { calculateLastModifiedMs, isSameVideoFile, type VideoFileFacts } from '../lib/app'

const STORED: VideoFileFacts = {
  fileName: 'match.mp4',
  sizeBytes: 1_234_567,
  lastModifiedMs: 1_700_000_000_000,
  fingerprint: 'aa11',
}

describe('isSameVideoFile', () => {
  it('a fingerprint on both sides decides alone, whatever the name or date', () => {
    expect(isSameVideoFile(STORED, { ...STORED, fileName: 'IMG_0001.MOV', lastModifiedMs: 5 })).toBe(true)
    expect(isSameVideoFile(STORED, { ...STORED, fingerprint: 'bb22' })).toBe(false)
  })

  it('without a fingerprint on one side: name, exact size and last modified', () => {
    const picked = { ...STORED, fingerprint: null }
    expect(isSameVideoFile(STORED, picked)).toBe(true)
    expect(isSameVideoFile({ ...STORED, fingerprint: null }, { ...STORED })).toBe(true)
    expect(isSameVideoFile(STORED, { ...picked, fileName: 'other.mp4' })).toBe(false)
    expect(isSameVideoFile(STORED, { ...picked, sizeBytes: STORED.sizeBytes + 1 })).toBe(false)
    expect(isSameVideoFile(STORED, { ...picked, lastModifiedMs: STORED.lastModifiedMs! + 1 })).toBe(false)
  })

  it('a missing last modified on either side is not a difference', () => {
    const noHash = { ...STORED, fingerprint: null }
    expect(isSameVideoFile({ ...noHash, lastModifiedMs: null }, noHash)).toBe(true)
    expect(isSameVideoFile(noHash, { ...noHash, lastModifiedMs: null })).toBe(true)
  })
})

describe('calculateLastModifiedMs', () => {
  it('keeps whole ms after 0 and drops the rest', () => {
    expect(calculateLastModifiedMs(1_700_000_000_000)).toBe(1_700_000_000_000)
    expect(calculateLastModifiedMs(0)).toBeNull()
    expect(calculateLastModifiedMs(-1)).toBeNull()
    expect(calculateLastModifiedMs(12.5)).toBeNull()
    expect(calculateLastModifiedMs(Number.NaN)).toBeNull()
  })
})
