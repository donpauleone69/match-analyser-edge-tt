import { describe, expect, it } from 'vitest'
import {
  BYTES_PER_MB,
  CHECK_THE_POINT,
  SCHEMA_VERSION,
  addContact,
  createMatchStore,
  deleteRally,
  deriveDbRows,
  deriveMatchChildRows,
  deriveMatchRecords,
  deriveOutcome,
  deriveRallyData,
  emptyDraft,
  emptySet,
  leaveMark,
  selectMatch,
  useSettingsStore,
  validateDbRows,
  type DbRows,
  type MatchRecord,
  type OpponentRow,
  type RallyData,
  type RemovedVideo,
} from '../lib/app'
import { matchRecord, video } from '../lib/builders'
import { SEED, TODAY } from '../lib/fixed'
import { goldenBestFa } from '../golden/derive'
import { serialize } from '../golden/serialize'

const NOW = TODAY.getTime()

function roundTrip(matches: MatchRecord[], removedVideos: Record<string, RemovedVideo> = {}) {
  const rows = deriveDbRows(matches, { now: NOW, removedVideos })
  return { rows, back: deriveMatchRecords(rows) }
}

function rallyRows(r: RallyData): DbRows {
  const m = matchRecord({ videos: [video('v')], sets: [{ ...emptySet(1), rallies: [r] }] })
  return deriveDbRows([m], { now: NOW })
}

describe('seed to rows and back', () => {
  it('schema version is 1', () => {
    expect(SCHEMA_VERSION).toBe(1)
  })

  it('gives the seed back exactly, with no removed videos', () => {
    const { back } = roundTrip(SEED)
    expect(back.matches).toEqual(SEED)
    expect(serialize(back.matches)).toBe(serialize(SEED))
    expect(back.removedVideos).toEqual({})
  })

  it('rows built again from the state read back are the same rows', () => {
    const { rows, back } = roundTrip(SEED)
    expect(deriveDbRows(back.matches, { now: NOW })).toEqual(rows)
  })

  it('every seed row passes validation', () => {
    expect(validateDbRows(roundTrip(SEED).rows, TODAY)).toEqual([])
  })

  it('links seven opponents and seven events by name', () => {
    const { rows } = roundTrip(SEED)
    expect(rows.opponents.map((o) => o.name)).toEqual(['Lee', 'Kim', 'Sam', 'Pat', 'Alex', 'Jo', 'Max'])
    expect(rows.events.map((e) => e.name)).toEqual([
      'Open trial',
      'County open',
      'Club night',
      'League final',
      'Junior GP',
      'League',
      'Nationals',
    ])
  })

  it('drops the blob url, and a demo script makes a demo video', () => {
    const file = { ...video('f'), kind: 'file' as const, sizeMb: 12, src: 'blob:x' }
    const demo = { ...video('d'), script: { duration: 600, rallies: [], breaks: [] } }
    const { rows, back } = roundTrip([matchRecord({ videos: [file, demo] })])
    expect(rows.videos.map((v) => [v.sizeBytes, v.demoScript === null])).toEqual([
      [12 * BYTES_PER_MB, true],
      [BYTES_PER_MB, false],
    ])
    const { src: _src, ...noSrc } = file
    expect(back.matches[0].videos).toEqual([noSrc, demo])
  })
})

describe('stamps', () => {
  it('a second write with nothing changed keeps every stamp', () => {
    const first = deriveDbRows(SEED, { now: NOW })
    expect(deriveDbRows(SEED, { now: NOW + 5000, prev: first })).toEqual(first)
  })

  it('a change moves only that match updatedAt', () => {
    const first = deriveDbRows(SEED, { now: NOW })
    const changed = SEED.map((m) => (m.id === 'm-h1' ? { ...m, date: '2026-01-02' } : m))
    const next = deriveDbRows(changed, { now: NOW + 5000, prev: first })
    expect(next.matches.filter((m) => m.updatedAt !== NOW).map((m) => m.id)).toEqual(['m-h1'])
    expect(next.matches.every((m) => m.createdAt === NOW)).toBe(true)
  })

  it('finishing, archiving and deleting write their time once', () => {
    const base = matchRecord({ videos: [video('v')], sets: [{ ...emptySet(1), finished: true }] })
    const first = deriveDbRows([base], { now: NOW })
    const archived = { ...base, videos: [video('v', true)] }
    const next = deriveDbRows([archived], { now: NOW + 9, prev: first })
    expect(next.sets[0].finishedAt).toBe(NOW)
    expect(next.videos[0].archivedAt).toBe(NOW + 9)
    expect(deriveMatchRecords(next).matches[0].videos[0].archived).toBe(true)
  })

  it('matches come back oldest createdAt first', () => {
    const rows = deriveDbRows([matchRecord({ id: 'a' }), matchRecord({ id: 'b' })], { now: NOW })
    rows.matches[0].createdAt = NOW + 1
    expect(deriveMatchRecords(rows).matches.map((m) => m.id)).toEqual(['b', 'a'])
  })
})

