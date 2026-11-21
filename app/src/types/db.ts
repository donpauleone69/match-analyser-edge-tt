/**
 * Database schema, version 1. Eight tables of what the user did; everything
 * else is derived. Phase 8 creates them (Dexie) and writes through the
 * validators in `rules/dbValidate.ts`. Times named `...At` are milliseconds
 * since 1970; `...T` and `durationS` are seconds in one video.
 * Null means not entered.
 */
import type { BestPart, Draft, Ending, MarkKind, Side, Wing } from './rally'
import type { VideoScript } from './video'

export const SCHEMA_VERSION = 1

export const DB_TABLES = ['opponents', 'events', 'matches', 'videos', 'sets', 'rallies', 'shots', 'drafts'] as const
export type DbTable = (typeof DB_TABLES)[number]

export const SIDES = ['me', 'them'] as const satisfies readonly Side[]
export const HANDEDNESS = ['Right', 'Left'] as const
export type Handedness = (typeof HANDEDNESS)[number]
export const OPPONENT_STYLES = ['Attacker', 'Defender', 'Disrupter'] as const
export type OpponentStyle = (typeof OPPONENT_STYLES)[number]
export const RANKING_STATUSES = ['Ranking', 'NonRanking'] as const
export type RankingStatus = (typeof RANKING_STATUSES)[number]
export const IMPORTANCES = ['National', 'Regional', 'Social'] as const
export type Importance = (typeof IMPORTANCES)[number]
export const CATEGORIES = ['U13', 'U15', 'Senior', 'Vets'] as const
export type Category = (typeof CATEGORIES)[number]
export const STAGES = ['Group', 'Knockout'] as const
export type MatchStage = (typeof STAGES)[number]
export const ROUNDS = ['R64', 'R32', 'R16', 'QF', 'SF', 'F'] as const
export type KnockoutRound = (typeof ROUNDS)[number]
export const OUTCOMES = ['Win', 'Loss'] as const
export type Outcome = (typeof OUTCOMES)[number]
/** The user's end of the table at the start of a video, seen from the camera. */
export const MY_ENDS = ['Near', 'Far'] as const
export type MyEnd = (typeof MY_ENDS)[number]
export const RALLY_KINDS = ['rally', 'point'] as const
export type RallyKind = (typeof RALLY_KINDS)[number]
export const DEPTHS = ['Short', 'Long'] as const
export type Depth = (typeof DEPTHS)[number]
/** `Defence` has no writer until phase 10. */
export const STROKES = ['Attack', 'Control', 'Defence'] as const
export type Stroke = (typeof STROKES)[number]
export const REVIEW_PARTS = ['opening', 'attack', 'rally', 'end'] as const satisfies readonly BestPart[]
export const LEFT_MARKS = ['serve', 'gap'] as const satisfies readonly MarkKind[]

export type OpponentRow = {
  id: string
  name: string
  club: string | null
  handedness: Handedness | null
  style: OpponentStyle | null
  birthYear: number | null
  notes: string | null
  createdAt: number
  updatedAt: number
}

export type EventRow = {
  id: string
  name: string
  location: string | null
  rankingStatus: RankingStatus | null
  importance: Importance | null
  createdAt: number
  updatedAt: number
}

export type MatchRow = {
  id: string
  opponentId: string | null
  eventId: string | null
  /** `YYYY-MM-DD`. */
  playedOn: string | null
  category: Category | null
  stage: MatchStage | null
  /** Only when `stage` is `Knockout`. */
  round: KnockoutRound | null
  /** Written from `resultMe` and `resultThem` when both are set. */
  outcome: Outcome | null
  resultMe: number | null
  resultThem: number | null
  createdAt: number
  updatedAt: number
}

export type VideoRow = {
  id: string
  matchId: string
  /** Play order among listed videos. A removed video keeps the place it had. */
  position: number
  fileName: string
  sizeBytes: number
  durationS: number
  lastModifiedMs: number | null
  fingerprint: string | null
  storedOnDevice: boolean
  archivedAt: number | null
  myEnd: MyEnd | null
  /** Taken off the list while rallies or a mark still name it. */
  removedAt: number | null
  /** The scripted stand-in a demo video plays. Null on a file. */
  demoScript: VideoScript | null
}

