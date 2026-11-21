// Browser half of `npm run check:db`. Runs the Dexie layer in real Chrome and
// hands the demo rows back to node, where the invariants and golden outputs run.
import type { DBCore, DBCoreMutateRequest, DBCoreTable, Middleware } from 'dexie'
import {
  DB_COLUMNS,
  DEMO_DB_NAME,
  OLD_DATABASES,
  OLD_LOCAL_KEYS,
  OLD_LOCAL_PREFIXES,
  OLD_OPFS_DIRS,
  OLD_SESSION_KEYS,
  SCHEMA_V1_STORES,
  SCHEMA_VERSION,
  SETTINGS_STORAGE_KEYS,
  TABLES,
  USER_DB_NAME,
  cleanupOldStorage,
  createMatchDb,
  deleteMatch,
  deriveListRows,
  deriveSetRowId,
  deriveShotRowId,
  emptyDraft,
  emptySet,
  exportMatchFile,
  importMatchFile,
  isEmpty,
  loadAll,
  openMatchDb,
  readAllRows,
  readStorageInfo,
  removeOpponent,
  renameOpponent,
  requestPersistentStorage,
  reseedDemo,
  saveDraft,
  saveMatch,
  saveRally,
  serializeMatchFile,
  stableJson,
  type DbRows,
  type MatchDb,
  type MatchFile,
  type MatchRecord,
  type RepoResult,
} from '../lib/app'
import { SEED, TODAY } from '../lib/fixed'

const NOW = TODAY.getTime()
const OPTS = { now: NOW, today: TODAY }

type Check = { name: string; ok: boolean; problems: string[] }
const checks: Check[] = []

async function check(name: string, fn: (bad: (problem: string) => void) => Promise<void>) {
  const problems: string[] = []
  try {
    await fn((problem) => problems.push(problem))
  } catch (err) {
    problems.push(`threw ${err instanceof Error ? err.stack || err.message : String(err)}`)
  }
  checks.push({ name, ok: problems.length === 0, problems })
}

function value<T>(result: RepoResult<T>, what: string): T {
  if (!result.ok) throw new Error(`${what}: ${JSON.stringify(result.error)}`)
  return result.value
}

const sortedRows = (rows: DbRows): DbRows => {
  const out = { ...rows }
  for (const table of TABLES) {
    const key = (row: object) => String((row as Record<string, unknown>)[DB_COLUMNS[table][0]])
    ;(out[table] as object[]) = [...(rows[table] as object[])].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0))
  }
  return out
}
const sameRows = (a: DbRows, b: DbRows) => stableJson(sortedRows(a)) === stableJson(sortedRows(b))

async function snapshot(db: MatchDb): Promise<string> {
  return stableJson(sortedRows(value(await readAllRows(db), 'read')))
}

function rowDiff(a: DbRows, b: DbRows): string[] {
  const out: string[] = []
  for (const table of TABLES) {
    const x = stableJson(sortedRows(a)[table])
    const y = stableJson(sortedRows(b)[table])
    if (x !== y) out.push(`${table}: ${a[table].length} rows vs ${b[table].length}`)
  }
  return out
}

/** Expects a refusal of this kind. */
function refused<T>(bad: (p: string) => void, result: RepoResult<T>, kind: string, what: string) {
  if (result.ok) bad(`${what}: written, want ${kind}`)
  else if (result.error.kind !== kind) bad(`${what}: ${result.error.kind} ${JSON.stringify(result.error).slice(0, 200)}, want ${kind}`)
}

const seedMatch = (id: string): MatchRecord => structuredClone(SEED.find((m) => m.id === id)!)

function bareMatch(id: string, opponent: string, event = ''): MatchRecord {
  return { id, opponent, event, date: '2026-11-01', result: { me: null, them: null }, videos: [], sets: [emptySet(1)] }
}

const copied = (id: string) => `${id}~copy`

/**
 * The file as another match `id`, every id renamed. `keep` leaves the set or
 * shot ids as they were, which is how a crafted file would reach the original
 * match's rows.
 */
