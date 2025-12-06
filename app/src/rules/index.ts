/**
 * Edge TT Match Analyser — Rules Layer
 * 
 * Pure domain logic exports.
 * No React, no IO — just calculations, derivations, and inferences.
 * 
 * Organized by purpose:
 * - derive/    - Level 0: Deterministic derivations (100% fact)
 * - calculate/ - Deterministic calculations (arithmetic/logic)
 * - infer/     - Level 1+: Probabilistic inferences (with confidence)
 * - stats/     - Aggregated statistics and performance metrics
 * - validate/  - Data integrity and consistency checks
 */

// Types
export * from './types'

// Level 0: Derivations (100% deterministic)
export * from './derive'

// Calculations
export * from './calculate'

// Level 1+: Inferences (probabilistic)
export * from './infer'

// Statistics
export * from './stats'

// Validation
export * from './validate'

// ============================================================================
// LEGACY EXPORTS (backward compatibility - will be removed in future)
// ============================================================================

// Re-export from old locations for backward compatibility
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
} from './calculate/calculateServer'

export {
  calculateShotPlayer,
} from './calculate/calculateShotPlayer'

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
} from './validate/validateMatchData'

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
} from './validate/validateVideoCoverage'

// deriveEndOfPoint and deriveMatchScores still at root (will be refactored separately)
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
