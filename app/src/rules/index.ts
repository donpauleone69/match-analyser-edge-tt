/**
 * Edge TT Match Analyser — Rules Layer
 * 
 * Pure domain logic exports.
 * No React, no IO — just calculations and derivations.
 */

// Types
export * from './types'

// Server calculation
export {
  calculateServer,
  calculateNextServer,
  validateServerSequence,
  willServiceChange,
  servesRemaining,
  otherPlayer,
  calculateSetFirstServer,
  calculateServerFromContext,
  validateServerAcrossVideos,
  type CalculateServerInput,
  type CalculateNextServerInput,
  type ValidateServerInput,
  type ServerResult,
  type ValidationResult,
  type ServiceRule,
  type SetFirstServerInput,
  type ServerFromContextInput,
  type MultiVideoServerValidationInput,
  type MultiVideoValidationResult,
  DEFAULT_SERVICE_RULE,
} from './calculateServer'

// Shot player calculation
export {
  calculateShotPlayer,
} from './calculateShotPlayer'

// End of point derivation
export {
  deriveEndOfPoint,
  isLet,
  createLetResult,
  completeEndOfPoint,
  calculateScoreAfterRally,
  checkSetEnd,
  checkGameEnd,  // Legacy alias
  calculateContactsToPrune,
  type LastShotInput,
  type DerivedEndOfPoint,
  type LetInput,
  type CompleteEndOfPointInput,
  type ScoreUpdateInput,
  type ScoreUpdateResult,
  type SetEndInput,
  type SetEndResult,
  type GameEndInput,  // Legacy alias
  type GameEndResult,  // Legacy alias
  type AutoPruneInput,
  type AutoPruneResult,
} from './deriveEndOfPoint'

// Match/Set/Rally validation
export {
  validateMatchWinner,
  validateSetWinner,
  validateRallyDerivedSetScore,
  validateScoreProgression,
  validateCompleteMatch,
  type ValidationError,
  type MatchValidationInput,
  type SetValidationInput,
  type RallySetValidationInput,
  type ScoreProgressionInput,
  type CompleteMatchValidationInput,
  type CompleteMatchValidation,
} from './validateMatchData'

// Video coverage validation
export {
  validateVideoSequence,
  validateVideoOverlap,
  validateVideoContinuity,
  validateSetCoverage,
  validateCompleteVideoCoverage,
  getVideoCoverageSummary,
  type VideoSegment,
  type SetCoverageInput,
  type CompleteVideoCoverageValidation,
  type VideoCoverageSummary,
} from './validateVideoCoverage'

// Score derivation (bottom-up)
export {
  deriveSetScoreFromRallies,
  deriveMatchScoreFromSets,
  deriveSetWinner,
  deriveRallyWinnerFromShots,
  deriveCompleteMatchScores,
  type RallyData,
  type DerivedSetScore,
  type SetData,
  type DerivedMatchScore,
  type PointScores,
  type DerivedSetWinner,
  type ShotData,
  type DerivedRallyWinner,
  type CompleteMatchDerivation,
} from './deriveMatchScores'

