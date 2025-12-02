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
  type CalculateServerInput,
  type CalculateNextServerInput,
  type ValidateServerInput,
  type ServerResult,
  type ValidationResult,
  type ServiceRule,
  DEFAULT_SERVICE_RULE,
} from './calculateServer'

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

