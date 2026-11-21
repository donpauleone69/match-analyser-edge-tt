/**
 * Matches in memory to database rows, and rows back. Pure. Rows keep only what
 * the user did; on the way back the derived fields (fa, serveChecked and the
 * Best + FA `idea` copies) are worked out again, so the app sees what it had.
 * Opponent and event text links to the row with the same name, ignoring case
 * and outer spaces, or a new row.
 */
import type {
  DbRows,
  Depth,
  DraftRow,
  EventRow,
  MatchRow,
  OpponentRow,
  Outcome,
  RallyRow,
  SetRow,
  ShotRow,
  Stroke,
  VideoRow,
} from '@/types/db'
import type { MatchRecord, RemovedVideo, SetData, VideoAsset } from '@/types/match'
import type { RallyData, ShotTags } from '@/types/rally'
import { bestOpener } from './bestFa'
import { deletedOf, withDeleted } from './matchOps'

export const CHECK_THE_POINT = 'Check the point'
export const BYTES_PER_MB = 1_000_000

/** `now` stamps rows that are new or changed. `prev` keeps the stamps of rows already stored. */
export type RowContext = {
  now: number
  prev?: DbRows | null
  removedVideos?: Readonly<Record<string, RemovedVideo>>
}

export const EMPTY_ROWS: DbRows = {
  opponents: [],
  events: [],
  matches: [],
  videos: [],
  sets: [],
  rallies: [],
  shots: [],
  drafts: [],
}

export const deriveSetRowId = (matchId: string, setNumber: number) => `${matchId}:${setNumber}`
export const deriveShotRowId = (rallyId: string, shotNumber: number) => `${rallyId}:${shotNumber}`
export const deriveNameKey = (name: string) => name.trim().toLowerCase()

/** Win when you won more sets. Null until both are typed. */
export function deriveOutcome(me: number | null, them: number | null): Outcome | null {
  if (me === null || them === null) return null
  return me > them ? 'Win' : 'Loss'
}

/** JSON with sorted keys and undefined left out, so two equal rows give one text. */
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.keys(value)
      .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

function byId<T extends { id: string }>(rows: readonly T[] | undefined): Map<string, T> {
  return new Map((rows ?? []).map((row) => [row.id, row]))
}

