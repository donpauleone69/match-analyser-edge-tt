/**
 * Edge TT Match Analyser — Domain Types
 * 
 * Pure type definitions for the domain layer.
 * No React, no IO — just types and type guards.
 */

// =============================================================================
// PLAYER TYPES
// =============================================================================

export type PlayerId = 'player1' | 'player2'

export interface Player {
  id: string
  name: string
  rating?: number
}

// =============================================================================
// SHOT QUALITY (v0.8.0 - expanded with error types)
// =============================================================================

/**
 * Shot quality assessment.
 * 
 * In-play qualities: good, average, weak
 * Error qualities: inNet, missedLong, missedWide
 * 
 * Error qualities enable automatic derivation of:
 * - landingType (net, offLong, wide)
 * - winnerId (other player wins)
 * - pointEndType (partial — serviceFault/receiveError auto, forced/unforced asked)
 */
export type ShotQuality = 
  | 'good' 
  | 'average' 
  | 'weak' 
  | 'inNet' 
  | 'missedLong' 
  | 'missedWide'

export const ERROR_QUALITIES: ShotQuality[] = ['inNet', 'missedLong', 'missedWide']
export const IN_PLAY_QUALITIES: ShotQuality[] = ['good', 'average', 'weak']

export function isErrorQuality(quality: ShotQuality): boolean {
  return ERROR_QUALITIES.includes(quality)
}

// =============================================================================
// SERVE SPIN (v0.8.0 - 3x3 grid)
// =============================================================================

/**
 * Serve spin based on ball contact point.
 * 
 * Grid layout (numpad mapping):
 * 
 *   topLeft(7)    topspin(8)    topRight(9)
 *   sideLeft(4)   noSpin(5)     sideRight(6)
 *   backLeft(1)   backspin(2)   backRight(3)
 * 
 * Top row = topspin family (contact top of ball)
 * Bottom row = backspin family (contact bottom of ball)
 */
export type ServeSpin =
  | 'topLeft' | 'topspin' | 'topRight'
  | 'sideLeft' | 'noSpin' | 'sideRight'
  | 'backLeft' | 'backspin' | 'backRight'

export const SERVE_SPIN_GRID: ServeSpin[][] = [
  ['topLeft', 'topspin', 'topRight'],
  ['sideLeft', 'noSpin', 'sideRight'],
  ['backLeft', 'backspin', 'backRight'],
]

// Numpad mapping (1-9)
export const SERVE_SPIN_NUMPAD: Record<number, ServeSpin> = {
  7: 'topLeft', 8: 'topspin', 9: 'topRight',
  4: 'sideLeft', 5: 'noSpin', 6: 'sideRight',
  1: 'backLeft', 2: 'backspin', 3: 'backRight',
}

// =============================================================================
// SERVE TYPE (v0.8.0 - updated)
// =============================================================================

/**
 * Serve technique type.
 * Added: lollipop
 * Removed: shovel
 */
export type ServeType = 
  | 'pendulum' 
  | 'reversePendulum' 
  | 'tomahawk' 
  | 'backhand' 
  | 'hook' 
  | 'lollipop' 
  | 'other'

/**
 * Serve type → Wing derivation map.
 * All serve types derive to either FH or BH.
 */
export const SERVE_WING_MAP: Record<ServeType, Wing> = {
  pendulum: 'FH',
  reversePendulum: 'BH',
  tomahawk: 'FH',
  backhand: 'BH',
  hook: 'FH',
  lollipop: 'FH',
  other: 'FH',
}

export function deriveServeWing(serveType: ServeType): Wing {
  return SERVE_WING_MAP[serveType]
}

// =============================================================================
// WING
// =============================================================================

export type Wing = 'FH' | 'BH'

// =============================================================================
// SHOT TYPE
// =============================================================================

/**
 * Full shot type list (14 types for Full Mode).
 * Ordered from most defensive to most aggressive.
 */
export type ShotType =
  // Defensive
  | 'lob'
  | 'chop'
  | 'chopBlock'
  | 'dropShot'
  | 'shortTouch'
  | 'push'
  // Neutral
  | 'block'
  | 'drive'
  | 'flick'
  | 'slowSpinLoop'
  // Aggressive
  | 'loop'
  | 'fastLoop'
  | 'smash'
  // Fallback
  | 'other'

/**
 * Essential mode shot types (9 types for faster tagging).
 */
export type EssentialShotType =
  | 'push'
  | 'chop'
  | 'block'
  | 'lob'
  | 'drive'
  | 'flick'
  | 'loop'
  | 'smash'
  | 'other'

export const ESSENTIAL_SHOT_TYPES: EssentialShotType[] = [
  'push', 'chop', 'block', 'lob', 'drive', 'flick', 'loop', 'smash', 'other'
]

