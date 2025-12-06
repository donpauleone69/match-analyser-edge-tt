/**
 * Edge TT Match Analyser — End of Point Derivation Engine
 * 
 * @deprecated This file is being phased out in favor of more granular derivation functions.
 * 
 * New code should use:
 * - `/rules/derive/rally/deriveRally_winner_id.ts` for rally winner derivation
 * - `/rules/derive/rally/deriveRally_point_end_type.ts` for point end type
 * - `/rules/derive/rally/deriveRally_is_scoring.ts` for let detection
 * - `/rules/derive/shot/deriveShot_rally_end_role.ts` for error role mapping
 * 
 * This file remains for backward compatibility with existing code.
 * 
 * Pure functions to derive end-of-point outcomes from shot data.
 * 
 * Key derivations:
 * - Winner ID from last shot quality
 * - Landing type from error quality
 * - Point end type (partial, may need user input)
 * - Whether forced/unforced question is needed
 * 
 * No React, no IO — deterministic calculations only.
 */

import type {
  PlayerId,
  ShotQuality,
  LandingType,
  PointEndType,
} from './types'

import {
  isErrorQuality,
  deriveLandingType,
} from './types'

import { otherPlayer } from './calculate/calculateServer'

// =============================================================================
// LAST SHOT ANALYSIS
// =============================================================================

export interface LastShotInput {
  playerId: PlayerId
  shotIndex: number
  shotQuality: ShotQuality
}

export interface DerivedEndOfPoint {
  /** Who won the point */
  winnerId: PlayerId
  /** Derived landing type (from shot quality) */
  landingType: LandingType
  /** Derived point end type (may be partial if user input needed) */
  pointEndType: PointEndType | null
  /** Whether we need to ask user if error was forced or unforced */
  needsForcedUnforcedQuestion: boolean
  /** Explanation of derivation for UI display */
  derivationNote: string
}

/**
 * Derive end-of-point outcomes from the last shot.
 * 
 * Logic:
 * - Error qualities (inNet, missedLong, missedWide) → other player wins
 * - In-play qualities (good, average, weak) → this player wins (opponent couldn't return)
 * - Point end type depends on shot index:
 *   - Shot 1 (serve) + error → serviceFault
 *   - Shot 2 (return) + error → receiveError
 *   - Shot 3+ + error → ask forced/unforced
 *   - Any in-play quality → winnerShot
 */
export function deriveEndOfPoint(input: LastShotInput): DerivedEndOfPoint {
  const { playerId, shotIndex, shotQuality } = input
  
  const isError = isErrorQuality(shotQuality)
  const landingType = deriveLandingType(shotQuality)
  
  if (isError) {
    // Error shot → other player wins
    const winnerId = otherPlayer(playerId)
    
    // Determine point end type based on shot index
    if (shotIndex === 1) {
      // Serve fault
      return {
        winnerId,
        landingType,
        pointEndType: 'serviceFault',
        needsForcedUnforcedQuestion: false,
        derivationNote: 'Service fault — serve went ' + formatLandingType(landingType),
      }
    } else if (shotIndex === 2) {
      // Receive error
      return {
        winnerId,
        landingType,
        pointEndType: 'receiveError',
        needsForcedUnforcedQuestion: false,
        derivationNote: 'Receive error — return went ' + formatLandingType(landingType),
      }
    } else {
      // Rally error — need to ask if forced or unforced
      return {
        winnerId,
        landingType,
        pointEndType: null, // Will be set by user
        needsForcedUnforcedQuestion: true,
        derivationNote: 'Rally error — shot went ' + formatLandingType(landingType) + '. Was it forced or unforced?',
      }
    }
  } else {
    // In-play shot → this player wins (opponent couldn't return)
    return {
      winnerId: playerId,
      landingType: 'inPlay',
      pointEndType: 'winnerShot',
      needsForcedUnforcedQuestion: false,
      derivationNote: 'Winner shot — opponent could not return',
    }
  }
}

// =============================================================================
// LET DETECTION
// =============================================================================

export interface LetInput {
  shotIndex: number
  isNetServe: boolean
}

/**
 * Check if this is a let (non-scoring rally restart).
 * Currently only net serves are lets.
 */
export function isLet(input: LetInput): boolean {
  return input.shotIndex === 1 && input.isNetServe
}

/**
 * Create end-of-point result for a let.
 */
