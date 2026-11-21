// Pure parts of the phase 8 data layer. The Dexie parts run in Chrome: `npm run check:db`.
import { describe, expect, it } from 'vitest'
import {
  DB_COLUMNS,
  DEMO_DB_NAME,
  OLD_DATABASES,
  OLD_LOCAL_KEYS,
  OLD_LOCAL_PREFIXES,
  OLD_SESSION_KEYS,
  SCHEMA_V1_STORES,
  SETTINGS_STORAGE_KEYS,
  TABLES,
  USER_DB_NAME,
  createMatchStore,
  createRowId,
  deriveDbRows,
  deriveListRows,
  deriveMatchFileName,
  deriveMatchRecords,
  isOldLocalKey,
  validateDbRows,
  type MatchFile,
} from '../lib/app'
import { serialize } from '../golden/serialize'
import { SEED, TODAY } from '../lib/fixed'

const NOW = TODAY.getTime()

describe('createRowId', () => {
  it('prefix, time and a random part', () => {
    expect(createRowId('m-new', NOW)).toMatch(new RegExp(`^m-new-${NOW}-[0-9a-f]{8}$`))
  })
  it('a thousand ids in one millisecond are all different', () => {
    const ids = Array.from({ length: 1000 }, () => createRowId('r', NOW))
    expect(new Set(ids).size).toBe(1000)
  })
  it('two matches and two videos made in one millisecond get their own ids', () => {
    const store = createMatchStore(SEED, 'filled')
    const a = store.getState().createMatch()
    const b = store.getState().createMatch()
    expect(a.id).not.toBe(b.id)
    store.getState().updateMatch(a.id, { opponent: 'Ana' })
    store.getState().addVideo(a.id)
    store.getState().addVideo(a.id)
    const videos = store.getState().catalog.find((m) => m.id === a.id)!.videos
    expect(new Set(videos.map((v) => v.id)).size).toBe(2)
  })
})

describe('schema v1 lists', () => {
  const rows = deriveDbRows(SEED, { now: NOW })
  it('DB_COLUMNS names every key of every seed row, and no other', () => {
    for (const table of TABLES.filter((t) => t !== 'drafts')) {
      const keys = new Set(rows[table].flatMap((row) => Object.keys(row)))
      expect([...keys].sort(), table).toEqual([...DB_COLUMNS[table]].sort())
    }
  })
  it('the seed has no draft; a draft row is its set and the open rally', () => {
    expect(rows.drafts).toEqual([])
    expect([...DB_COLUMNS.drafts].sort()).toEqual(['rally', 'setId'])
  })
  it('every table has a Dexie store, keyed by its first column', () => {
    expect(Object.keys(SCHEMA_V1_STORES).sort()).toEqual([...TABLES].sort())
    for (const table of TABLES) expect(SCHEMA_V1_STORES[table].split(',')[0].trim(), table).toBe(DB_COLUMNS[table][0])
  })
})

describe('deriveListRows', () => {
  const rows = deriveListRows(SEED, NOW)
  it('match i is created at now + i, so rows read back in seed order', () => {
    expect(rows.matches.map((m) => m.createdAt)).toEqual(SEED.map((_, i) => NOW + i))
    expect(deriveMatchRecords(rows).matches.map((m) => m.id)).toEqual(SEED.map((m) => m.id))
  })
  it('the rows pass every check and read back as the seed', () => {
    expect(validateDbRows(rows, TODAY)).toEqual([])
    expect(serialize(deriveMatchRecords(rows).matches)).toBe(serialize(SEED))
  })
  it('only the match times differ from deriveDbRows', () => {
    const plain = deriveDbRows(SEED, { now: NOW })
    const strip = (r: typeof rows) => ({ ...r, matches: r.matches.map((m) => ({ ...m, createdAt: 0, updatedAt: 0 })) })
    expect(serialize(strip(rows))).toBe(serialize(strip(plain)))
  })
})

describe('old storage names', () => {
  const local: readonly string[] = SETTINGS_STORAGE_KEYS.local
  const session: readonly string[] = SETTINGS_STORAGE_KEYS.session
  it('no settings key is an old key', () => {
    expect(local.filter(isOldLocalKey)).toEqual([])
    expect(session.filter((k) => (OLD_SESSION_KEYS as readonly string[]).includes(k))).toEqual([])
  })
  it('every old key and prefix is matched', () => {
    for (const key of OLD_LOCAL_KEYS) expect(isOldLocalKey(key), key).toBe(true)
    for (const prefix of OLD_LOCAL_PREFIXES) expect(isOldLocalKey(`${prefix}x`), prefix).toBe(true)
    expect(isOldLocalKey('sb-127-auth-token')).toBe(true)
    expect(isOldLocalKey('sb-abcdefghijklmnopqrst-auth-token-code-verifier')).toBe(true)
  })
  it('names nobody listed are left', () => {
    for (const key of ['theme', 'edge-tt', 'sb-auth-token', 'edge-tt.best-timing-x', 'video-playback']) expect(isOldLocalKey(key), key).toBe(false)
  })
  it('the new databases do not reuse an old name', () => {
    expect(OLD_DATABASES).not.toContain(USER_DB_NAME)
    expect(OLD_DATABASES).not.toContain(DEMO_DB_NAME)
    expect(USER_DB_NAME).not.toBe(DEMO_DB_NAME)
  })
})

describe('deriveMatchFileName', () => {
  const file = (playedOn: string | null, name: string | null) =>
    ({ match: { playedOn }, opponent: name === null ? null : { name } }) as unknown as MatchFile
  it('date and opponent', () => {
    expect(deriveMatchFileName(file('2026-11-01', 'Ana López, Jr.'))).toBe('edge-tt-match-2026-11-01-ana-l-pez-jr.json')
  })
  it('nothing typed', () => {
    expect(deriveMatchFileName(file(null, null))).toBe('edge-tt-match.json')
  })
})
