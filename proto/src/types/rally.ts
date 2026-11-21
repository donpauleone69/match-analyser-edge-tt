/**
 * Rally, shot and Best + FA types. `ENDINGS` and `WINGS` are the vocabularies
 * those types are named from. They have no other readers.
 */

export type Side = 'me' | 'them'

export const ENDINGS = ['Winner', 'Lucky', 'Net', 'Long', 'Wide', 'Air'] as const
/** `Off` is kept so rallies saved with it still load. No flow offers it any more. */
export type Ending = (typeof ENDINGS)[number] | 'Off'

export const WINGS = ['BH', 'FH'] as const
export type Wing = (typeof WINGS)[number]

export type StrokeSide = 'offensive' | 'defensive'

/** Rally Row groups. Opening, Attack, Rally, End. The same ids are the review marks. */
export type BestPart = 'opening' | 'attack' | 'rally' | 'end'

/**
 * Questions in the order they are asked. Serve, then each later shot (`shots`),
 * then End. `receive`, `third` and `fourth` still load from an older draft.
 */
export type BestStep = 'server' | 'end' | 'serve' | 'receive' | 'third' | 'fourth' | 'shots'

/** Who attacked first. Covers the shots never asked. */
export type BestFirst = 'me' | 'them' | 'none'

/** In-progress Best + FA. The other flows never set this. */
export type BestMark = {
  flow: 'bestfa'
  /** The question open now. */
  step?: BestStep
  /** The shot open while `step` is `shots`. */
  endPage?: number
  /** End button. Winner means the last hitter won. Net, Long and Wide are errors. */
  end?: 'Winner' | 'Net' | 'Long' | 'Wide'
  /** Point to. Kept through every contact edit. */
  point?: Side
  /** Keep as is: saved with "Check the point". */
  kept?: true
  first?: BestFirst
  /** Parts marked for review, in row order. */
  review?: BestPart[]
  /** The contact Delete last removed, while Serve can still offer Delete first instead. Draft only. */
  cut?: number
}

export type ShotTags = {
  wing?: Wing
  /** Not asked any more. Kept so rallies saved with it still load. Never set, never saved. */
  pivot?: boolean
  stroke?: string
  spin?: string
  depth?: string
  contact?: string
  intent?: string
  initiative?: string
  high?: boolean
  heavy?: boolean
  review?: boolean
  missReason?: string
}

/** A rally being tagged or edited. Times are seconds within `videoId`. */
export type Draft = {
  videoId: string
  server: Side
  contacts: number[]
  /** False while contacts are still being tapped. */
  closed: boolean
  /** Rally marks. Null means the default: 1s either side of the contacts. */
  start: number | null
  end: number | null
  ending: Ending | null
  /** Shot number of the first attack. */
  fa: number | null
  noAttack: boolean
  shots: ShotTags[]
  /**
   * The server was chosen or confirmed: Switch, or either press in Review serves.
   * Absent means the app's proposal was kept.
   */
  serveChecked?: boolean
  /** Best + FA only. Absent on the other flows. */
  best?: BestMark
}

/** In the order they are asked. The pick comes first from three shots up. */
export type Stage = 'contacts' | 'pickFa' | 'result' | 'endShot' | 'faShot' | 'ready'

/** Why a shot cannot be picked as the first attack. */
export type FaRefusal =
  | { kind: 'serve' }
  | { kind: 'noShot' }
  | { kind: 'stroke'; shot: number; stroke: string }

export type SwitchState = { side: StrokeSide; fixed: boolean }

export type ShotRole = 'serve' | 'before' | 'firstAttack' | 'reply' | 'later'

export type ShotFields = {
  result: boolean
  wing: boolean
  /** The stroke row, with the switch: `showsStroke`. */
  stroke: boolean
  /** Always false: Spin is not asked. Here only until the screen drops its row. */
  spin: boolean
  depth: boolean
  ball: boolean
  /** Always false: Contact is not asked. Here only until the screen drops its row. */
  contact: boolean
  intent: boolean
  initiative: boolean
  missReason: boolean
}

export type Mark = { kind: 'start' } | { kind: 'end' } | { kind: 'shot'; shot: number }

export type MarkKind = 'serve' | 'gap'

/**
 * A saved rally. Times are seconds within `videoId`. It keeps the server and
 * winner it was tagged with: nothing done to another rally ever changes them.
 * The score is counted from the winners, not stored.
 */
export type RallyData = {
  id: string
  videoId: string
  server: Side
  contacts: number[]
  start: number
  end: number
  /** Null only on a point added without video. */
  ending: Ending | null
  fa: number | null
  shots: ShotTags[]
  winner: Side
  /** A point added without video: no contacts, `start` is its place in the video. */
  point?: true
  /** Continuity marks the user chose to leave as they are. */
  left?: MarkKind[]
  /** The server was chosen or confirmed. See `isKnownGood` in continuity.ts. */
  serveChecked?: boolean
  /**
   * Rally Spine or Best + FA. Absent on Shot by shot.
   * The score still comes from `winner`, not from these answers.
   */
  idea?: IdeaTag
}

/** Answers from Rally Spine or Best + FA. Shot by shot never sets this. */
export type IdeaTag = {
  flow: 'spine' | 'bestfa'
  /** Spine result token, or the Best + FA end button. */
  result?: string
  serve?: string
  /** Shot number to the button that was pressed. */
  shots?: Record<number, string>
  /** Who attacked first, from the optional Best + FA question. */
  first?: BestFirst
  /** Parts marked for review. Same ids as the Rally Row. */
  review?: BestPart[]
  /** Finish wing, Rally Spine only. */
  wing?: string
  /** Finish stroke, Rally Spine only. Empty when the earlier sweep already named it. */
  finish?: string
  /** Set when the last ball disagrees with the point winner. */
  check?: string
}
