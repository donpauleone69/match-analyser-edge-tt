import { describe, expect, it } from 'vitest'
import {
  deriveDbRows,
  validateDbRows,
  validateDraftRow,
  validateEventRow,
  validateMatchRow,
  validateOpponentRow,
  validateRallyRow,
  validateSetRow,
  validateShotRow,
  validateUniqueNames,
  validateVideoRow,
  type DbError,
  type DbRows,
  type DraftRow,
  type EventRow,
  type MatchRow,
  type OpponentRow,
  type RallyRow,
  type SetRow,
  type ShotRow,
  type VideoRow,
} from '../lib/app'
import { SEED, TODAY } from '../lib/fixed'

const NOW = TODAY.getTime()
const ROWS = deriveDbRows(SEED, { now: NOW })
const fresh = (): DbRows => structuredClone(ROWS)

const opponent = (): OpponentRow => ({ ...ROWS.opponents[0] })
const event = (): EventRow => ({ ...ROWS.events[0] })
const match = (): MatchRow => ({ ...ROWS.matches.find((m) => m.id === 'm-complete')! })
const videoRow = (): VideoRow => ({ ...ROWS.videos[0] })
const setRow = (): SetRow => ({ ...ROWS.sets.find((s) => s.markFromVideoId !== null)! })
const shot = (): ShotRow => ({ ...ROWS.shots[0] })

/** A saved rally of five shots with its shot rows. */
function rally(): { row: RallyRow; shots: ShotRow[] } {
  const row = ROWS.rallies.find((r) => r.kind === 'rally' && ROWS.shots.filter((s) => s.rallyId === r.id).length === 5)!
  return { row: { ...row }, shots: ROWS.shots.filter((s) => s.rallyId === row.id).map((s) => ({ ...s })) }
}
function point(): { row: RallyRow; shots: ShotRow[] } {
  return { row: { ...ROWS.rallies.find((r) => r.kind === 'point')! }, shots: [] }
}
const draft = (): DraftRow => ({
  setId: 'm-new:1',
  rally: { videoId: 'v', server: 'me', contacts: [1, 2], closed: true, start: null, end: null, ending: null, fa: null, noAttack: false, shots: [{}, {}] },
})

const fields = (errors: DbError[]) => errors.map((e) => e.field)

type Case<T> = { rule: string; ok: (row: T) => void; bad: (row: T) => void; field: string }

function table<T>(name: string, base: () => T, check: (row: T) => DbError[], cases: Case<T>[]) {
  describe(name, () => {
    it('a seed row passes', () => {
      expect(check(base())).toEqual([])
    })
    for (const c of cases) {
      it(`${c.rule}: accepted`, () => {
        const row = base()
        c.ok(row)
        expect(check(row)).toEqual([])
      })
      it(`${c.rule}: refused`, () => {
        const row = base()
        c.bad(row)
        expect(fields(check(row))).toContain(c.field)
      })
    }
  })
}

table<OpponentRow>('validateOpponentRow', opponent, (r) => validateOpponentRow(r, TODAY), [
  { rule: 'id is an id', ok: (r) => (r.id = 'o-1'), bad: (r) => (r.id = ''), field: 'id' },
  { rule: 'name is trimmed text', ok: (r) => (r.name = 'Ana Li'), bad: (r) => (r.name = ' Ana'), field: 'name' },
  { rule: 'club is text or null', ok: (r) => (r.club = 'Riverside'), bad: (r) => (r.club = ''), field: 'club' },
  { rule: 'handedness is Right or Left', ok: (r) => (r.handedness = 'Left'), bad: (r) => ((r as { handedness: unknown }).handedness = 'Both'), field: 'handedness' },
  { rule: 'style is Attacker, Defender or Disrupter', ok: (r) => (r.style = 'Disrupter'), bad: (r) => ((r as { style: unknown }).style = 'Chopper'), field: 'style' },
  { rule: 'birthYear is 1900 to this year', ok: (r) => (r.birthYear = 2012), bad: (r) => (r.birthYear = TODAY.getUTCFullYear() + 1), field: 'birthYear' },
  { rule: 'birthYear is a whole year', ok: (r) => (r.birthYear = 1900), bad: (r) => (r.birthYear = 1990.5), field: 'birthYear' },
  { rule: 'notes are text or null', ok: (r) => (r.notes = ' long pips '), bad: (r) => ((r as { notes: unknown }).notes = 5), field: 'notes' },
  { rule: 'createdAt is whole ms', ok: (r) => (r.createdAt = 0), bad: (r) => (r.createdAt = -1), field: 'createdAt' },
  { rule: 'updatedAt is not before createdAt', ok: (r) => (r.updatedAt = r.createdAt + 1), bad: (r) => (r.updatedAt = r.createdAt - 1), field: 'updatedAt' },
])