describe('opponents and events', () => {
  it('link a name ignoring case and outer spaces; empty text links nothing', () => {
    const rows = deriveDbRows(
      [
        matchRecord({ id: 'a', opponent: 'Pat', event: '' }),
        matchRecord({ id: 'b', opponent: ' pat ', event: 'League' }),
        matchRecord({ id: 'c', opponent: '', event: 'league' }),
      ],
      { now: NOW },
    )
    expect(rows.opponents.map((o) => o.name)).toEqual(['Pat'])
    expect(rows.matches.map((m) => m.opponentId)).toEqual([rows.opponents[0].id, rows.opponents[0].id, null])
    expect(rows.matches.map((m) => m.eventId)).toEqual([null, rows.events[0].id, rows.events[0].id])
    expect(deriveMatchRecords(rows).matches.map((m) => m.opponent)).toEqual(['Pat', 'Pat', ''])
  })

  it('a stored row keeps its id and fields, and a new name gets a fresh id', () => {
    const kept: OpponentRow = {
      id: `o-${NOW}-0`,
      name: 'Kim',
      club: 'Riverside',
      handedness: 'Left',
      style: 'Defender',
      birthYear: 1990,
      notes: 'Long pips',
      createdAt: 1,
      updatedAt: 2,
    }
    const prev: DbRows = { ...deriveDbRows([], { now: NOW }), opponents: [kept] }
    const rows = deriveDbRows([matchRecord({ id: 'a', opponent: 'KIM' }), matchRecord({ id: 'b', opponent: 'Lee' })], {
      now: NOW,
      prev,
    })
    expect(rows.opponents[0]).toEqual(kept)
    expect(rows.opponents[1].id).toBe(`o-${NOW}-1`)
    expect(rows.matches.map((m) => m.opponentId)).toEqual([kept.id, `o-${NOW}-1`])
  })
})

describe('fields the rows do not store come back from what they do', () => {
  it('every Best + FA save: fa, serveChecked and idea from the rally and shot rows', () => {
    for (const { name, rally } of goldenBestFa()) {
      const rows = rallyRows(rally)
      expect(deriveRallyData(rows.rallies[0], rows.shots), name).toEqual(rally)
    }
  })

  it('Check the point is pointKept', () => {
    const kept = goldenBestFa().find((g) => g.name === 'Point to against End')!.rally
    expect(kept.idea?.check).toBe(CHECK_THE_POINT)
    expect(rallyRows(kept).rallies[0].pointKept).toBe(true)
  })

  it('a deleted rally keeps deletedAt and comes back on the set, in its order', () => {
    const m = SEED.find((x) => x.id === 'm-h1')!
    const s = m.sets[0]
    const gone = deleteRally(deleteRally(m, 1, s.rallies[3].id), 1, s.rallies[1].id)
    const { rows, back } = roundTrip([gone])
    expect(rows.rallies.filter((r) => r.deletedAt !== null).map((r) => r.id)).toEqual([s.rallies[1].id, s.rallies[3].id])
    expect(back.matches[0]).toEqual(gone)
    expect(validateDbRows(rows, TODAY)).toEqual([])
  })

  it('left marks, review parts, a draft and an empty Details score come back', () => {
    const m = SEED.find((x) => x.id === 'm-partial')!
    const first = m.sets[1].rallies[0]
    let draft = emptyDraft(m.videos[0].id, 'me')
    draft = { ...addContact(addContact(draft, 400), 400.5), closed: true, serveChecked: true, best: { flow: 'bestfa', step: 'serve' } }
    const marked = leaveMark(m, 2, first.id, 'gap')
    const next: MatchRecord = {
      ...marked,
      sets: marked.sets.map((s) => (s.setId === 3 ? { ...s, draft, entered: { me: '7', them: '' } } : s)),
    }
    const { rows, back } = roundTrip([next])
    expect(rows.drafts).toHaveLength(1)
    expect(rows.sets[2]).toMatchObject({ enteredMe: 7, enteredThem: null })
    expect(back.matches[0]).toEqual(next)
    expect(validateDbRows(rows, TODAY)).toEqual([])
  })

  it('a removed video that rallies name stays as a row with removedAt, and comes back as removed', () => {
    const store = createMatchStore(SEED, 'filled')
    store.getState().removeVideo('m-h7', 'v-h7-b')
    const m = selectMatch(store.getState(), 'm-h7')!
    const removed = store.getState().removedVideos
    const { rows, back } = roundTrip([m], removed)
    const row = rows.videos.find((v) => v.id === 'v-h7-b')!
    expect(row).toMatchObject({ removedAt: NOW, position: 1 })
    expect(back.matches[0]).toEqual(m)
    expect(back.removedVideos).toEqual({ 'v-h7-b': removed['v-h7-b'] })
    expect(validateDbRows(rows, TODAY)).toEqual([])
  })

  it('child rows of one match are the rows that belong to it', () => {
    const rows = deriveDbRows(SEED, { now: NOW })
    const one = deriveMatchChildRows(rows, 'm-h9')
    expect(one.videos.map((v) => v.id)).toEqual(['v-h9'])
    expect(one.sets).toHaveLength(4)
    expect(one.shots.every((s) => one.rallies.some((r) => r.id === s.rallyId))).toBe(true)
  })
})