function groupBy<T>(rows: readonly T[], key: (row: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>()
  for (const row of rows) {
    const k = key(row)
    const list = out.get(k)
    if (list) list.push(row)
    else out.set(k, [row])
  }
  return out
}

type Named = { id: string; name: string; createdAt: number; updatedAt: number }

/** Finds the row for a typed name, or adds one. Empty text links to nothing. */
function linker<T extends Named>(rows: T[], prefix: string, now: number, blank: (id: string, name: string) => T) {
  const byKey = new Map(rows.map((row) => [deriveNameKey(row.name), row]))
  const ids = new Set(rows.map((row) => row.id))
  let next = 0
  return (text: string): string | null => {
    const name = text.trim()
    if (!name) return null
    const found = byKey.get(deriveNameKey(name))
    if (found) return found.id
    let id = `${prefix}-${now}-${next}`
    while (ids.has(id)) id = `${prefix}-${now}-${++next}`
    next += 1
    ids.add(id)
    const row = blank(id, name)
    rows.push(row)
    byKey.set(deriveNameKey(name), row)
    return id
  }
}

function enteredNumber(text: string): number | null {
  return text === '' ? null : Number(text)
}

function videoRow(
  v: VideoAsset,
  matchId: string,
  position: number,
  removedAt: number | null,
  prev: VideoRow | undefined,
  now: number,
): VideoRow {
  return {
    id: v.id,
    matchId,
    position,
    fileName: v.fileName,
    sizeBytes: Math.round(v.sizeMb * BYTES_PER_MB),
    durationS: v.durationS,
    lastModifiedMs: prev?.lastModifiedMs ?? null,
    fingerprint: prev?.fingerprint ?? null,
    storedOnDevice: prev?.storedOnDevice ?? false,
    archivedAt: v.archived ? (prev?.archivedAt ?? now) : null,
    myEnd: v.myEnd ?? null,
    removedAt,
    demoScript: v.script ?? null,
  }
}

function rallyRow(
  r: RallyData,
  setId: string,
  position: number,
  deletedAt: number | null,
  prev: RallyRow | undefined,
  now: number,
): RallyRow {
  return {
    id: r.id,
    setId,
    videoId: r.videoId,
    kind: r.point ? 'point' : 'rally',
    position,
    server: r.server,
    startT: r.start,
    endT: r.end,
    ending: r.ending,
    winner: r.winner,
    pointKept: Boolean(r.idea?.check),
    reviewParts: [...(r.idea?.review ?? [])],
    leftMarks: [...(r.left ?? [])],
    createdAt: prev?.createdAt ?? now,
    deletedAt,
  }
}

function shotRows(r: RallyData): ShotRow[] {
  return r.contacts.map((contactT, i) => {
    const tags = r.shots[i] ?? {}
    return {
      id: deriveShotRowId(r.id, i + 1),
      rallyId: r.id,
      shotNumber: i + 1,
      contactT,
      wing: tags.wing ?? null,
      depth: (tags.depth as Depth | undefined) ?? null,
      stroke: (tags.stroke as Stroke | undefined) ?? null,
    }
  })
}

function setRow(m: MatchRecord, s: SetData, prev: SetRow | undefined, now: number): SetRow {
  const mark = s.mark
  return {
    id: deriveSetRowId(m.id, s.setId),
    matchId: m.id,
    setNumber: s.setId,
    enteredMe: enteredNumber(s.entered.me),
    enteredThem: enteredNumber(s.entered.them),
    firstServer: s.firstServer,
    finishedAt: s.finished ? (prev?.finishedAt ?? now) : null,
    markFromVideoId: mark?.from.videoId ?? null,
    markFromT: mark?.from.t ?? null,
    markToVideoId: mark?.to.videoId ?? null,
    markToT: mark?.to.t ?? null,
    markComplete: mark ? mark.complete : null,
  }
}

type ChildRows = Pick<DbRows, 'videos' | 'sets' | 'rallies' | 'shots' | 'drafts'>

/** The video, set, rally, shot and draft rows of one match. */
export function deriveMatchChildRows(rows: DbRows, matchId: string): ChildRows {
  const sets = rows.sets.filter((s) => s.matchId === matchId)
  const setIds = new Set(sets.map((s) => s.id))
  const rallies = rows.rallies.filter((r) => setIds.has(r.setId))
  const rallyIds = new Set(rallies.map((r) => r.id))
  return {
    videos: rows.videos.filter((v) => v.matchId === matchId),
    sets,
    rallies,
    shots: rows.shots.filter((s) => rallyIds.has(s.rallyId)),
    drafts: rows.drafts.filter((d) => setIds.has(d.setId)),
  }
}

/** Ids of removed videos this match still names: rallies, drafts and marks. */
function namedVideoIds(m: MatchRecord): string[] {
  const out: string[] = []
  const add = (id: string) => {
    if (!out.includes(id)) out.push(id)
  }
  for (const s of m.sets) {
    for (const r of [...s.rallies, ...deletedOf(s)]) add(r.videoId)
    if (s.draft) add(s.draft.videoId)
    if (s.mark) {
      add(s.mark.from.videoId)
      add(s.mark.to.videoId)
    }
  }
  const listed = new Set(m.videos.map((v) => v.id))
  return out.filter((id) => !listed.has(id))
}

function childRowsOf(m: MatchRecord, ctx: RowContext, prev: ReturnType<typeof prevIndex>): ChildRows {
  const { now } = ctx
  const videos = m.videos.map((v, i) => videoRow(v, m.id, i, null, prev.videos.get(v.id), now))
  for (const id of namedVideoIds(m)) {
    const removed = ctx.removedVideos?.[id]
    if (!removed) continue
    const was = prev.videos.get(id)
    videos.push(videoRow(removed.video, m.id, removed.index, was?.removedAt ?? now, was, now))
  }
  const sets: SetRow[] = []
  const rallies: RallyRow[] = []
  const shots: ShotRow[] = []
  const drafts: DraftRow[] = []
  for (const s of m.sets) {
    const row = setRow(m, s, prev.sets.get(deriveSetRowId(m.id, s.setId)), now)
    sets.push(row)
    s.rallies.forEach((r, i) => {
      rallies.push(rallyRow(r, row.id, i, null, prev.rallies.get(r.id), now))
      shots.push(...shotRows(r))
    })
    deletedOf(s).forEach((r, i) => {
      const was = prev.rallies.get(r.id)
      rallies.push(rallyRow(r, row.id, i, was?.deletedAt ?? now, was, now))
      shots.push(...shotRows(r))
    })
    if (s.draft) drafts.push({ setId: row.id, rally: s.draft })
  }
  return { videos, sets, rallies, shots, drafts }
}

/** Child rows sorted by key, so stored rows (read in key order) compare equal to rows built in list order. */
function inKeyOrder(kids: ChildRows): ChildRows {
  const sort = <T>(rows: readonly T[], key: (row: T) => string) => [...rows].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0))
  const id = (row: { id: string }) => row.id
  return {
    videos: sort(kids.videos, id),
    sets: sort(kids.sets, id),
    rallies: sort(kids.rallies, id),
    shots: sort(kids.shots, id),
    drafts: sort(kids.drafts, (d) => d.setId),
  }
}