table<EventRow>('validateEventRow', event, validateEventRow, [
  { rule: 'name is trimmed text', ok: (r) => (r.name = 'County cup'), bad: (r) => (r.name = 'Cup '), field: 'name' },
  { rule: 'location is text or null', ok: (r) => (r.location = 'Leeds'), bad: (r) => (r.location = ' '), field: 'location' },
  { rule: 'rankingStatus is Ranking or NonRanking', ok: (r) => (r.rankingStatus = 'NonRanking'), bad: (r) => ((r as { rankingStatus: unknown }).rankingStatus = 'ranked'), field: 'rankingStatus' },
  { rule: 'importance is National, Regional or Social', ok: (r) => (r.importance = 'Social'), bad: (r) => ((r as { importance: unknown }).importance = 'Local'), field: 'importance' },
  { rule: 'updatedAt is whole ms', ok: (r) => (r.updatedAt = r.createdAt), bad: (r) => (r.updatedAt = 1.5), field: 'updatedAt' },
])

table<MatchRow>('validateMatchRow', match, validateMatchRow, [
  { rule: 'opponentId is an id or null', ok: (r) => (r.opponentId = null), bad: (r) => (r.opponentId = ''), field: 'opponentId' },
  { rule: 'eventId is an id or null', ok: (r) => (r.eventId = null), bad: (r) => (r.eventId = ' e'), field: 'eventId' },
  { rule: 'playedOn is a real YYYY-MM-DD date', ok: (r) => (r.playedOn = '2024-02-29'), bad: (r) => (r.playedOn = '2023-02-29'), field: 'playedOn' },
  { rule: 'category is U13, U15, Senior or Vets', ok: (r) => (r.category = 'U13'), bad: (r) => ((r as { category: unknown }).category = 'U11'), field: 'category' },
  { rule: 'stage is Group or Knockout', ok: (r) => (r.stage = 'Group'), bad: (r) => ((r as { stage: unknown }).stage = 'Final'), field: 'stage' },
  {
    rule: 'round is a knockout round',
    ok: (r) => Object.assign(r, { stage: 'Knockout', round: 'R64' }),
    bad: (r) => Object.assign(r, { stage: 'Knockout', round: 'R128' }),
    field: 'round',
  },
  { rule: 'round only when stage is Knockout', ok: (r) => Object.assign(r, { stage: 'Knockout', round: 'F' }), bad: (r) => Object.assign(r, { stage: 'Group', round: 'F' }), field: 'round' },
  { rule: 'outcome is Win or Loss', ok: (r) => Object.assign(r, { resultMe: null, resultThem: null, outcome: 'Loss' }), bad: (r) => Object.assign(r, { resultMe: null, resultThem: null, outcome: 'Draw' }), field: 'outcome' },
  { rule: 'both results or neither', ok: (r) => Object.assign(r, { resultMe: null, resultThem: null, outcome: null }), bad: (r) => (r.resultThem = null), field: 'resultThem' },
  { rule: 'result is a best of 3, 5 or 7', ok: (r) => Object.assign(r, { resultMe: 4, resultThem: 3, outcome: 'Win' }), bad: (r) => Object.assign(r, { resultMe: 2, resultThem: 2 }), field: 'resultMe' },
  { rule: 'result is whole sets', ok: (r) => Object.assign(r, { resultMe: 0, resultThem: 2, outcome: 'Loss' }), bad: (r) => Object.assign(r, { resultMe: 2.5, resultThem: 1 }), field: 'resultMe' },
  { rule: 'outcome agrees with a typed result', ok: (r) => Object.assign(r, { resultMe: 1, resultThem: 3, outcome: 'Loss' }), bad: (r) => Object.assign(r, { resultMe: 1, resultThem: 3, outcome: 'Win' }), field: 'outcome' },
  { rule: 'a typed result has an outcome', ok: (r) => (r.outcome = 'Win'), bad: (r) => (r.outcome = null), field: 'outcome' },
  { rule: 'createdAt is whole ms', ok: (r) => (r.createdAt = 0), bad: (r) => ((r as { createdAt: unknown }).createdAt = '2026'), field: 'createdAt' },
])

