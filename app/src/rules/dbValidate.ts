/**
 * Checks before a row is written. Each returns the refused values and never
 * throws; an empty list means the write may go ahead. `validateDbRows` adds
 * the rules across rows: unique keys, links, numbering and unique names.
 */
import {
  CATEGORIES,
  DEPTHS,
  HANDEDNESS,
  IMPORTANCES,
  LEFT_MARKS,
  MY_ENDS,
  OPPONENT_STYLES,
  OUTCOMES,
  RALLY_KINDS,
  RANKING_STATUSES,
  REVIEW_PARTS,
  ROUNDS,
  SIDES,
  STAGES,
  STROKES,
  type DbError,
  type DbRows,
  type DbTable,
  type DraftRow,
  type EventRow,
  type MatchRow,
  type OpponentRow,
  type RallyRow,
  type SetRow,
  type ShotRow,
  type VideoRow,
} from '@/types/db'
import { ENDINGS, WINGS } from '@/types/rally'
import { bestParts } from './bestFa'
import { deriveNameKey, deriveOutcome } from './dbRows'
import { MAX_SETS } from './matchOps'
import { isRealResult } from './matchStatus'
import { winnerOf } from './rally'

/** Contacts closer than this are never stored (I-2). */
export const MIN_CONTACT_GAP_S = 0.05
export const MIN_BIRTH_YEAR = 1900
/** Two digits, as the Details score box takes. */
export const MAX_ENTERED_POINTS = 99
const EPS = 1e-6

type Say = (field: string, problem: string) => void