export type SetRow = {
  id: string
  matchId: string
  setNumber: number
  enteredMe: number | null
  enteredThem: number | null
  firstServer: Side
  finishedAt: number | null
  markFromVideoId: string | null
  markFromT: number | null
  markToVideoId: string | null
  markToT: number | null
  markComplete: boolean | null
}

export type RallyRow = {
  id: string
  setId: string
  videoId: string
  kind: RallyKind
  /** Order in the set. Deleted rallies have their own order. */
  position: number
  server: Side
  startT: number
  endT: number
  ending: Ending | null
  winner: Side
  /** The user kept Point to against End ("Check the point"). */
  pointKept: boolean
  reviewParts: BestPart[]
  leftMarks: MarkKind[]
  createdAt: number
  deletedAt: number | null
}

export type ShotRow = {
  id: string
  rallyId: string
  shotNumber: number
  contactT: number
  wing: Wing | null
  depth: Depth | null
  stroke: Stroke | null
}

/** The open rally of one set. */
export type DraftRow = {
  setId: string
  rally: Draft
}

type Columns<T> = { [K in keyof T]-?: K }[keyof T][]

/** Every column of each table, for checks that run on rows from outside (a match file). */
export const DB_COLUMNS = {
  opponents: ['id', 'name', 'club', 'handedness', 'style', 'birthYear', 'notes', 'createdAt', 'updatedAt'],
  events: ['id', 'name', 'location', 'rankingStatus', 'importance', 'createdAt', 'updatedAt'],
  matches: ['id', 'opponentId', 'eventId', 'playedOn', 'category', 'stage', 'round', 'outcome', 'resultMe', 'resultThem', 'createdAt', 'updatedAt'],
  videos: ['id', 'matchId', 'position', 'fileName', 'sizeBytes', 'durationS', 'lastModifiedMs', 'fingerprint', 'storedOnDevice', 'archivedAt', 'myEnd', 'removedAt', 'demoScript'],
  sets: ['id', 'matchId', 'setNumber', 'enteredMe', 'enteredThem', 'firstServer', 'finishedAt', 'markFromVideoId', 'markFromT', 'markToVideoId', 'markToT', 'markComplete'],
  rallies: ['id', 'setId', 'videoId', 'kind', 'position', 'server', 'startT', 'endT', 'ending', 'winner', 'pointKept', 'reviewParts', 'leftMarks', 'createdAt', 'deletedAt'],
  shots: ['id', 'rallyId', 'shotNumber', 'contactT', 'wing', 'depth', 'stroke'],
  drafts: ['setId', 'rally'],
} satisfies {
  opponents: Columns<OpponentRow>
  events: Columns<EventRow>
  matches: Columns<MatchRow>
  videos: Columns<VideoRow>
  sets: Columns<SetRow>
  rallies: Columns<RallyRow>
  shots: Columns<ShotRow>
  drafts: Columns<DraftRow>
}

export type DbRows = {
  opponents: OpponentRow[]
  events: EventRow[]
  matches: MatchRow[]
  videos: VideoRow[]
  sets: SetRow[]
  rallies: RallyRow[]
  shots: ShotRow[]
  drafts: DraftRow[]
}

/** One refused value. `id` is the row's key, or the name for a duplicate. */
export type DbError = { table: DbTable; id: string; field: string; problem: string }

/**
 * Why a repository call changed nothing. `invalid`: a validator refused a row.
 * `conflict`: an id or a name clashes with a stored row. `missing`: a row the
 * call needs is not stored. `file`: a match file that cannot be read.
 * `storage`: the browser database failed (quota, blocked, closed).
 */
export type RepoError =
  | { kind: 'invalid'; errors: DbError[] }
  | { kind: 'conflict' | 'missing' | 'file' | 'storage'; problem: string }

/** Repository calls return this and never throw. A failed call wrote nothing. */
export type RepoResult<T> = { ok: true; value: T } | { ok: false; error: RepoError }

export const MATCH_FILE_FORMAT = 'edge-tt-match'

/** One match as a backup file: its rows, and the opponent and event it links to. */
export type MatchFile = {
  format: typeof MATCH_FILE_FORMAT
  schemaVersion: number
  exportedAt: number
  match: MatchRow
  opponent: OpponentRow | null
  event: EventRow | null
  videos: VideoRow[]
  sets: SetRow[]
  rallies: RallyRow[]
  shots: ShotRow[]
  drafts: DraftRow[]
}
