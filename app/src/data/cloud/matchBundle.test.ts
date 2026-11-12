import { describe, it, expect } from 'vitest'
import type { DBMatch, DBPlayer, DBRally, DBSet, DBShot, DBVideoAsset } from '@/data'
import {
  createMatchBundle,
  hashMatchBundle,
  mergeVideoAssets,
  parseMatchBundle,
  summarizeMatchBundle,
  MatchBundleError,
} from './matchBundle'

const match = { id: 'm1', player1_id: 'p1', player2_id: null, match_date: '2026-11-11' } as unknown as DBMatch
const sets = [
  { id: 'm1-s2', match_id: 'm1', set_number: 2, player1_score_final: 0, player2_score_final: 0 },
  { id: 'm1-s1', match_id: 'm1', set_number: 1, player1_score_final: 11, player2_score_final: 7 },
] as unknown as DBSet[]
const rallies = [
  { id: 'm1-s1-r1', set_id: 'm1-s1', is_scoring: true },
  { id: 'm1-s1-r2', set_id: 'm1-s1', is_scoring: false },
] as unknown as DBRally[]
const shots = [{ id: 'm1-s1-r1-sh1', rally_id: 'm1-s1-r1' }] as unknown as DBShot[]
const players = [{ id: 'p1', first_name: 'Pat', last_name: 'Overton' }] as unknown as DBPlayer[]
const asset = {
  id: 'va_1',
  match_id: 'm1',
  local_store: 'opfs',
  remote_path: null,
  remote_uploaded_at: null,
} as unknown as DBVideoAsset

const parts = { match, sets, rallies, shots, players, tournament: null, videoAssets: [asset] }

describe('match bundle', () => {
  it('strips device-only fields and sorts rows', () => {
    const b = createMatchBundle(parts, new Date('2026-11-12T00:00:00Z'))
    expect(b.sets.map((s) => s.id)).toEqual(['m1-s1', 'm1-s2'])
    expect('local_store' in b.videoAssets[0]).toBe(false)
  })

  it('round-trips through JSON and validates', () => {
    const b = createMatchBundle(parts)
    expect(parseMatchBundle(JSON.parse(JSON.stringify(b)))).toEqual(b)
  })

  it('rejects other files, newer versions and orphan rows', () => {
    const b = createMatchBundle(parts)
    expect(() => parseMatchBundle({ hello: 1 })).toThrow(MatchBundleError)
    expect(() => parseMatchBundle({ ...b, schemaVersion: 99 })).toThrow(/newer version/)
    expect(() => parseMatchBundle({ ...b, shots: [{ id: 'x', rally_id: 'nope' }] })).toThrow(/no rally/)
  })

  it('hash ignores export time but sees content changes', () => {
    const a = createMatchBundle(parts, new Date('2026-01-01'))
    const b = createMatchBundle(parts, new Date('2026-06-01'))
    expect(hashMatchBundle(a)).toBe(hashMatchBundle(b))
    const c = createMatchBundle({ ...parts, rallies: rallies.slice(0, 1) })
    expect(hashMatchBundle(c)).not.toBe(hashMatchBundle(a))
  })

  it('summarizes names, set scores and points', () => {
    const s = summarizeMatchBundle(createMatchBundle(parts))
    expect(s).toMatchObject({ heroName: 'Pat Overton', villainName: 'Opponent', setsLabel: '11–7', pointsTagged: 1 })
  })

  it('merge keeps this device’s copy and takes the cloud path', () => {
    const incoming = [{ ...asset, remote_path: 'u/m1/va_1.mp4' }]
    delete (incoming[0] as Partial<DBVideoAsset>).local_store
    const [merged] = mergeVideoAssets(incoming, [asset])
    expect(merged.local_store).toBe('opfs')
    expect(merged.remote_path).toBe('u/m1/va_1.mp4')
    const [fresh] = mergeVideoAssets(incoming, [])
    expect(fresh.local_store).toBeNull()
  })
})