function copyMatchFile(file: MatchFile, id: string, keep: { setIds?: boolean; shotIds?: boolean } = {}): MatchFile {
  const setIds = new Map(file.sets.map((s) => [s.id, keep.setIds ? s.id : deriveSetRowId(id, s.setNumber)]))
  const video = (v: string | null) => (v === null ? null : copied(v))
  return {
    ...file,
    match: { ...file.match, id },
    videos: file.videos.map((v) => ({ ...v, id: copied(v.id), matchId: id })),
    sets: file.sets.map((s) => ({ ...s, id: setIds.get(s.id)!, matchId: id, markFromVideoId: video(s.markFromVideoId), markToVideoId: video(s.markToVideoId) })),
    rallies: file.rallies.map((r) => ({ ...r, id: copied(r.id), setId: setIds.get(r.setId)!, videoId: copied(r.videoId) })),
    shots: file.shots.map((s) => ({ ...s, rallyId: copied(s.rallyId), id: keep.shotIds ? s.id : deriveShotRowId(copied(s.rallyId), s.shotNumber) })),
    drafts: file.drafts.map((d) => ({ setId: setIds.get(d.setId)!, rally: { ...d.rally, videoId: copied(d.rally.videoId) } })),
  }
}

async function deleteDb(name: string) {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(name)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
}