table<VideoRow>('validateVideoRow', videoRow, validateVideoRow, [
  { rule: 'matchId is an id', ok: (r) => (r.matchId = 'm-x'), bad: (r) => (r.matchId = ''), field: 'matchId' },
  { rule: 'position is a whole number from 0', ok: (r) => (r.position = 3), bad: (r) => (r.position = -1), field: 'position' },
  { rule: 'fileName is set', ok: (r) => (r.fileName = 'a b.mp4'), bad: (r) => (r.fileName = ''), field: 'fileName' },
  { rule: 'sizeBytes is whole bytes', ok: (r) => (r.sizeBytes = 0), bad: (r) => (r.sizeBytes = 10.5), field: 'sizeBytes' },
  { rule: 'durationS is seconds from 0', ok: (r) => (r.durationS = 0.5), bad: (r) => (r.durationS = Number.NaN), field: 'durationS' },
  { rule: 'lastModifiedMs is whole ms or null', ok: (r) => (r.lastModifiedMs = 1700000000000), bad: (r) => (r.lastModifiedMs = -5), field: 'lastModifiedMs' },
  { rule: 'fingerprint is text or null', ok: (r) => (r.fingerprint = 'sha:abc'), bad: (r) => (r.fingerprint = ''), field: 'fingerprint' },
  { rule: 'storedOnDevice is true or false', ok: (r) => (r.storedOnDevice = true), bad: (r) => ((r as { storedOnDevice: unknown }).storedOnDevice = 1), field: 'storedOnDevice' },
  { rule: 'archivedAt is whole ms or null', ok: (r) => (r.archivedAt = NOW), bad: (r) => (r.archivedAt = -1), field: 'archivedAt' },
  { rule: 'myEnd is Near or Far', ok: (r) => (r.myEnd = 'Near'), bad: (r) => ((r as { myEnd: unknown }).myEnd = 'Side'), field: 'myEnd' },
  { rule: 'removedAt is whole ms or null', ok: (r) => (r.removedAt = NOW), bad: (r) => (r.removedAt = 0.5), field: 'removedAt' },
  { rule: 'demoScript is a script or null', ok: (r) => (r.demoScript = null), bad: (r) => ((r as { demoScript: unknown }).demoScript = { duration: 1 }), field: 'demoScript' },
])

table<SetRow>('validateSetRow', setRow, validateSetRow, [
  { rule: 'setNumber is 1 to 7', ok: (r) => (r.setNumber = 7), bad: (r) => (r.setNumber = 8), field: 'setNumber' },
  { rule: 'enteredMe is 0 to 99 or null', ok: (r) => (r.enteredMe = 0), bad: (r) => (r.enteredMe = -1), field: 'enteredMe' },
  { rule: 'enteredThem is a whole number or null', ok: (r) => (r.enteredThem = null), bad: (r) => (r.enteredThem = 10.5), field: 'enteredThem' },
  { rule: 'firstServer is me or them', ok: (r) => (r.firstServer = 'them'), bad: (r) => ((r as { firstServer: unknown }).firstServer = 'you'), field: 'firstServer' },
  { rule: 'finishedAt is whole ms or null', ok: (r) => (r.finishedAt = null), bad: (r) => (r.finishedAt = -2), field: 'finishedAt' },
  {
    rule: 'the mark is all five fields or none',
    ok: (r) => Object.assign(r, { markFromVideoId: null, markFromT: null, markToVideoId: null, markToT: null, markComplete: null }),
    bad: (r) => (r.markToT = null),
    field: 'markFromVideoId',
  },
  { rule: 'mark times are seconds from 0', ok: (r) => (r.markFromT = 0), bad: (r) => (r.markFromT = -1), field: 'markFromT' },
  { rule: 'markComplete is true or false', ok: (r) => (r.markComplete = false), bad: (r) => ((r as { markComplete: unknown }).markComplete = 'yes'), field: 'markComplete' },
  {
    rule: 'mark from is not after to on the same video',
    ok: (r) => Object.assign(r, { markToVideoId: r.markFromVideoId, markFromT: 10, markToT: 10 }),
    bad: (r) => Object.assign(r, { markToVideoId: r.markFromVideoId, markFromT: 20, markToT: 10 }),
    field: 'markToT',
  },
])