// =============================================================================
// INFERRED SPIN
// =============================================================================

/**
 * Spin inferred from shot type (not entered manually).
 */
export type InferredSpin =
  | 'heavyTopspin'
  | 'topspin'
  | 'noSpin'
  | 'backspin'
  | 'heavyBackspin'

/**
 * Shot type → Inferred spin mapping.
 */
export const SHOT_TYPE_SPIN_MAP: Record<ShotType, InferredSpin> = {
  lob: 'topspin',
  chop: 'heavyBackspin',
  chopBlock: 'backspin',
  dropShot: 'noSpin',
  shortTouch: 'noSpin',
  push: 'backspin',
  block: 'topspin',
  drive: 'topspin',
  flick: 'topspin',
  slowSpinLoop: 'heavyTopspin',
  loop: 'heavyTopspin',
  fastLoop: 'heavyTopspin',
  smash: 'noSpin',
  other: 'noSpin',
}

export function deriveInferredSpin(shotType: ShotType): InferredSpin {
  return SHOT_TYPE_SPIN_MAP[shotType]
}

// =============================================================================
// LANDING
// =============================================================================

export type LandingType = 'inPlay' | 'net' | 'offLong' | 'wide'

/**
 * Landing zone (3x3 grid from opponent's perspective).
 * 
 * Grid layout:
 *   BHShort   MidShort   FHShort
 *   BHMid     MidMid     FHMid
 *   BHLong    MidLong    FHLong
 */
export type LandingZone =
  | 'BHShort' | 'MidShort' | 'FHShort'
  | 'BHMid' | 'MidMid' | 'FHMid'
  | 'BHLong' | 'MidLong' | 'FHLong'

export const LANDING_ZONE_GRID: LandingZone[][] = [
  ['BHShort', 'MidShort', 'FHShort'],
  ['BHMid', 'MidMid', 'FHMid'],
  ['BHLong', 'MidLong', 'FHLong'],
]

/**
 * Derive landing type from shot quality.
 * Error qualities map to specific landing types.
 */
export function deriveLandingType(quality: ShotQuality): LandingType {
  switch (quality) {
    case 'inNet': return 'net'
    case 'missedLong': return 'offLong'
    case 'missedWide': return 'wide'
    default: return 'inPlay'
  }
}

// =============================================================================
// POSITION SECTOR
// =============================================================================

/**
 * Position sector (3x3 grid for player court position).
 * 
 * Grid layout:
 *   closeLeft   closeMid   closeRight
 *   midLeft     midMid     midRight
 *   farLeft     farMid     farRight
 */
export type PositionSector =
  | 'closeLeft' | 'closeMid' | 'closeRight'
  | 'midLeft' | 'midMid' | 'midRight'
  | 'farLeft' | 'farMid' | 'farRight'

export const POSITION_SECTOR_GRID: PositionSector[][] = [
  ['closeLeft', 'closeMid', 'closeRight'],
  ['midLeft', 'midMid', 'midRight'],
  ['farLeft', 'farMid', 'farRight'],
]

export type PositionDistance = 'close' | 'mid' | 'far'

export function getPositionDistance(sector: PositionSector): PositionDistance {
  if (sector.startsWith('close')) return 'close'
  if (sector.startsWith('mid')) return 'mid'
  return 'far'
}

// =============================================================================
// POINT END TYPE
// =============================================================================

export type PointEndType =
  | 'winnerShot'
  | 'forcedError'
  | 'unforcedError'
  | 'serviceFault'
  | 'receiveError'
  | 'let'
  | 'other'

// =============================================================================
// LUCK TYPE
// =============================================================================

export type LuckType = 'none' | 'luckyNet' | 'luckyEdgeTable' | 'luckyEdgeBat'

// =============================================================================
// TAGGING MODE
// =============================================================================

export type TaggingMode = 'essential' | 'full'

// =============================================================================
// VIDEO COVERAGE
// =============================================================================

export type VideoCoverage = 'full' | 'truncatedStart' | 'truncatedEnd' | 'truncatedBoth'

// =============================================================================
// MATCH RESULT
// =============================================================================

export type MatchResult = 'player1' | 'player2' | 'incomplete'

// =============================================================================
// ISSUE CAUSES (for diagnostics in Full Mode)
// =============================================================================

export type ServeIssueCause =
  | 'technicalExecution'
  | 'badDecision'
  | 'tooHigh'
  | 'tooLong'
  | 'notEnoughSpin'
  | 'easyToRead'

export type ReceiveIssueCause =
  | 'misreadSpinType'
  | 'misreadSpinAmount'
  | 'technicalExecution'
  | 'badDecision'