async function run() {
  const user = openMatchDb('user')
  const demo = openMatchDb('demo')
  let demoRows: DbRows | null = null
  let storage: unknown = null

  await check('schema opens at version 1 with the eight tables and their indexes', async (bad) => {
    for (const db of [user, demo]) {
      await db.open()
      if (db.verno !== SCHEMA_VERSION || SCHEMA_VERSION !== 1) bad(`${db.name} version ${db.verno}`)
      const names = db.tables.map((t) => t.name).sort()
      if (stableJson(names) !== stableJson([...TABLES].sort())) bad(`${db.name} tables ${names.join(',')}`)
      for (const table of db.tables) {
        const want = SCHEMA_V1_STORES[table.name as keyof typeof SCHEMA_V1_STORES].split(',').map((s) => s.trim())
        const got = [table.schema.primKey.name, ...table.schema.indexes.map((i) => i.name)]
        if (stableJson(got) !== stableJson(want)) bad(`${db.name}.${table.name} ${got.join(',')} want ${want.join(',')}`)
      }
      const raw = await new Promise<number>((resolve, reject) => {
        const req = indexedDB.open(db.name)
        req.onsuccess = () => {
          resolve(req.result.version)
          req.result.close()
        }
        req.onerror = () => reject(req.error)
      })
      if (raw !== 10) bad(`${db.name} IndexedDB version ${raw}, want 10 (Dexie version 1)`)
    }
    if (user.name !== USER_DB_NAME || demo.name !== DEMO_DB_NAME) bad('database names')
  })

  await check('seed written to the demo database reads back as the same rows, in seed order', async (bad) => {
    const wrote = value(await reseedDemo(demo, SEED, OPTS), 'reseed')
    const want = deriveListRows(SEED, NOW)
    const total = TABLES.reduce((n, t) => n + want[t].length, 0)
    if (wrote.put !== total) bad(`wrote ${wrote.put} rows, want ${total}`)
    demoRows = value(await readAllRows(demo), 'read')
    if (!sameRows(demoRows, want)) bad(`rows differ: ${rowDiff(demoRows, want).join('; ')}`)
    const loaded = value(await loadAll(demo), 'loadAll')
    if (stableJson(loaded.matches.map((m) => m.id)) !== stableJson(SEED.map((m) => m.id))) bad('load order is not the seed order')
    if (stableJson(loaded.matches) !== stableJson(SEED)) bad('loaded matches differ from the seed')
    if (stableJson(loaded.removedVideos) !== '{}') bad('removed videos on a fresh seed')
    if (loaded.opponents.length !== want.opponents.length || loaded.events.length !== want.events.length) bad('opponent or event list')
  })

  await check('a refused write leaves the database unchanged', async (bad) => {
    const before = await snapshot(demo)
    const userBefore = await snapshot(user)

    refused(bad, await saveMatch(demo, { ...seedMatch('m-complete'), result: { me: 2, them: 2 } }, OPTS), 'invalid', 'result 2 - 2')
    const close = seedMatch('m-complete')
    const r0 = close.sets[0].rallies.find((r) => r.contacts.length >= 2)!
    r0.contacts[1] = r0.contacts[0] + 0.01
    refused(bad, await saveMatch(demo, close, OPTS), 'invalid', 'contacts 0.01 s apart')
    refused(bad, await saveMatch(demo, { ...seedMatch('m-complete'), id: 'm-clash' }, OPTS), 'conflict', 'videos of another match')

    const rows = value(await readAllRows(demo), 'read')
    const rally = rows.rallies.find((r) => r.kind === 'rally' && !r.pointKept)!
    const shots = rows.shots.filter((s) => s.rallyId === rally.id)
    refused(bad, await saveRally(demo, { ...rally, winner: rally.winner === 'me' ? 'them' : 'me' }, shots, OPTS), 'invalid', 'winner against the tags')
    refused(bad, await saveRally(demo, rally, null as unknown as [], OPTS), 'invalid', 'no shot list')
    refused(bad, await saveRally(demo, { ...rally, setId: 'm-nowhere:1' }, shots, OPTS), 'missing', 'rally in a set not stored')

    const set = rows.sets.find((s) => s.matchId === 'm-complete')!
    const own = rows.videos.find((v) => v.matchId === 'm-complete')!
    const other = rows.videos.find((v) => v.matchId !== 'm-complete')!
    refused(bad, await saveDraft(demo, 'm-complete', set.setNumber, { ...emptyDraft(own.id, 'me'), contacts: [2, 1] }, OPTS), 'invalid', 'draft contacts descending')
    refused(bad, await saveDraft(demo, 'm-complete', set.setNumber, emptyDraft(other.id, 'me'), OPTS), 'invalid', 'draft on a video of another match')
    refused(bad, await saveDraft(demo, 'm-complete', 9, emptyDraft(own.id, 'me'), OPTS), 'missing', 'draft on a set not stored')

    const [a, b] = rows.opponents
    refused(bad, await renameOpponent(demo, a.id, ` ${b.name.toUpperCase()} `, OPTS), 'conflict', 'rename onto another name')
    refused(bad, await renameOpponent(demo, a.id, '   ', OPTS), 'invalid', 'rename to nothing')
    refused(bad, await renameOpponent(demo, 'o-none', 'Kim', OPTS), 'missing', 'rename a row not stored')
    refused(bad, await removeOpponent(demo, a.id), 'conflict', 'remove an opponent a match links to')

    const file = value(await exportMatchFile(demo, 'm-complete', OPTS), 'export')
    const text = (f: unknown) => JSON.stringify(f)
    refused(bad, await importMatchFile(demo, 'not json', OPTS), 'file', 'import text')
    refused(bad, await importMatchFile(demo, text({ ...file, format: 'other' }), OPTS), 'file', 'import another format')
    refused(bad, await importMatchFile(demo, text({ ...file, schemaVersion: 2 }), OPTS), 'file', 'import schema 2')
    refused(bad, await importMatchFile(demo, text({ ...file, shots: [{ ...file.shots[0], extra: 1 }, ...file.shots.slice(1)] }), OPTS), 'file', 'import an unknown field')
    refused(bad, await importMatchFile(demo, text({ ...file, videos: [{ ...file.videos[0], matchId: 'm-x' }, ...file.videos.slice(1)] }), OPTS), 'file', 'import a stray row')
    refused(bad, await importMatchFile(demo, text({ ...file, shots: [{ ...file.shots[0], contactT: -1 }, ...file.shots.slice(1)] }), OPTS), 'invalid', 'import a bad shot')
    refused(bad, await importMatchFile(demo, text({ ...file, match: { ...file.match, resultMe: 2, resultThem: 2 } }), OPTS), 'invalid', 'import a bad result')
    refused(bad, await importMatchFile(demo, text({ ...file, match: { ...file.match, id: 'm-other' }, videos: file.videos.map((v) => ({ ...v, matchId: 'm-other' })), sets: [] , rallies: [], shots: [], drafts: [] }), OPTS), 'conflict', 'import a video id another match has')
    refused(bad, await importMatchFile(demo, text(copyMatchFile(file, 'm-copy', { setIds: true })), OPTS), 'invalid', 'import a new match id with the old set ids')
    refused(bad, await importMatchFile(demo, text(copyMatchFile(file, 'm-copy', { shotIds: true })), OPTS), 'invalid', 'import new rallies with the old shot ids')
    const otherRally = rows.rallies.find((r) => r.id !== rally.id && rows.shots.some((s) => s.rallyId === r.id))!
    const otherShot = rows.shots.find((s) => s.rallyId === otherRally.id && s.shotNumber === 1)!
    const stolen = shots.map((s) => (s.shotNumber === 1 ? { ...s, id: otherShot.id } : s))
    refused(bad, await saveRally(demo, rally, stolen, OPTS), 'invalid', "saveRally with another rally's shot id")
    refused(bad, await saveRally(demo, { ...rally, position: rally.position + 50 }, shots, OPTS), 'invalid', 'saveRally leaving a gap in the places')
    refused(bad, await reseedDemo(user, SEED, OPTS), 'conflict', 'reseed the user database')

    if ((await snapshot(demo)) !== before) bad('demo database changed')
    if ((await snapshot(user)) !== userBefore) bad('user database changed')
  })

  await check('a set, rally or shot stored under another parent is never overwritten', async (bad) => {
    await deleteDb('edge-tt-check-foreign')
    const db = createMatchDb('edge-tt-check-foreign', 'user')
    value(await saveMatch(db, seedMatch('m-complete'), OPTS), 'save m-complete')
    const file = value(await exportMatchFile(db, 'm-complete', OPTS), 'export')
    const copy = copyMatchFile(file, 'm-copy')
    const original = await snapshot(db)

    // Rows no repository writes: only a damaged database holds them.
    const plantedSet = { ...file.sets[0], id: copy.sets[0].id }
    await db.sets.put(plantedSet)
    const withSet = await snapshot(db)
    refused(bad, await importMatchFile(db, JSON.stringify(copy), OPTS), 'conflict', 'import over a set stored under another match')
    if ((await snapshot(db)) !== withSet) bad('rows changed after the set conflict')
    await db.sets.delete(plantedSet.id)

    const plantedShot = { ...file.shots[0], id: copy.shots[0].id }
    await db.shots.put(plantedShot)
    const withShot = await snapshot(db)
    refused(bad, await importMatchFile(db, JSON.stringify(copy), OPTS), 'conflict', 'import over a shot stored under another rally')
    if ((await snapshot(db)) !== withShot) bad('rows changed after the shot conflict')
    await db.shots.delete(plantedShot.id)

    const ownShot = file.shots[0]
    const rally = file.rallies.find((r) => r.id === ownShot.rallyId)!
    await db.shots.put({ ...ownShot, rallyId: 'r-elsewhere' })
    const withMoved = await snapshot(db)
    refused(bad, await saveRally(db, rally, file.shots.filter((s) => s.rallyId === rally.id), OPTS), 'conflict', 'saveRally over a shot stored under another rally')
    if ((await snapshot(db)) !== withMoved) bad('rows changed after the saveRally shot conflict')
    await db.shots.put(ownShot)
    if ((await snapshot(db)) !== original) bad('cleaning the planted rows did not restore the database')

    const done = value(await importMatchFile(db, JSON.stringify(copy), OPTS), 'import the honest copy')
    if (done.replaced) bad('the copy replaced a match')
    const after = value(await readAllRows(db), 'read')
    const before = JSON.parse(original) as DbRows
    const ofOriginal = (rows: DbRows) => {
      const sets = new Set(rows.sets.filter((s) => s.matchId === 'm-complete').map((s) => s.id))
      const rallies = new Set(rows.rallies.filter((r) => sets.has(r.setId)).map((r) => r.id))
      return stableJson({
        match: rows.matches.find((m) => m.id === 'm-complete'),
        videos: rows.videos.filter((v) => v.matchId === 'm-complete'),
        sets: rows.sets.filter((s) => sets.has(s.id)),
        rallies: rows.rallies.filter((r) => rallies.has(r.id)),
        shots: rows.shots.filter((s) => rallies.has(s.rallyId)),
      })
    }
    if (ofOriginal(after) !== ofOriginal(sortedRows(before))) bad('importing the copy changed the original match')
    if (after.matches.length !== 2) bad(`${after.matches.length} matches after the copy, want 2`)
    db.close()
    await deleteDb('edge-tt-check-foreign')
  })

  await check('a rally and its shots save in one transaction (shot write fails on purpose)', async (bad) => {
    let failShots = false
    const failing: Middleware<DBCore> = {
      stack: 'dbcore',
      name: 'fail-shots',
      create: (down) => ({
        ...down,
        table: (name): DBCoreTable => {
          const table = down.table(name)
          if (name !== 'shots') return table
          return {
            ...table,
            mutate: (req: DBCoreMutateRequest) => (failShots ? Promise.reject(new Error('injected shot failure')) : table.mutate(req)),
          }
        },
      }),
    }
    await deleteDb('edge-tt-check-atomic')
    const db = createMatchDb('edge-tt-check-atomic', 'user')
    db.use(failing)
    const match = seedMatch('m-complete')
    value(await saveMatch(db, match, OPTS), 'save m-complete')
    const rows = value(await readAllRows(db), 'read')
    const rally = rows.rallies.find((r) => r.kind === 'rally' && rows.shots.filter((s) => s.rallyId === r.id).length >= 3)!
    const shots = rows.shots.filter((s) => s.rallyId === rally.id).sort((x, y) => x.shotNumber - y.shotNumber)
    const before = await snapshot(db)

    failShots = true
    const changed = { ...rally, reviewParts: [], leftMarks: rally.leftMarks.includes('gap') ? [] : ['gap' as const] }
    const flipped = shots.map((s, i) => (i === 1 ? { ...s, wing: s.wing === 'BH' ? ('FH' as const) : ('BH' as const) } : s))
    refused(bad, await saveRally(db, changed, flipped, { now: NOW + 1000 }), 'storage', 'saveRally with the shot write failing')
    if ((await snapshot(db)) !== before) bad('saveRally: the rally row or a shot changed although the shot write failed')

    const edited = structuredClone(match)
    const r = edited.sets.flatMap((s) => s.rallies).find((x) => x.id === rally.id)!
    r.left = ['gap']
    r.shots[1] = { ...r.shots[1], wing: r.shots[1].wing === 'BH' ? 'FH' : 'BH' }
    refused(bad, await saveMatch(db, edited, { ...OPTS, now: NOW + 1000 }), 'storage', 'saveMatch with the shot write failing')
    if ((await snapshot(db)) !== before) bad('saveMatch: rows changed although the shot write failed')

    failShots = false
    const fewer = shots.slice(0, -1)
    const kept = { ...rally, pointKept: true, reviewParts: [] }
    const done = value(await saveRally(db, kept, fewer, { now: NOW + 2000 }), 'saveRally with one shot less')
    if (done.deleted !== 1) bad(`re-save deleted ${done.deleted} shots, want 1`)
    const after = value(await readAllRows(db), 'read')
    const now = after.shots.filter((s) => s.rallyId === rally.id)
    if (now.length !== shots.length - 1 || now.some((s) => s.id === shots[shots.length - 1].id)) bad('re-save did not replace the shots')
    if (after.matches[0].updatedAt !== NOW + 2000) bad('the match updatedAt did not move with the rally')
    db.close()
    await deleteDb('edge-tt-check-atomic')
  })

  await check('export then import gives identical rows; import re-links names', async (bad) => {
    if (!demoRows) return bad('no seed rows')
    await deleteDb('edge-tt-check-import')
    const into = createMatchDb('edge-tt-check-import', 'user')
    const files: MatchFile[] = []
    for (const m of SEED) {
      const file = value(await exportMatchFile(demo, m.id, OPTS), `export ${m.id}`)
      files.push(file)
      const done = value(await importMatchFile(into, serializeMatchFile(file), OPTS), `import ${m.id}`)
      if (done.replaced) bad(`${m.id} replaced on a first import`)
    }
    const got = value(await readAllRows(into), 'read')
    if (!sameRows(got, demoRows)) bad(`rows differ after import: ${rowDiff(got, demoRows).join('; ')}`)
    for (const file of files) {
      const again = value(await importMatchFile(into, serializeMatchFile(file), OPTS), `re-import ${file.match.id}`)
      if (!again.replaced || again.put !== 0 || again.deleted !== 0) bad(`re-import ${file.match.id} wrote ${again.put}/${again.deleted}`)
    }
    if (!sameRows(value(await readAllRows(into), 'read'), demoRows)) bad('rows differ after a second import')
    for (const file of files) {
      const back = value(await exportMatchFile(into, file.match.id, OPTS), `export again ${file.match.id}`)
      if (serializeMatchFile(back) !== serializeMatchFile(file)) bad(`${file.match.id}: the file exported again differs`)
    }
    into.close()
    await deleteDb('edge-tt-check-import')

    await deleteDb('edge-tt-check-relink')
    const relink = createMatchDb('edge-tt-check-relink', 'user')
    const complete = files.find((f) => f.match.id === 'm-complete')!
    const name = complete.opponent!.name
    value(await saveMatch(relink, bareMatch('m-mine', ` ${name.toUpperCase()} `), OPTS), 'save m-mine')
    const mine = value(await readAllRows(relink), 'read').opponents
    value(await importMatchFile(relink, serializeMatchFile(complete), OPTS), 'import m-complete')
    const rows = value(await readAllRows(relink), 'read')
    const linked = rows.matches.find((m) => m.id === 'm-complete')!
    if (rows.opponents.length !== 1 || linked.opponentId !== mine[0].id) bad('the imported match did not link to the stored opponent by name')
    if (rows.opponents[0].name !== mine[0].name) bad('the stored opponent row changed')
    relink.close()
    await deleteDb('edge-tt-check-relink')
  })

  await check('saving a match writes only the rows that changed', async (bad) => {
    for (const m of SEED) {
      const wrote = value(await saveMatch(demo, m, { ...OPTS, now: NOW + 5000 }), `save ${m.id}`)
      if (wrote.put + wrote.deleted !== 0) bad(`unchanged ${m.id}: put ${wrote.put}, deleted ${wrote.deleted}`)
    }
    const moved = value(await saveMatch(demo, { ...seedMatch('m-h1'), date: '2026-01-02' }, { ...OPTS, now: NOW + 6000 }), 'move m-h1')
    if (moved.put !== 1 || moved.deleted !== 0) bad(`date change: put ${moved.put}, deleted ${moved.deleted}`)
    const row = await demo.matches.get('m-h1')
    if (row?.playedOn !== '2026-01-02' || row.updatedAt !== NOW + 6000) bad('date change not written with its time')
    value(await reseedDemo(demo, SEED, OPTS), 'reseed')
  })

  await check('demo and user databases are separate', async (bad) => {
    const demoBefore = await snapshot(demo)
    if (!value(await isEmpty(user), 'isEmpty')) bad('user database is not empty at start')
    value(await saveMatch(user, bareMatch('m-user', 'Ana'), OPTS), 'save to user')
    if ((await snapshot(demo)) !== demoBefore) bad('a user write changed the demo database')
    if (await demo.matches.get('m-user')) bad('the user match is in the demo database')
    value(await reseedDemo(demo, SEED, OPTS), 'reseed')
    const users = value(await loadAll(user), 'load user').matches
    if (users.length !== 1 || users[0].id !== 'm-user') bad('reseeding the demo touched the user database')
    if ((await snapshot(demo)) !== demoBefore) bad('reseed did not give the same demo rows')
    value(await deleteMatch(user, 'm-user'), 'delete m-user')
  })

  await check('names link on commit, unique ignoring case; rename and remove; drafts one per set; load order', async (bad) => {
    await deleteDb('edge-tt-check-names')
    const db = createMatchDb('edge-tt-check-names', 'user')
    const names = async () => value(await readAllRows(db), 'read').opponents.map((o) => o.name).sort()
    value(await saveMatch(db, bareMatch('m-n1', 'Bo', 'Open'), OPTS), 'Bo')
    value(await saveMatch(db, bareMatch('m-n1', 'Bob', 'Open'), OPTS), 'Bob')
    if (stableJson(await names()) !== stableJson(['Bob'])) bad(`after Bo then Bob: ${(await names()).join(',')}`)
    value(await saveMatch(db, bareMatch('m-n2', '  bob '), OPTS), 'bob')
    const rows = value(await readAllRows(db), 'read')
    const bob = rows.opponents[0]
    if (rows.opponents.length !== 1 || rows.matches.some((m) => m.opponentId !== bob.id)) bad('bob did not link to Bob')
    const renamed = value(await renameOpponent(db, bob.id, 'Robert', OPTS), 'rename')
    if (stableJson(renamed.matchIds.sort()) !== stableJson(['m-n1', 'm-n2'])) bad(`rename matches ${renamed.matchIds}`)
    const loaded = value(await loadAll(db), 'load').matches
    if (loaded.some((m) => m.opponent !== 'Robert')) bad('rename did not reach every match')
    value(await renameOpponent(db, bob.id, 'robert', OPTS), 'rename case only')
    refused(bad, await removeOpponent(db, bob.id), 'conflict', 'remove while linked')
    value(await saveMatch(db, bareMatch('m-n1', '', 'Open'), OPTS), 'clear m-n1 opponent')
    if ((await names()).length !== 1) bad('a row still linked was removed')
    value(await deleteMatch(db, 'm-n2'), 'delete m-n2')
    if ((await names()).length !== 1) bad('deleting a match removed its opponent row')
    value(await removeOpponent(db, bob.id), 'remove unlinked')
    if ((await names()).length !== 0) bad('remove did not remove')

    const withVideo: MatchRecord = {
      ...bareMatch('m-n1', '', 'Open'),
      videos: [{ id: 'v-n1', fileName: 'a.mp4', sizeMb: 1, archived: false, kind: 'file', durationS: 60 }],
    }
    value(await saveMatch(db, withVideo, OPTS), 'video')
    const draft = { ...emptyDraft('v-n1', 'me' as const), contacts: [1, 2], shots: [{}, {}] }
    value(await saveDraft(db, 'm-n1', 1, draft, OPTS), 'draft')
    value(await saveDraft(db, 'm-n1', 1, { ...draft, contacts: [1, 2, 3], shots: [{}, {}, {}] }, OPTS), 'draft again')
    const drafts = await db.drafts.toArray()
    if (drafts.length !== 1 || drafts[0].rally.contacts.length !== 3) bad('not one draft per set')
    const file = value(await exportMatchFile(db, 'm-n1', OPTS), 'export with draft')
    await deleteDb('edge-tt-check-names-2')
    const copy = createMatchDb('edge-tt-check-names-2', 'user')
    value(await importMatchFile(copy, serializeMatchFile(file), OPTS), 'import with draft')
    const back = value(await exportMatchFile(copy, 'm-n1', OPTS), 'export the copy')
    if (serializeMatchFile(back) !== serializeMatchFile(file)) bad('a draft did not survive export and import')
    copy.close()
    await deleteDb('edge-tt-check-names-2')
    value(await saveDraft(db, 'm-n1', 1, null, OPTS), 'clear draft')
    if ((await db.drafts.count()) !== 0) bad('null did not clear the draft')

    value(await saveMatch(db, bareMatch('m-b', 'X'), { ...OPTS, now: NOW + 10 }), 'm-b')
    value(await saveMatch(db, bareMatch('m-a', 'X'), { ...OPTS, now: NOW + 10 }), 'm-a')
    value(await saveMatch(db, bareMatch('m-c', 'X'), { ...OPTS, now: NOW + 5 }), 'm-c')
    const order = value(await loadAll(db), 'load').matches.map((m) => m.id)
    if (stableJson(order) !== stableJson(['m-n1', 'm-c', 'm-a', 'm-b'])) bad(`load order ${order.join(',')}`)
    db.close()
    await deleteDb('edge-tt-check-names')
  })

  await check('old storage cleanup removes the known old names and keeps current and unknown ones', async (bad) => {
    const local = [...OLD_LOCAL_KEYS, ...OLD_LOCAL_PREFIXES.map((p) => `${p}x1`), 'sb-127-auth-token', 'sb-abcdefghijklmnopqrst-auth-token-code-verifier']
    const keepLocal = [...SETTINGS_STORAGE_KEYS.local, 'unknown-key']
    const keepSession = [...SETTINGS_STORAGE_KEYS.session, 'unknown-session']
    for (const key of [...local, ...keepLocal]) localStorage.setItem(key, '1')
    for (const key of [...OLD_SESSION_KEYS, ...keepSession]) sessionStorage.setItem(key, '1')
    for (const name of [...OLD_DATABASES, 'someone-elses-db']) {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(name, 3)
        req.onupgradeneeded = () => req.result.createObjectStore('rows', { keyPath: 'id' })
        req.onsuccess = () => {
          req.result.close()
          resolve()
        }
        req.onerror = () => reject(req.error)
      })
    }
    const root = await navigator.storage.getDirectory()
    for (const dir of [...OLD_OPFS_DIRS, 'keep-me']) {
      const handle = await root.getDirectoryHandle(dir, { create: true })
      const fileHandle = await handle.getFileHandle('clip.mp4', { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write('video')
      await writable.close()
    }

    const report = await cleanupOldStorage()
    const has = (list: string[], want: readonly string[]) => stableJson([...list].sort()) === stableJson([...want].sort())
    if (!has(report.localKeys, local)) bad(`local removed ${report.localKeys.join(',')}`)
    if (!has(report.sessionKeys, OLD_SESSION_KEYS)) bad(`session removed ${report.sessionKeys.join(',')}`)
    if (!has(report.databases, OLD_DATABASES)) bad(`databases removed ${report.databases.join(',')}`)
    if (!has(report.opfsDirs, OLD_OPFS_DIRS)) bad(`directories removed ${report.opfsDirs.join(',')}`)
    for (const key of local) if (localStorage.getItem(key) !== null) bad(`${key} still in localStorage`)
    for (const key of keepLocal) if (localStorage.getItem(key) !== '1') bad(`${key} was removed`)
    for (const key of OLD_SESSION_KEYS) if (sessionStorage.getItem(key) !== null) bad(`${key} still in sessionStorage`)
    for (const key of keepSession) if (sessionStorage.getItem(key) !== '1') bad(`${key} was removed from sessionStorage`)
    const left = new Set((await indexedDB.databases()).map((d) => d.name))
    for (const name of OLD_DATABASES) if (left.has(name)) bad(`${name} still there`)
    for (const name of ['someone-elses-db', USER_DB_NAME, DEMO_DB_NAME]) if (!left.has(name)) bad(`${name} was removed`)
    const dirs: string[] = []
    for await (const name of (root as unknown as { keys(): AsyncIterable<string> }).keys()) dirs.push(name)
    if (dirs.some((d) => (OLD_OPFS_DIRS as readonly string[]).includes(d))) bad(`old directory left: ${dirs.join(',')}`)
    if (!dirs.includes('keep-me')) bad('keep-me directory was removed')
    if ((await snapshot(demo)) !== stableJson(sortedRows(demoRows!))) bad('the demo database changed')

    const again = await cleanupOldStorage()
    if (again.localKeys.length + again.sessionKeys.length + again.databases.length + again.opfsDirs.length !== 0) bad(`second run removed ${JSON.stringify(again)}`)
    await root.removeEntry('keep-me', { recursive: true })
    await deleteDb('someone-elses-db')
  })

  await check('persistent storage and quota helpers return values', async (bad) => {
    const granted = await requestPersistentStorage()
    if (typeof granted !== 'boolean') bad(`persist ${granted}`)
    const info = await readStorageInfo()
    if (typeof info.persisted !== 'boolean') bad(`persisted ${info.persisted}`)
    if (typeof info.usage !== 'number' || info.usage < 0) bad(`usage ${info.usage}`)
    if (typeof info.quota !== 'number' || info.quota <= 0) bad(`quota ${info.quota}`)
    if (granted !== null && info.persisted !== granted) bad(`persisted ${info.persisted} after persist ${granted}`)
    storage = { granted, ...info }
  })

  return { checks, rows: demoRows, storage }
}

declare global {
  interface Window {
    __dbCheck?: { run: typeof run }
  }
}

window.__dbCheck = { run }