table<ShotRow>('validateShotRow', shot, validateShotRow, [
  { rule: 'rallyId is an id', ok: (r) => (r.rallyId = 'r-1'), bad: (r) => (r.rallyId = ''), field: 'rallyId' },
  { rule: 'shotNumber is a whole number from 1', ok: (r) => (r.shotNumber = 1), bad: (r) => (r.shotNumber = 0), field: 'shotNumber' },
  { rule: 'contactT is seconds from 0', ok: (r) => (r.contactT = 0), bad: (r) => (r.contactT = -0.1), field: 'contactT' },
  { rule: 'wing is BH or FH', ok: (r) => (r.wing = 'BH'), bad: (r) => ((r as { wing: unknown }).wing = 'Both'), field: 'wing' },
  { rule: 'depth is Short or Long', ok: (r) => (r.depth = 'Long'), bad: (r) => ((r as { depth: unknown }).depth = 'Half'), field: 'depth' },
  { rule: 'stroke is Attack, Control or Defence', ok: (r) => (r.stroke = null), bad: (r) => ((r as { stroke: unknown }).stroke = 'Loop'), field: 'stroke' },
])

describe('validateShotRow takes Defence', () => {
  it('Defence is a stroke', () => {
    expect(validateShotRow({ ...shot(), stroke: 'Defence' })).toEqual([])
  })
})

type R = { row: RallyRow; shots: ShotRow[] }
const checkRally = (r: R) => validateRallyRow(r.row, r.shots)
const shotsFrom = (r: R, i: number, patch: Partial<ShotRow>) => (r.shots[i] = { ...r.shots[i], ...patch })

table<R>('validateRallyRow', rally, checkRally, [
  { rule: 'setId is an id', ok: (r) => (r.row.setId = 's'), bad: (r) => (r.row.setId = ''), field: 'setId' },
  { rule: 'kind is rally or point', ok: () => {}, bad: (r) => ((r.row as { kind: unknown }).kind = 'let'), field: 'kind' },
  { rule: 'position is a whole number from 0', ok: (r) => (r.row.position = 0), bad: (r) => (r.row.position = 1.5), field: 'position' },
  { rule: 'server is me or them', ok: () => {}, bad: (r) => ((r.row as { server: unknown }).server = 'x'), field: 'server' },
  { rule: 'startT is seconds from 0', ok: (r) => (r.row.startT = Math.max(0, r.shots[0].contactT - 5)), bad: (r) => (r.row.startT = -1), field: 'startT' },
  { rule: 'startT is not after endT', ok: () => {}, bad: (r) => (r.row.endT = r.row.startT - 1), field: 'endT' },
  { rule: 'ending is Winner, Net, Long or Wide', ok: () => {}, bad: (r) => ((r.row as { ending: unknown }).ending = 'Edge'), field: 'ending' },
  { rule: 'winner is me or them', ok: () => {}, bad: (r) => ((r.row as { winner: unknown }).winner = 'both'), field: 'winner' },
  { rule: 'pointKept is true or false', ok: () => {}, bad: (r) => ((r.row as { pointKept: unknown }).pointKept = 'no'), field: 'pointKept' },
  { rule: 'reviewParts are parts, once each', ok: (r) => (r.row.reviewParts = ['opening']), bad: (r) => (r.row.reviewParts = ['opening', 'opening']), field: 'reviewParts' },
  { rule: 'reviewParts are parts this rally has, in row order', ok: (r) => (r.row.reviewParts = []), bad: (r) => (r.row.reviewParts = ['end', 'opening']), field: 'reviewParts' },
  { rule: 'leftMarks are serve or gap, once each', ok: (r) => (r.row.leftMarks = ['serve', 'gap']), bad: (r) => ((r.row as { leftMarks: unknown }).leftMarks = ['score']), field: 'leftMarks' },
  { rule: 'createdAt is whole ms', ok: (r) => (r.row.createdAt = 0), bad: (r) => (r.row.createdAt = -1), field: 'createdAt' },
  { rule: 'deletedAt is whole ms or null', ok: (r) => (r.row.deletedAt = NOW), bad: (r) => (r.row.deletedAt = 1.1), field: 'deletedAt' },
  { rule: 'a rally has an ending', ok: (r) => (r.row.ending = r.row.ending === 'Winner' ? 'Winner' : r.row.ending), bad: (r) => (r.row.ending = null), field: 'ending' },
  { rule: 'a rally has a shot', ok: () => {}, bad: (r) => (r.shots = []), field: 'kind' },
  { rule: 'shots run 1 to n', ok: () => {}, bad: (r) => shotsFrom(r, 4, { shotNumber: 7 }), field: 'shotNumber' },
  { rule: 'contacts are at least 0.05 s apart', ok: (r) => shotsFrom(r, 1, { contactT: r.shots[0].contactT + 0.05 }), bad: (r) => shotsFrom(r, 1, { contactT: r.shots[0].contactT + 0.01 }), field: 'contactT' },
  { rule: 'shots belong to the rally', ok: () => {}, bad: (r) => shotsFrom(r, 2, { rallyId: 'other' }), field: 'rallyId' },
  { rule: 'startT is at or before the first contact', ok: (r) => (r.row.startT = r.shots[0].contactT), bad: (r) => (r.row.startT = r.shots[0].contactT + 0.5), field: 'startT' },
  { rule: 'endT is at or after the last contact', ok: (r) => (r.row.endT = r.shots[4].contactT), bad: (r) => (r.row.endT = r.shots[4].contactT - 0.5), field: 'endT' },
  { rule: 'the serve has no stroke', ok: (r) => shotsFrom(r, 0, { stroke: null }), bad: (r) => shotsFrom(r, 0, { stroke: 'Attack' }), field: 'stroke' },
  { rule: 'only the serve has a depth', ok: (r) => shotsFrom(r, 0, { depth: 'Short' }), bad: (r) => shotsFrom(r, 2, { depth: 'Short' }), field: 'depth' },
  {
    rule: 'the winner follows server, count and ending unless pointKept',
    ok: (r) => Object.assign(r.row, { winner: r.row.winner === 'me' ? 'them' : 'me', pointKept: true }),
    bad: (r) => (r.row.winner = r.row.winner === 'me' ? 'them' : 'me'),
    field: 'winner',
  },
])