export type ThirdBallIssueCause =
  | 'incorrectPreparation'
  | 'unexpectedReturn'
  | 'technicalExecution'
  | 'badDecision'
  | 'tooAggressive'
  | 'tooPassive'

export type UnforcedErrorCause =
  | 'technicalExecution'
  | 'badDecision'
  | 'tooAggressive'
  | 'tooPassive'

// =============================================================================
// CONTACT & RALLY TYPES
// =============================================================================

/**
 * Contact represents a ball contact in the match.
 * In the unified workflow, Contact = Shot — shot data fields are stored directly here.
 * 
 * Part 1: Only id, rallyId, time, shotIndex are set
 * Part 2: Shot data fields are filled in during detailed tagging
 */
export interface Contact {
  id: string
  rallyId: string
  time: number // seconds in video
  shotIndex: number
  
  // Shot data fields (filled in Part 2)
  playerId?: PlayerId
  
  // Serve-specific fields (shotIndex === 1)
  serveType?: ServeType
  serveSpin?: ServeSpin
  
  // Rally shot fields (shotIndex > 1)
  wing?: Wing
  shotType?: EssentialShotType
  
  // Common fields
  landingZone?: LandingZone
  shotQuality?: ShotQuality
  
  // Derived fields (calculated, not input)
  landingType?: LandingType
  inferredSpin?: InferredSpin
  
  // Metadata
  isTagged?: boolean // True when Part 2 tagging complete for this shot
}

export interface Rally {
  id: string
  gameId: string
  rallyIndex: number
  isScoring: boolean
  winnerId?: PlayerId
  endOfPointTime?: number
  player1ScoreAfter: number
  player2ScoreAfter: number
  serverId: PlayerId
  receiverId: PlayerId
  hasVideoData: boolean
  contacts: Contact[]
  isHighlight?: boolean
  pointEndType?: PointEndType
  luckType?: LuckType
  // Rally Checkpoint Flow tracking
  frameworkConfirmed?: boolean
  detailComplete?: boolean
}

// =============================================================================
// SHOT DATA (for tagging)
// =============================================================================

export interface EssentialShotData {
  // For serves
  serveType?: ServeType
  serveSpin?: ServeSpin
  // For rally shots
  wing?: Wing
  shotType?: EssentialShotType | ShotType // Allow both for compatibility
  // Common
  landingZone?: LandingZone
  shotQuality: ShotQuality
}

export interface FullShotData {
  // For serves
  serveType?: ServeType
  serveSpin?: ServeSpin
  // For rally shots
  wing?: Wing
  shotType?: ShotType // Full list
  // Common
  landingZone?: LandingZone
  shotQuality: ShotQuality
  // Full mode additions
  positionSector?: PositionSector
  // Diagnostics (conditional)
  serveIssueCause?: ServeIssueCause
  receiveIssueCause?: ReceiveIssueCause
  thirdBallIssueCause?: ThirdBallIssueCause
  unforcedErrorCause?: UnforcedErrorCause
}

export interface EndOfPointData {
  forcedOrUnforced?: 'forcedError' | 'unforcedError'
  luckType?: LuckType
}

// =============================================================================
// MATCH SETUP TYPES
// =============================================================================

export interface MatchDetailsInput {
  player1Name: string
  player2Name: string
  matchDate: string
  videoStartSetScore: string
  videoStartPointsScore: string
  matchFormat: string
  tournament?: string
  firstServeTimestamp: number
  firstServerId: PlayerId
}

export interface MatchCompletionInput {
  matchResult: MatchResult
  finalSetScore: string
  finalPointsScore: string
  videoCoverage: VideoCoverage
}

// =============================================================================
// TIMELINE MARKER TYPES
// =============================================================================

export type MarkerType = 'contact' | 'rally-end-score' | 'rally-end-no-score' | 'end-of-set'

export interface TimelineMarker {
  id: string
  time: number
  type: MarkerType
  rallyId?: string
}

// =============================================================================
// GAME TYPE
// =============================================================================

export interface Game {
  id: string
  matchId: string
  gameNumber: number
  player1FinalScore: number
  player2FinalScore: number
  winnerId?: string
  hasVideo: boolean
  endOfSetTimestamp?: number
}

// =============================================================================
// MATCH TYPE
// =============================================================================

export interface Match {
  id: string
  player1: Player
  player2: Player
  firstServerId: string
  matchDate: string
  videoSource?: string
  hasVideo: boolean
  step1Complete: boolean
  step2Complete: boolean
  // v0.8.0 additions
  videoStartSetScore?: string
  videoStartPointsScore?: string
  firstServeTimestamp?: number
  videoCoverage?: VideoCoverage
  matchResult?: MatchResult
  finalSetScore?: string
  finalPointsScore?: string
  taggingMode?: TaggingMode
}

