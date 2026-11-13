import { describe, expect, it } from 'vitest'
import { findMatchesByVideoFingerprint } from './findMatchesByVideoFingerprint'

const assets = [
  {
    id: 'va1',
    match_id: 'm1',
    set_number: 1,
    kind: 'source',
    fingerprint: 'abc',
    file_name: 'a.mp4',
  },
  {
    id: 'va2',
    match_id: 'm2',
    set_number: 2,
    kind: 'source',
    fingerprint: 'abc',
    file_name: 'b.mp4',
  },
  {
    id: 'va3',
    match_id: 'training:p1',
    set_number: 1,
    kind: 'source',
    fingerprint: 'abc',
    file_name: 't.mp4',
  },
  {
    id: 'va4',
    match_id: 'm3',
    set_number: null,
    kind: 'reel',
    fingerprint: 'abc',
    file_name: 'r.mp4',
  },
]

describe('findMatchesByVideoFingerprint', () => {
  it('returns empty for blank fingerprint', () => {
    expect(findMatchesByVideoFingerprint(assets, '')).toEqual([])
  })

  it('skips training and non-source by default', () => {
    const hits = findMatchesByVideoFingerprint(assets, 'abc')
    expect(hits.map((h) => h.assetId).sort()).toEqual(['va1', 'va2'])
  })

  it('excludes current match', () => {
    const hits = findMatchesByVideoFingerprint(assets, 'abc', { excludeMatchId: 'm1' })
    expect(hits.map((h) => h.matchId)).toEqual(['m2'])
  })

  it('can include derivatives', () => {
    const hits = findMatchesByVideoFingerprint(assets, 'abc', { includeDerivatives: true })
    expect(hits.some((h) => h.kind === 'reel')).toBe(true)
  })
})