table<R>('validateRallyRow on a point', point, checkRally, [
  { rule: 'a point has no ending', ok: () => {}, bad: (r) => (r.row.ending = 'Winner'), field: 'ending' },
  { rule: 'a point has no shots', ok: () => {}, bad: (r) => (r.shots = [{ ...shot(), rallyId: r.row.id }]), field: 'kind' },
  { rule: 'a point starts and ends at one time', ok: () => {}, bad: (r) => (r.row.endT = r.row.startT + 1), field: 'endT' },
  { rule: 'a point has no review parts', ok: (r) => (r.row.leftMarks = ['serve']), bad: (r) => (r.row.reviewParts = ['opening']), field: 'reviewParts' },
  { rule: 'a point is not kept', ok: () => {}, bad: (r) => (r.row.pointKept = true), field: 'pointKept' },
])

describe('validateRallyRow with no shot list', () => {
  for (const missing of [null, undefined, 'shots']) {
    it(`${String(missing)}: refused, not thrown`, () => {
      const errors = validateRallyRow(point().row, missing as unknown as ShotRow[])
      expect(fields(errors)).toEqual(['shots'])
    })
  }
})

table<DraftRow>('validateDraftRow', draft, validateDraftRow, [
  { rule: 'setId is an id', ok: (r) => (r.setId = 's'), bad: (r) => (r.setId = ''), field: 'setId' },
  { rule: 'the open rally is an object', ok: () => {}, bad: (r) => ((r as { rally: unknown }).rally = null), field: 'rally' },
  { rule: 'videoId is an id', ok: () => {}, bad: (r) => (r.rally.videoId = ''), field: 'rally.videoId' },
  { rule: 'contacts ascend from 0', ok: (r) => (r.rally.contacts = []), bad: (r) => (r.rally.contacts = [2, 1]), field: 'rally.contacts' },
  { rule: 'ending is an ending or null', ok: (r) => (r.rally.ending = 'Net'), bad: (r) => ((r.rally as { ending: unknown }).ending = 'Edge'), field: 'rally.ending' },
  { rule: 'fa is a shot from 2 or null', ok: (r) => (r.rally.fa = 2), bad: (r) => (r.rally.fa = 1), field: 'rally.fa' },
  { rule: 'shot tags use the vocabularies', ok: (r) => (r.rally.shots = [{ depth: 'Short', wing: 'FH' }, { wing: 'BH', stroke: 'Defence' }]), bad: (r) => (r.rally.shots = [{}, { stroke: 'Loop' }]), field: 'rally.shots' },
  { rule: 'serveChecked is true or false', ok: (r) => (r.rally.serveChecked = true), bad: (r) => ((r.rally as { serveChecked: unknown }).serveChecked = 'yes'), field: 'rally.serveChecked' },
  { rule: 'best is a Best + FA mark', ok: (r) => (r.rally.best = { flow: 'bestfa', step: 'serve' }), bad: (r) => ((r.rally as { best: unknown }).best = { flow: 'full' }), field: 'rally.best' },
])