function prevIndex(prev: DbRows | null | undefined) {
  return {
    matches: byId(prev?.matches),
    videos: byId(prev?.videos),
    sets: byId(prev?.sets),
    rallies: byId(prev?.rallies),
  }
}

/**
 * Every row for these matches. Opponent and event rows already stored stay,
 * with no match or with one. A match's `updatedAt` moves only when one of its
 * rows changed.
 */
export function deriveDbRows(matches: readonly MatchRecord[], ctx: RowContext): DbRows {
  const { now } = ctx
  const prevRows = ctx.prev ?? EMPTY_ROWS
  const prev = prevIndex(prevRows)
  const opponents: OpponentRow[] = prevRows.opponents.map((row) => ({ ...row }))
  const events: EventRow[] = prevRows.events.map((row) => ({ ...row }))
  const opponentOf = linker(opponents, 'o', now, (id, name) => ({
    id,
    name,
    club: null,
    handedness: null,
    style: null,
    birthYear: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  }))
  const eventOf = linker(events, 'e', now, (id, name) => ({
    id,
    name,
    location: null,
    rankingStatus: null,
    importance: null,
    createdAt: now,
    updatedAt: now,
  }))
  const out: DbRows = { ...EMPTY_ROWS, opponents, events, matches: [] }
  const children: ChildRows = { videos: [], sets: [], rallies: [], shots: [], drafts: [] }
  for (const m of matches) {
    const was = prev.matches.get(m.id)
    const kids = childRowsOf(m, ctx, prev)
    const row: MatchRow = {
      id: m.id,
      opponentId: opponentOf(m.opponent),
      eventId: eventOf(m.event),
      playedOn: m.date === '' ? null : m.date,
      category: m.category ?? null,
      stage: m.stage ?? null,
      round: m.round ?? null,
      outcome: deriveOutcome(m.result.me, m.result.them) ?? m.outcome ?? null,
      resultMe: m.result.me,
      resultThem: m.result.them,
      createdAt: was?.createdAt ?? now,
      updatedAt: now,
    }
    if (was) {
      const same =
        stableJson({ ...row, updatedAt: 0 }) === stableJson({ ...was, updatedAt: 0 }) &&
        stableJson(inKeyOrder(kids)) === stableJson(inKeyOrder(deriveMatchChildRows(prevRows, m.id)))
      if (same) row.updatedAt = was.updatedAt
    }
    out.matches.push(row)
    for (const key of Object.keys(children) as (keyof ChildRows)[]) {
      ;(children[key] as unknown[]).push(...kids[key])
    }
  }
  return { ...out, ...children }
}

function shotTags(row: ShotRow): ShotTags {
  return {
    ...(row.wing !== null ? { wing: row.wing } : {}),
    ...(row.stroke !== null ? { stroke: row.stroke } : {}),
    ...(row.depth !== null ? { depth: row.depth } : {}),
  }
}