describe('decision 19 fields', () => {
  it('outcome is written from a typed result, Win only when you won more sets', () => {
    expect(deriveOutcome(3, 1)).toBe('Win')
    expect(deriveOutcome(1, 3)).toBe('Loss')
    expect(deriveOutcome(null, 3)).toBeNull()
    const rows = deriveDbRows(SEED, { now: NOW })
    for (const row of rows.matches) expect(row.outcome).toBe(deriveOutcome(row.resultMe, row.resultThem))
  })

  it('category, stage, round, an outcome with no result and myEnd come back as entered', () => {
    const m = matchRecord({
      category: 'Vets',
      stage: 'Knockout',
      round: 'QF',
      outcome: 'Win',
      videos: [{ ...video('v'), kind: 'file', myEnd: 'Far' }],
    })
    const { rows, back } = roundTrip([m])
    expect(rows.matches[0]).toMatchObject({ category: 'Vets', stage: 'Knockout', round: 'QF', outcome: 'Win' })
    expect(rows.videos[0].myEnd).toBe('Far')
    expect(back.matches[0]).toEqual(m)
  })

  it('a typed result wins over a stored outcome that disagrees', () => {
    const m = matchRecord({ result: { me: 0, them: 3 }, outcome: 'Win' })
    expect(deriveDbRows([m], { now: NOW }).matches[0].outcome).toBe('Loss')
  })
})

describe("today's writers never write Defence, the decision 19 columns, a free outcome or myEnd", () => {
  const NEW_MATCH_KEYS = ['category', 'stage', 'round', 'outcome']

  function written(matches: MatchRecord[]): string[] {
    const bad: string[] = []
    for (const m of matches) {
      for (const key of NEW_MATCH_KEYS) if (key in m) bad.push(`${m.id} ${key}`)
      for (const v of m.videos) if ('myEnd' in v) bad.push(`${m.id} ${v.id} myEnd`)
      for (const s of m.sets) {
        for (const r of s.rallies) for (const shot of r.shots) if (shot.stroke === 'Defence') bad.push(`${r.id} Defence`)
      }
    }
    return bad
  }

  it('the seed', () => {
    expect(written(SEED)).toEqual([])
  })

  it('the seed rows: every decision 19 column is null, outcome only from the result', () => {
    const rows = deriveDbRows(SEED, { now: NOW })
    const filled = [
      ...rows.opponents.flatMap((o) => [o.club, o.handedness, o.style, o.birthYear, o.notes]),
      ...rows.events.flatMap((e) => [e.location, e.rankingStatus, e.importance]),
      ...rows.matches.flatMap((m) => [m.category, m.stage, m.round]),
      ...rows.videos.map((v) => v.myEnd),
    ].filter((v) => v !== null)
    expect(filled).toEqual([])
    expect(rows.shots.filter((s) => s.stroke === 'Defence')).toEqual([])
    expect(rows.matches.filter((m) => m.outcome !== deriveOutcome(m.resultMe, m.resultThem))).toEqual([])
  })

  it('store actions: create, details, result, video', () => {
    const store = createMatchStore(SEED, 'filled')
    const made = store.getState().createMatch()
    store.getState().updateMatch(made.id, { opponent: 'Ana', event: 'Open', date: '2026-11-01' })
    store.getState().setResult(made.id, { me: 3, them: 1 })
    store.getState().setEnteredScore(made.id, 1, { me: '11', them: '4' })
    store.getState().addVideo(made.id)
    store.getState().addVideo(made.id, { fileName: 'a.mp4', sizeMb: 3, durationS: 90, src: 'blob:a' })
    expect(written(store.getState().catalog)).toEqual([])
  })

  it('Best + FA saves', () => {
    const shots = goldenBestFa().flatMap((g) => g.rally.shots)
    expect(shots.filter((s) => s.stroke === 'Defence')).toEqual([])
  })

  it('my handedness is null with no writer', () => {
    const state = useSettingsStore.getState()
    expect(state.myHandedness).toBeNull()
    expect(Object.keys(state).filter((k) => /handed/i.test(k))).toEqual(['myHandedness'])
  })
})