describe('validateUniqueNames', () => {
  const two = (b: string) => [
    { id: 'o-1', name: 'Pat' },
    { id: 'o-2', name: b },
  ]
  it('different names: accepted', () => {
    expect(validateUniqueNames('opponents', two('Kim'))).toEqual([])
  })
  it('same name in another case: refused', () => {
    expect(fields(validateUniqueNames('opponents', two('pAT')))).toEqual(['name'])
  })
})

describe('validateDbRows across rows', () => {
  const refuses = (change: (rows: DbRows) => void, field: string) => {
    const rows = fresh()
    change(rows)
    expect(fields(validateDbRows(rows, TODAY))).toContain(field)
  }

  it('the seed rows pass', () => {
    expect(validateDbRows(fresh(), TODAY)).toEqual([])
  })
  it('a key is unique in its table', () => refuses((rows) => rows.rallies.push({ ...rows.rallies[0] }), 'id'))
  it('one draft per set', () => {
    const rows = fresh()
    rows.drafts.push({ ...draft(), rally: { ...draft().rally, videoId: 'v-final' }, setId: 'm-complete:1' })
    expect(validateDbRows(rows, TODAY)).toEqual([])
    rows.drafts.push({ ...rows.drafts[0] })
    expect(fields(validateDbRows(rows, TODAY))).toContain('setId')
  })
  it('opponent names are unique ignoring case', () => refuses((rows) => (rows.opponents[1].name = 'LEE'), 'name'))
  it('event names are unique ignoring case', () => refuses((rows) => (rows.events[1].name = 'open trial'), 'name'))
  it('a match names a stored opponent', () => refuses((rows) => (rows.matches[0].opponentId = 'o-gone'), 'opponentId'))
  it('a match names a stored event', () => refuses((rows) => (rows.matches[0].eventId = 'e-gone'), 'eventId'))
  it('a video names a stored match', () => refuses((rows) => (rows.videos[0].matchId = 'm-gone'), 'matchId'))
  it('a set names a stored match', () => refuses((rows) => (rows.sets[0].matchId = 'm-gone'), 'matchId'))
  it('a mark names a video of its match', () =>
    refuses((rows) => (rows.sets.find((s) => s.markFromVideoId)!.markFromVideoId = 'v-h1'), 'markFromVideoId'))
  it('a rally names a stored set', () => refuses((rows) => (rows.rallies[0].setId = 's-gone'), 'setId'))
  it('a rally names a video of its match', () => refuses((rows) => (rows.rallies[0].videoId = 'v-h10'), 'videoId'))
  it('a shot names a stored rally', () => refuses((rows) => (rows.shots[0].rallyId = 'r-gone'), 'rallyId'))
  it('a draft names a stored set', () => refuses((rows) => rows.drafts.push({ ...draft(), setId: 's-gone' }), 'setId'))
  it('a draft names a video of its match', () => refuses((rows) => rows.drafts.push(draft()), 'rally.videoId'))
  it('set numbers run 1 to n with no gap', () => refuses((rows) => (rows.sets.find((s) => s.id === 'm-h1:3')!.setNumber = 5), 'setNumber'))
  it('listed videos are in places 0 to n with no gap', () => refuses((rows) => (rows.videos.find((v) => v.id === 'v-club-2')!.position = 2), 'position'))
  it('a removed video keeps its old place beside the listed ones', () => {
    const rows = fresh()
    rows.videos.push({ ...rows.videos.find((v) => v.id === 'v-club-2')!, id: 'v-old', removedAt: NOW, position: 1 })
    expect(validateDbRows(rows, TODAY)).toEqual([])
  })
  it('rallies in a set are in places 0 to n with no gap', () => refuses((rows) => (rows.rallies[3].position = 40), 'position'))
  it('deleted rallies have their own places', () => {
    const rows = fresh()
    const last = rows.rallies.filter((r) => r.setId === 'm-h1:1').pop()!
    last.deletedAt = NOW
    last.position = 0
    expect(validateDbRows(rows, TODAY)).toEqual([])
    last.position = 1
    expect(fields(validateDbRows(rows, TODAY))).toContain('position')
  })
})