export function createLetResult(): DerivedEndOfPoint {
  return {
    winnerId: 'player1', // Doesn't matter, rally is non-scoring
    landingType: 'net',
    pointEndType: 'let',
    needsForcedUnforcedQuestion: false,
    derivationNote: 'Let — serve touched net, rally replayed',
  }
}

// =============================================================================
// COMPLETE END OF POINT
// =============================================================================

export interface CompleteEndOfPointInput {
  derived: DerivedEndOfPoint
  userSelection?: 'forcedError' | 'unforcedError'
}

/**
 * Complete the end-of-point derivation with user input (if needed).
 */
export function completeEndOfPoint(input: CompleteEndOfPointInput): DerivedEndOfPoint {
  const { derived, userSelection } = input
  
  if (!derived.needsForcedUnforcedQuestion) {
    return derived
  }
  
  if (!userSelection) {
    throw new Error('User selection required for forced/unforced question')
  }
  
  return {
    ...derived,
    pointEndType: userSelection,
    needsForcedUnforcedQuestion: false,
    derivationNote: derived.derivationNote.replace(
      'Was it forced or unforced?',
      userSelection === 'forcedError' ? 'Forced error' : 'Unforced error'
    ),
  }
}

// =============================================================================
// SCORE UPDATE
// =============================================================================

export interface ScoreUpdateInput {
  currentPlayer1Score: number
  currentPlayer2Score: number
  winnerId: PlayerId
  isScoring: boolean
}

export interface ScoreUpdateResult {
  player1ScoreAfter: number
  player2ScoreAfter: number
}

/**
 * Calculate score after a rally.
 */
export function calculateScoreAfterRally(input: ScoreUpdateInput): ScoreUpdateResult {
  const { currentPlayer1Score, currentPlayer2Score, winnerId, isScoring } = input
  
  if (!isScoring) {
    // Non-scoring rally (let) — score unchanged
    return {
      player1ScoreAfter: currentPlayer1Score,
      player2ScoreAfter: currentPlayer2Score,
    }
  }
  
  return {
    player1ScoreAfter: winnerId === 'player1' ? currentPlayer1Score + 1 : currentPlayer1Score,
    player2ScoreAfter: winnerId === 'player2' ? currentPlayer2Score + 1 : currentPlayer2Score,
  }
}

// =============================================================================
// SET END DETECTION
// =============================================================================

export interface SetEndInput {
  player1Score: number
  player2Score: number
  targetScore?: number
}

export interface SetEndResult {
  isSetEnd: boolean
  winnerId: PlayerId | null
}

/**
 * Check if the set has ended based on score.
 * Standard rules: first to 11 with 2-point lead.
 */
export function checkSetEnd(input: SetEndInput): SetEndResult {
  const { player1Score, player2Score, targetScore = 11 } = input
  
  const maxScore = Math.max(player1Score, player2Score)
  const minScore = Math.min(player1Score, player2Score)
  const lead = maxScore - minScore
  
  // Set ends when someone reaches target with 2+ lead
  if (maxScore >= targetScore && lead >= 2) {
    return {
      isSetEnd: true,
      winnerId: player1Score > player2Score ? 'player1' : 'player2',
    }
  }
  
  return {
    isSetEnd: false,
    winnerId: null,
  }
}

// Legacy aliases for backward compatibility during migration
export const checkGameEnd = checkSetEnd
export type GameEndInput = SetEndInput
export type GameEndResult = SetEndResult

// =============================================================================
// HELPERS
// =============================================================================

function formatLandingType(landingType: LandingType): string {
  switch (landingType) {
    case 'net': return 'into the net'
    case 'offLong': return 'off the end'
    case 'wide': return 'wide'
    case 'inPlay': return 'in play'
  }
}

// =============================================================================
// AUTO-PRUNE MISCLICKS
// =============================================================================

export interface AutoPruneInput {
  shots: Array<{ id: string; shotIndex: number }>
  errorShotIndex: number
}

export interface AutoPruneResult {
  contactsToDelete: string[]
  prunedCount: number
}

/**
 * Identify shots to auto-delete after an error-marked shot.
 * 
 * If a shot at index N is marked as an error (ending the rally),
 * any shots at index > N must be misclicks and should be pruned.
 */
export function calculateContactsToPrune(input: AutoPruneInput): AutoPruneResult {
  const { shots, errorShotIndex } = input
  
  const contactsToDelete = shots
    .filter(c => c.shotIndex > errorShotIndex)
    .map(c => c.id)
  
  return {
    contactsToDelete,
    prunedCount: contactsToDelete.length,
  }
}