function collector(table: DbTable, id: string): { out: DbError[]; say: Say } {
  const out: DbError[] = []
  return { out, say: (field, problem) => out.push({ table, id, field, problem }) }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.trim() === v
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
const isMs = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0
const isInt = (v: unknown, lo: number, hi: number): v is number =>
  Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => list.includes(v as T)

function isIsoDate(v: unknown): boolean {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}

function need(say: Say, field: string, ok: boolean, problem: string) {
  if (!ok) say(field, problem)
}

function nullable(say: Say, field: string, v: unknown, ok: (v: unknown) => boolean, problem: string) {
  if (v !== null && !ok(v)) say(field, `${problem} or null`)
}

function enumOrNull<T extends string>(say: Say, field: string, list: readonly T[], v: unknown) {
  nullable(say, field, v, (x) => oneOf(list, x), `one of ${list.join(', ')}`)
}

function stamps(say: Say, row: { createdAt: unknown; updatedAt: unknown }) {
  need(say, 'createdAt', isMs(row.createdAt), 'whole ms at or after 0')
  need(say, 'updatedAt', isMs(row.updatedAt), 'whole ms at or after 0')
  if (isMs(row.createdAt) && isMs(row.updatedAt) && row.updatedAt < row.createdAt) say('updatedAt', 'not before createdAt')
}

function list<T extends string>(say: Say, field: string, items: readonly T[], v: unknown) {
  if (!Array.isArray(v) || v.some((x) => !oneOf(items, x))) say(field, `a list of ${items.join(', ')}`)
  else if (new Set(v).size !== v.length) say(field, 'each value once')
}

export function validateOpponentRow(row: OpponentRow, today: Date = new Date()): DbError[] {
  const { out, say } = collector('opponents', String(row.id))
  need(say, 'id', isText(row.id), 'an id')
  need(say, 'name', isText(row.name), 'trimmed text')
  nullable(say, 'club', row.club, isText, 'trimmed text')
  enumOrNull(say, 'handedness', HANDEDNESS, row.handedness)
  enumOrNull(say, 'style', OPPONENT_STYLES, row.style)
  nullable(say, 'birthYear', row.birthYear, (v) => isInt(v, MIN_BIRTH_YEAR, today.getUTCFullYear()), `a year ${MIN_BIRTH_YEAR} to this year`)
  nullable(say, 'notes', row.notes, (v) => typeof v === 'string', 'text')
  stamps(say, row)
  return out
}

export function validateEventRow(row: EventRow): DbError[] {
  const { out, say } = collector('events', String(row.id))
  need(say, 'id', isText(row.id), 'an id')
  need(say, 'name', isText(row.name), 'trimmed text')
  nullable(say, 'location', row.location, isText, 'trimmed text')
  enumOrNull(say, 'rankingStatus', RANKING_STATUSES, row.rankingStatus)
  enumOrNull(say, 'importance', IMPORTANCES, row.importance)
  stamps(say, row)
  return out
}

export function validateMatchRow(row: MatchRow): DbError[] {
  const { out, say } = collector('matches', String(row.id))
  need(say, 'id', isText(row.id), 'an id')
  nullable(say, 'opponentId', row.opponentId, isText, 'an id')
  nullable(say, 'eventId', row.eventId, isText, 'an id')
  nullable(say, 'playedOn', row.playedOn, isIsoDate, 'a YYYY-MM-DD date')
  enumOrNull(say, 'category', CATEGORIES, row.category)
  enumOrNull(say, 'stage', STAGES, row.stage)
  enumOrNull(say, 'round', ROUNDS, row.round)
  if (row.round !== null && row.stage !== 'Knockout') say('round', 'only when stage is Knockout')
  enumOrNull(say, 'outcome', OUTCOMES, row.outcome)
  const me = row.resultMe
  const them = row.resultThem
  if ((me === null) !== (them === null)) say('resultThem', 'both results set, or both null')
  else if (me !== null && them !== null) {
    if (!Number.isInteger(me) || !Number.isInteger(them) || me < 0 || them < 0 || !isRealResult({ me, them })) {
      say('resultMe', 'a best of 3, 5 or 7 result')
    } else if (row.outcome !== deriveOutcome(me, them)) {
      say('outcome', `${deriveOutcome(me, them)} for ${me} - ${them}`)
    }
  }
  stamps(say, row)
  return out
}

function isScript(v: unknown): boolean {
  return isObject(v) && isTime(v.duration) && Array.isArray(v.rallies) && Array.isArray(v.breaks)
}

export function validateVideoRow(row: VideoRow): DbError[] {
  const { out, say } = collector('videos', String(row.id))
  need(say, 'id', isText(row.id), 'an id')
  need(say, 'matchId', isText(row.matchId), 'an id')
  need(say, 'position', isInt(row.position, 0, Number.MAX_SAFE_INTEGER), 'a whole number at or after 0')
  need(say, 'fileName', typeof row.fileName === 'string' && row.fileName.length > 0, 'a file name')
  need(say, 'sizeBytes', isInt(row.sizeBytes, 0, Number.MAX_SAFE_INTEGER), 'whole bytes at or after 0')
  need(say, 'durationS', isTime(row.durationS), 'seconds at or after 0')
  nullable(say, 'lastModifiedMs', row.lastModifiedMs, isMs, 'whole ms at or after 0')
  nullable(say, 'fingerprint', row.fingerprint, isText, 'text')
  need(say, 'storedOnDevice', typeof row.storedOnDevice === 'boolean', 'true or false')
  nullable(say, 'archivedAt', row.archivedAt, isMs, 'whole ms at or after 0')
  enumOrNull(say, 'myEnd', MY_ENDS, row.myEnd)
  nullable(say, 'removedAt', row.removedAt, isMs, 'whole ms at or after 0')
  nullable(say, 'demoScript', row.demoScript, isScript, 'a demo script')
  return out
}

export function validateSetRow(row: SetRow): DbError[] {
  const { out, say } = collector('sets', String(row.id))
  need(say, 'id', isText(row.id), 'an id')
  need(say, 'matchId', isText(row.matchId), 'an id')
  need(say, 'setNumber', isInt(row.setNumber, 1, MAX_SETS), `1 to ${MAX_SETS}`)
  nullable(say, 'enteredMe', row.enteredMe, (v) => isInt(v, 0, MAX_ENTERED_POINTS), `0 to ${MAX_ENTERED_POINTS}`)
  nullable(say, 'enteredThem', row.enteredThem, (v) => isInt(v, 0, MAX_ENTERED_POINTS), `0 to ${MAX_ENTERED_POINTS}`)
  need(say, 'firstServer', oneOf(SIDES, row.firstServer), 'me or them')
  nullable(say, 'finishedAt', row.finishedAt, isMs, 'whole ms at or after 0')
  const mark = [row.markFromVideoId, row.markFromT, row.markToVideoId, row.markToT, row.markComplete]
  if (mark.every((v) => v === null)) return out
  if (mark.some((v) => v === null)) {
    say('markFromVideoId', 'all five mark fields set, or all null')
    return out
  }
  need(say, 'markFromVideoId', isText(row.markFromVideoId), 'an id')
  need(say, 'markToVideoId', isText(row.markToVideoId), 'an id')
  need(say, 'markFromT', isTime(row.markFromT), 'seconds at or after 0')
  need(say, 'markToT', isTime(row.markToT), 'seconds at or after 0')
  need(say, 'markComplete', typeof row.markComplete === 'boolean', 'true or false')
  if (row.markFromVideoId === row.markToVideoId && isTime(row.markFromT) && isTime(row.markToT) && row.markFromT > row.markToT + EPS) {
    say('markToT', 'not before markFromT on the same video')
  }
  return out
}

export function validateShotRow(row: ShotRow): DbError[] {
  const { out, say } = collector('shots', String(row.id))
  need(say, 'id', isText(row.id), 'an id')
  need(say, 'rallyId', isText(row.rallyId), 'an id')
  need(say, 'shotNumber', isInt(row.shotNumber, 1, Number.MAX_SAFE_INTEGER), 'a whole number from 1')
  need(say, 'contactT', isTime(row.contactT), 'seconds at or after 0')
  enumOrNull(say, 'wing', WINGS, row.wing)
  enumOrNull(say, 'depth', DEPTHS, row.depth)
  enumOrNull(say, 'stroke', STROKES, row.stroke)
  return out
}

/** One rally and its shots. Shots from 1 to n, contacts apart, the winner, review parts. */
export function validateRallyRow(row: RallyRow, shots: readonly ShotRow[]): DbError[] {
  const { out, say } = collector('rallies', String(row.id))
  need(say, 'id', isText(row.id), 'an id')
  need(say, 'setId', isText(row.setId), 'an id')
  need(say, 'videoId', isText(row.videoId), 'an id')
  need(say, 'kind', oneOf(RALLY_KINDS, row.kind), 'rally or point')
  need(say, 'position', isInt(row.position, 0, Number.MAX_SAFE_INTEGER), 'a whole number at or after 0')
  need(say, 'server', oneOf(SIDES, row.server), 'me or them')
  need(say, 'startT', isTime(row.startT), 'seconds at or after 0')
  need(say, 'endT', isTime(row.endT), 'seconds at or after 0')
  if (isTime(row.startT) && isTime(row.endT) && row.startT > row.endT + EPS) say('endT', 'not before startT')
  enumOrNull(say, 'ending', ENDINGS, row.ending)
  need(say, 'winner', oneOf(SIDES, row.winner), 'me or them')
  need(say, 'pointKept', typeof row.pointKept === 'boolean', 'true or false')
  list(say, 'reviewParts', REVIEW_PARTS, row.reviewParts)
  list(say, 'leftMarks', LEFT_MARKS, row.leftMarks)
  need(say, 'createdAt', isMs(row.createdAt), 'whole ms at or after 0')
  nullable(say, 'deletedAt', row.deletedAt, isMs, 'whole ms at or after 0')

  for (const shot of shots) {
    out.push(...validateShotRow(shot))
    if (shot.rallyId !== row.id) out.push({ table: 'shots', id: shot.id, field: 'rallyId', problem: `the rally ${row.id}` })
  }
  const ordered = [...shots].sort((a, b) => a.shotNumber - b.shotNumber)
  ordered.forEach((shot, i) => {
    if (shot.shotNumber !== i + 1) out.push({ table: 'shots', id: shot.id, field: 'shotNumber', problem: `${i + 1}: shots run 1 to n` })
    const prev = ordered[i - 1]
    if (prev && isTime(shot.contactT) && isTime(prev.contactT) && shot.contactT - prev.contactT < MIN_CONTACT_GAP_S - EPS) {
      out.push({ table: 'shots', id: shot.id, field: 'contactT', problem: `at least ${MIN_CONTACT_GAP_S}s after shot ${i}` })
    }
  })

  const n = ordered.length
  if (row.kind === 'point') {
    need(say, 'ending', row.ending === null, 'null on a point')
    if (n > 0) say('kind', 'a point has no shots')
    if (row.startT !== row.endT) say('endT', 'equal to startT on a point')
    if (row.reviewParts.length > 0) say('reviewParts', 'empty on a point')
    if (row.pointKept) say('pointKept', 'false on a point')
    return out
  }
  if (row.ending === null) say('ending', 'set on a rally')
  if (n === 0) {
    say('kind', 'a rally has at least one shot')
    return out
  }
  const first = ordered[0].contactT
  const last = ordered[n - 1].contactT
  if (row.startT > first + EPS) say('startT', 'at or before the first contact')
  if (row.endT < last - EPS) say('endT', 'at or after the last contact')
  if (ordered[0].stroke !== null) out.push({ table: 'shots', id: ordered[0].id, field: 'stroke', problem: 'null on the serve' })
  for (const shot of ordered.slice(1)) {
    if (shot.depth !== null) out.push({ table: 'shots', id: shot.id, field: 'depth', problem: 'only on the serve' })
  }
  const derived = winnerOf({ server: row.server, contacts: ordered.map((s) => s.contactT), ending: row.ending })
  if (derived && !row.pointKept && row.winner !== derived) say('winner', `${derived} from the server, the count and the ending, unless pointKept`)
  if (Array.isArray(row.reviewParts)) {
    const tags = ordered.map((s) => ({ wing: s.wing ?? undefined, stroke: s.stroke ?? undefined, depth: s.depth ?? undefined }))
    const order = bestParts(n, tags).map((p) => p.part)
    let at = -1
    for (const part of row.reviewParts) {
      const i = order.indexOf(part)
      if (i <= at) {
        say('reviewParts', `parts of this rally in row order: ${order.join(', ')}`)
        break
      }
      at = i
    }
  }
  return out
}

function isShotTags(v: unknown): boolean {
  if (!isObject(v)) return false
  const ok = (x: unknown, items: readonly string[]) => x === undefined || items.includes(x as string)
  return ok(v.wing, WINGS) && ok(v.depth, DEPTHS) && ok(v.stroke, STROKES)
}

export function validateDraftRow(row: DraftRow): DbError[] {
  const { out, say } = collector('drafts', String(row.setId))
  need(say, 'setId', isText(row.setId), 'an id')
  const d = row.rally as unknown
  if (!isObject(d)) {
    say('rally', 'the open rally')
    return out
  }
  need(say, 'rally.videoId', isText(d.videoId), 'an id')
  need(say, 'rally.server', oneOf(SIDES, d.server), 'me or them')
  const contacts = d.contacts
  const ascending =
    Array.isArray(contacts) && contacts.every((t, i) => isTime(t) && (i === 0 || t >= (contacts[i - 1] as number)))
  need(say, 'rally.contacts', ascending, 'ascending seconds at or after 0')
  need(say, 'rally.closed', typeof d.closed === 'boolean', 'true or false')
  nullable(say, 'rally.start', d.start, isTime, 'seconds at or after 0')
  nullable(say, 'rally.end', d.end, isTime, 'seconds at or after 0')
  enumOrNull(say, 'rally.ending', ENDINGS, d.ending)
  nullable(say, 'rally.fa', d.fa, (v) => isInt(v, 2, Number.MAX_SAFE_INTEGER), 'a shot from 2')
  need(say, 'rally.noAttack', typeof d.noAttack === 'boolean', 'true or false')
  need(say, 'rally.shots', Array.isArray(d.shots) && d.shots.every(isShotTags), 'shot tags')
  if (d.serveChecked !== undefined) need(say, 'rally.serveChecked', typeof d.serveChecked === 'boolean', 'true or false')
  if (d.best !== undefined) need(say, 'rally.best', isObject(d.best) && d.best.flow === 'bestfa', 'a Best + FA mark')
  return out
}

function duplicates<T>(table: DbTable, rows: readonly T[], key: (row: T) => string, field: string): DbError[] {
  const seen = new Set<string>()
  const out: DbError[] = []
  for (const row of rows) {
    const k = key(row)
    if (seen.has(k)) out.push({ table, id: k, field, problem: 'unique' })
    seen.add(k)
  }
  return out
}

/** Opponent or event names, trimmed, once each ignoring case. */
export function validateUniqueNames(table: 'opponents' | 'events', rows: readonly { id: string; name: string }[]): DbError[] {
  return duplicates(table, rows, (row) => deriveNameKey(row.name), 'name').map((e) => ({ ...e, problem: 'unique ignoring case' }))
}

function runs(table: DbTable, rows: readonly { id: string; n: number }[], from: number, field: string): DbError[] {
  const sorted = [...rows].sort((a, b) => a.n - b.n)
  return sorted.flatMap((row, i) => (row.n === from + i ? [] : [{ table, id: row.id, field, problem: `${from + i}: numbered ${from} up with no gap` }]))
}

/** Every rule, on every row and across them. */
export function validateDbRows(rows: DbRows, today: Date = new Date()): DbError[] {
  const out: DbError[] = []
  for (const row of rows.opponents) out.push(...validateOpponentRow(row, today))
  for (const row of rows.events) out.push(...validateEventRow(row))
  for (const row of rows.matches) out.push(...validateMatchRow(row))
  for (const row of rows.videos) out.push(...validateVideoRow(row))
  for (const row of rows.sets) out.push(...validateSetRow(row))
  for (const row of rows.drafts) out.push(...validateDraftRow(row))
  const shotsOf = new Map<string, ShotRow[]>()
  for (const shot of rows.shots) shotsOf.set(shot.rallyId, [...(shotsOf.get(shot.rallyId) ?? []), shot])
  for (const row of rows.rallies) out.push(...validateRallyRow(row, shotsOf.get(row.id) ?? []))

  out.push(
    ...duplicates('opponents', rows.opponents, (r) => r.id, 'id'),
    ...duplicates('events', rows.events, (r) => r.id, 'id'),
    ...duplicates('matches', rows.matches, (r) => r.id, 'id'),
    ...duplicates('videos', rows.videos, (r) => r.id, 'id'),
    ...duplicates('sets', rows.sets, (r) => r.id, 'id'),
    ...duplicates('rallies', rows.rallies, (r) => r.id, 'id'),
    ...duplicates('shots', rows.shots, (r) => r.id, 'id'),
    ...duplicates('drafts', rows.drafts, (r) => r.setId, 'setId'),
    ...validateUniqueNames('opponents', rows.opponents),
    ...validateUniqueNames('events', rows.events),
  )

  const opponents = new Set(rows.opponents.map((r) => r.id))
  const events = new Set(rows.events.map((r) => r.id))
  const matches = new Set(rows.matches.map((r) => r.id))
  const setMatch = new Map(rows.sets.map((s) => [s.id, s.matchId]))
  const videoMatch = new Map(rows.videos.map((v) => [v.id, v.matchId]))
  const rallies = new Set(rows.rallies.map((r) => r.id))
  const link = (table: DbTable, id: string, field: string, ok: boolean) => {
    if (!ok) out.push({ table, id, field, problem: 'names a row that is not there' })
  }
  for (const m of rows.matches) {
    if (m.opponentId !== null) link('matches', m.id, 'opponentId', opponents.has(m.opponentId))
    if (m.eventId !== null) link('matches', m.id, 'eventId', events.has(m.eventId))
  }
  for (const v of rows.videos) link('videos', v.id, 'matchId', matches.has(v.matchId))
  for (const s of rows.sets) {
    link('sets', s.id, 'matchId', matches.has(s.matchId))
    if (s.markFromVideoId !== null) link('sets', s.id, 'markFromVideoId', videoMatch.get(s.markFromVideoId) === s.matchId)
    if (s.markToVideoId !== null) link('sets', s.id, 'markToVideoId', videoMatch.get(s.markToVideoId) === s.matchId)
  }
  for (const r of rows.rallies) {
    link('rallies', r.id, 'setId', setMatch.has(r.setId))
    link('rallies', r.id, 'videoId', setMatch.has(r.setId) && videoMatch.get(r.videoId) === setMatch.get(r.setId))
  }
  for (const s of rows.shots) link('shots', s.id, 'rallyId', rallies.has(s.rallyId))
  for (const d of rows.drafts) {
    link('drafts', d.setId, 'setId', setMatch.has(d.setId))
    const videoId = isObject(d.rally) ? d.rally.videoId : undefined
    link('drafts', d.setId, 'rally.videoId', typeof videoId === 'string' && videoMatch.get(videoId) === setMatch.get(d.setId))
  }

  for (const matchId of matches) {
    const sets = rows.sets.filter((s) => s.matchId === matchId)
    out.push(...runs('sets', sets.map((s) => ({ id: s.id, n: s.setNumber })), 1, 'setNumber'))
    const listed = rows.videos.filter((v) => v.matchId === matchId && v.removedAt === null)
    out.push(...runs('videos', listed.map((v) => ({ id: v.id, n: v.position })), 0, 'position'))
  }
  for (const setId of setMatch.keys()) {
    const inSet = rows.rallies.filter((r) => r.setId === setId)
    for (const deleted of [false, true]) {
      const part = inSet.filter((r) => (r.deletedAt !== null) === deleted)
      out.push(...runs('rallies', part.map((r) => ({ id: r.id, n: r.position })), 0, 'position'))
    }
  }
  return out
}
