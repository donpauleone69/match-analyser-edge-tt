/**
 * Edge TT Match Analyser — Type Exports
 * 
 * This file re-exports types from the rules layer for backward compatibility.
 * New code should import directly from '@/rules/types'.
 */

// Re-export all types from rules layer
export type {
  PlayerId,
  Player,
  ShotQuality,
  ServeSpin,
  ServeType,
  Wing,
  ShotType,
  EssentialShotType,
  InferredSpin,
  LandingType,
  LandingZone,
  PositionSector,
  PositionDistance,
  PointEndType,
  LuckType,
  TaggingMode,
  VideoCoverage,
  MatchResult,
  ServeIssueCause,
  ReceiveIssueCause,
  ThirdBallIssueCause,
  UnforcedErrorCause,
  Contact,
  Rally,
  EssentialShotData,
  FullShotData,
  EndOfPointData,
  MatchDetailsInput,
  MatchCompletionInput,
  MarkerType,
  TimelineMarker,
  Game,
  Match,
} from '../rules/types'

// Re-export constants
export {
  ERROR_QUALITIES,
  IN_PLAY_QUALITIES,
  isErrorQuality,
  SERVE_SPIN_GRID,
  SERVE_SPIN_NUMPAD,
  SERVE_WING_MAP,
  deriveServeWing,
  ESSENTIAL_SHOT_TYPES,
  SHOT_TYPE_SPIN_MAP,
  deriveInferredSpin,
  LANDING_ZONE_GRID,
  deriveLandingType,
  POSITION_SECTOR_GRID,
  getPositionDistance,
} from '../rules/types'

// Tagging session state (kept for backward compatibility)
export interface TaggingSession {
  matchId: string
  currentTime: number
  isPlaying: boolean
  playbackSpeed: number
  contacts: import('../rules/types').Contact[]
  rallies: import('../rules/types').Rally[]
  currentRallyContacts: import('../rules/types').Contact[]
  player1Score: number
  player2Score: number
  currentServerId: string
}