/** A saved rally as the app holds it. Every saved rally with contacts is a Best + FA save. */
export function deriveRallyData(row: RallyRow, shots: readonly ShotRow[]): RallyData {
  const ordered = [...shots].sort((a, b) => a.shotNumber - b.shotNumber)
  const tags = ordered.map(shotTags)
  const n = ordered.length
  const opener = bestOpener(n, tags)
  const base: RallyData = {
    id: row.id,
    videoId: row.videoId,
    server: row.server,
    contacts: ordered.map((s) => s.contactT),
    start: row.startT,
    end: row.endT,
    ending: row.ending,
    fa: typeof opener === 'number' ? opener : null,
    shots: tags,
    winner: row.winner,
    ...(row.leftMarks.length ? { left: [...row.leftMarks] } : {}),
  }
  if (row.kind === 'point') return { ...base, point: true }
  const result = n === 1 && row.ending ? (row.ending === 'Winner' ? 'Ace' : 'Serve fault') : row.ending
  return {
    ...base,
    serveChecked: true,
    idea: {
      flow: 'bestfa',
      ...(tags[0]?.depth ? { serve: tags[0].depth } : {}),
      ...(result ? { result } : {}),
      ...(row.reviewParts.length ? { review: [...row.reviewParts] } : {}),
      ...(row.pointKept ? { check: CHECK_THE_POINT } : {}),
    },
  }
}

function videoAsset(row: VideoRow): VideoAsset {
  return {
    id: row.id,
    fileName: row.fileName,
    sizeMb: row.sizeBytes / BYTES_PER_MB,
    archived: row.archivedAt !== null,
    kind: row.demoScript ? 'demo' : 'file',
    durationS: row.durationS,
    ...(row.demoScript ? { script: row.demoScript } : {}),
    ...(row.myEnd !== null ? { myEnd: row.myEnd } : {}),
  }
}

/**
 * The matches back from rows, oldest `createdAt` first (rows with the same
 * time keep their order), and the removed videos their rallies still name.
 */
export function deriveMatchRecords(rows: DbRows): { matches: MatchRecord[]; removedVideos: Record<string, RemovedVideo> } {
  const opponents = byId(rows.opponents)
  const events = byId(rows.events)
  const videosOf = groupBy(rows.videos, (v) => v.matchId)
  const setsOf = groupBy(rows.sets, (s) => s.matchId)
  const ralliesOf = groupBy(rows.rallies, (r) => r.setId)
  const shotsOf = groupBy(rows.shots, (s) => s.rallyId)
  const drafts = new Map(rows.drafts.map((d) => [d.setId, d.rally]))
  const removedVideos: Record<string, RemovedVideo> = {}
  const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position

  const matches = [...rows.matches]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((row): MatchRecord => {
      const videoRows = [...(videosOf.get(row.id) ?? [])].sort(byPosition)
      for (const v of videoRows) {
        if (v.removedAt !== null) removedVideos[v.id] = { video: videoAsset(v), index: v.position }
      }
      const sets = [...(setsOf.get(row.id) ?? [])]
        .sort((a, b) => a.setNumber - b.setNumber)
        .map((s): SetData => {
          const all = [...(ralliesOf.get(s.id) ?? [])].sort(byPosition)
          const rally = (r: RallyRow) => deriveRallyData(r, shotsOf.get(r.id) ?? [])
          const set: SetData = {
            setId: s.setNumber,
            entered: {
              me: s.enteredMe === null ? '' : String(s.enteredMe),
              them: s.enteredThem === null ? '' : String(s.enteredThem),
            },
            finished: s.finishedAt !== null,
            firstServer: s.firstServer,
            rallies: all.filter((r) => r.deletedAt === null).map(rally),
            draft: drafts.get(s.id) ?? null,
            mark:
              s.markFromVideoId === null || s.markToVideoId === null
                ? null
                : {
                    from: { videoId: s.markFromVideoId, t: s.markFromT ?? 0 },
                    to: { videoId: s.markToVideoId, t: s.markToT ?? 0 },
                    complete: s.markComplete === true,
                  },
          }
          const deleted = all.filter((r) => r.deletedAt !== null).map(rally)
          return deleted.length ? withDeleted(set, deleted) : set
        })
      const outcome = row.resultMe === null || row.resultThem === null ? row.outcome : null
      return {
        id: row.id,
        opponent: row.opponentId ? (opponents.get(row.opponentId)?.name ?? '') : '',
        event: row.eventId ? (events.get(row.eventId)?.name ?? '') : '',
        date: row.playedOn ?? '',
        result: { me: row.resultMe, them: row.resultThem },
        videos: videoRows.filter((v) => v.removedAt === null).map(videoAsset),
        sets,
        ...(row.category !== null ? { category: row.category } : {}),
        ...(row.stage !== null ? { stage: row.stage } : {}),
        ...(row.round !== null ? { round: row.round } : {}),
        ...(outcome !== null ? { outcome } : {}),
      }
    })
  return { matches, removedVideos }
}
