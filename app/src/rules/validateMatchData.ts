/**
 * Edge TT Match Analyser — Match Data Validation
 * 
 * Pure functions to validate data consistency across match/set/rally levels.
 * Supports bidirectional validation (top-down entry vs bottom-up derivation).
 * 
 * No React, no IO — deterministic validation only.
 */

import type { PlayerId } from './types'
import type { BestOf } from '@/data'

// =============================================================================
// VALIDATION ERROR TYPE
// =============================================================================

export interface ValidationError {
  field: string
  message: string
  severity?: 'error' | 'warning'
}

// =============================================================================
// MATCH-LEVEL VALIDATION
// =============================================================================

export interface MatchValidationInput {
  winnerId: PlayerId | null
  bestOf: BestOf
  player1SetsWon: number
  player2SetsWon: number
  setScoreSummary?: string | null  // e.g., "3-2"
}

/**
 * Validate match winner matches set scores
 */
export function validateMatchWinner(input: MatchValidationInput): ValidationError[] {
  const { winnerId, bestOf, player1SetsWon, player2SetsWon, setScoreSummary } = input
  const errors: ValidationError[] = []
  
  const totalSets = player1SetsWon + player2SetsWon
  const setsToWin = Math.ceil(bestOf / 2)
  
  // Check: winner has enough sets to win
  if (winnerId === 'player1' && player1SetsWon < setsToWin) {
    errors.push({
      field: 'winner_id',
      message: `Player 1 marked as winner but only won ${player1SetsWon} sets (needs ${setsToWin} to win best of ${bestOf})`,
      severity: 'error'
    })
  }
  
  if (winnerId === 'player2' && player2SetsWon < setsToWin) {
    errors.push({
      field: 'winner_id',
      message: `Player 2 marked as winner but only won ${player2SetsWon} sets (needs ${setsToWin} to win best of ${bestOf})`,
      severity: 'error'
    })
  }
  
  // Check: loser doesn't have enough to win
  if (winnerId === 'player1' && player2SetsWon >= setsToWin) {
    errors.push({
      field: 'player2_sets_won',
      message: `Player 2 has ${player2SetsWon} sets (enough to win) but Player 1 is marked as winner`,
      severity: 'error'
    })
  }
  
  if (winnerId === 'player2' && player1SetsWon >= setsToWin) {
    errors.push({
      field: 'player1_sets_won',
      message: `Player 1 has ${player1SetsWon} sets (enough to win) but Player 2 is marked as winner`,
      severity: 'error'
    })
  }
  
  // Check: total sets doesn't exceed bestOf
  if (totalSets > bestOf) {
    errors.push({
      field: 'best_of',
      message: `Total sets (${totalSets}) exceeds best of ${bestOf}`,
      severity: 'error'
    })
  }
  
  // Check: set score summary matches individual counts
  if (setScoreSummary) {
    const parts = setScoreSummary.split('-').map(s => parseInt(s.trim(), 10))
    if (parts.length === 2) {
      const [summaryP1, summaryP2] = parts
      if (summaryP1 !== player1SetsWon || summaryP2 !== player2SetsWon) {
        errors.push({
          field: 'set_score_summary',
          message: `Set score summary "${setScoreSummary}" doesn't match counts (${player1SetsWon}-${player2SetsWon})`,
          severity: 'warning'
        })
      }
    }
  }
  
  return errors
}

// =============================================================================
// SET-LEVEL VALIDATION
// =============================================================================

export interface SetValidationInput {
  setNumber: number
  player1FinalScore: number
  player2FinalScore: number
  winnerId: PlayerId | null
  targetScore?: number  // Default 11
}

/**
 * Validate set winner matches point scores
 */
export function validateSetWinner(input: SetValidationInput): ValidationError[] {
  const { setNumber, player1FinalScore, player2FinalScore, winnerId, targetScore = 11 } = input
  const errors: ValidationError[] = []
  
  const maxScore = Math.max(player1FinalScore, player2FinalScore)
  const minScore = Math.min(player1FinalScore, player2FinalScore)
  const lead = maxScore - minScore
  
  // Check: winner has higher score
  if (winnerId === 'player1' && player1FinalScore <= player2FinalScore) {
    errors.push({
      field: `set_${setNumber}_winner`,
      message: `Set ${setNumber}: Player 1 marked as winner but score is ${player1FinalScore}-${player2FinalScore}`,
      severity: 'error'
    })
  }
  
  if (winnerId === 'player2' && player2FinalScore <= player1FinalScore) {
    errors.push({
      field: `set_${setNumber}_winner`,
      message: `Set ${setNumber}: Player 2 marked as winner but score is ${player1FinalScore}-${player2FinalScore}`,
      severity: 'error'
    })
  }
  
  // Check: winner reached target with 2-point lead
  if (maxScore < targetScore) {
    errors.push({
      field: `set_${setNumber}_score`,
      message: `Set ${setNumber}: Ended at ${maxScore} but target is ${targetScore}`,
      severity: 'error'
    })
  }
  
  if (maxScore >= targetScore && lead < 2) {
    errors.push({
      field: `set_${setNumber}_score`,
      message: `Set ${setNumber}: Ended with only ${lead} point lead (needs 2)`,
      severity: 'error'
    })
  }
  
  // Check: scores are non-negative
  if (player1FinalScore < 0 || player2FinalScore < 0) {
    errors.push({
      field: `set_${setNumber}_score`,
      message: `Set ${setNumber}: Negative scores not allowed`,
      severity: 'error'
    })
  }
  
  return errors
}

// =============================================================================
// RALLY-TO-SET VALIDATION (BOTTOM-UP)
// =============================================================================

export interface RallySetValidationInput {
  setNumber: number
  rallies: Array<{
    isScoring: boolean
    winnerId: PlayerId | null
    player1ScoreAfter: number
    player2ScoreAfter: number
  }>
  expectedPlayer1FinalScore: number
  expectedPlayer2FinalScore: number
  expectedWinnerId: PlayerId | null
}

/**
 * Validate that rally scores derive to expected set scores
 */
export function validateRallyDerivedSetScore(input: RallySetValidationInput): ValidationError[] {
  const { 
    setNumber, 
    rallies, 
    expectedPlayer1FinalScore, 
    expectedPlayer2FinalScore, 
    expectedWinnerId 
  } = input
  const errors: ValidationError[] = []
  
  // Get final scores from last rally
  const lastRally = rallies[rallies.length - 1]
  if (!lastRally) {
    errors.push({
      field: `set_${setNumber}_rallies`,
      message: `Set ${setNumber}: No rallies found`,
      severity: 'error'
    })
    return errors
  }
  
  const derivedP1Score = lastRally.player1ScoreAfter
  const derivedP2Score = lastRally.player2ScoreAfter
  
  // Check: derived scores match expected
  if (derivedP1Score !== expectedPlayer1FinalScore || derivedP2Score !== expectedPlayer2FinalScore) {
    errors.push({
      field: `set_${setNumber}_derived_score`,
      message: `Set ${setNumber}: Rally-derived score (${derivedP1Score}-${derivedP2Score}) doesn't match set score (${expectedPlayer1FinalScore}-${expectedPlayer2FinalScore})`,
      severity: 'error'
    })
  }
  
  // Derive winner from scores
  const derivedWinnerId: PlayerId | null = derivedP1Score > derivedP2Score ? 'player1' : 
                                           derivedP2Score > derivedP1Score ? 'player2' : null
  
  if (derivedWinnerId !== expectedWinnerId) {
    errors.push({
      field: `set_${setNumber}_derived_winner`,
      message: `Set ${setNumber}: Rally-derived winner (${derivedWinnerId}) doesn't match set winner (${expectedWinnerId})`,
      severity: 'error'
    })
  }
  
  return errors
}

// =============================================================================
// SCORE PROGRESSION VALIDATION
// =============================================================================

export interface ScoreProgressionInput {
  setNumber: number
  rallies: Array<{
    rallyIndex: number
    isScoring: boolean
    winnerId: PlayerId | null
    player1ScoreAfter: number
    player2ScoreAfter: number
  }>
}

/**
 * Validate score progression is consistent throughout rallies
 */
export function validateScoreProgression(input: ScoreProgressionInput): ValidationError[] {
  const { setNumber, rallies } = input
  const errors: ValidationError[] = []
  
  let expectedP1Score = 0
  let expectedP2Score = 0
  
  for (let i = 0; i < rallies.length; i++) {
    const rally = rallies[i]
    
    // Update expected score based on winner
    if (rally.isScoring && rally.winnerId) {
      if (rally.winnerId === 'player1') {
        expectedP1Score++
      } else if (rally.winnerId === 'player2') {
        expectedP2Score++
      }
    }
    
    // Check if rally's score matches expected
    if (rally.player1ScoreAfter !== expectedP1Score || rally.player2ScoreAfter !== expectedP2Score) {
      errors.push({
        field: `set_${setNumber}_rally_${rally.rallyIndex}_score`,
        message: `Set ${setNumber}, Rally ${rally.rallyIndex}: Score after rally (${rally.player1ScoreAfter}-${rally.player2ScoreAfter}) doesn't match expected (${expectedP1Score}-${expectedP2Score})`,
        severity: 'error'
      })
    }
  }
  
  return errors
}

// =============================================================================
// COMPLETE VALIDATION
// =============================================================================

export interface CompleteMatchValidationInput {
  match: MatchValidationInput
  sets: Array<SetValidationInput & { 
    rallies: RallySetValidationInput['rallies']
  }>
}

export interface CompleteMatchValidation {
  matchErrors: ValidationError[]
  setErrors: Array<{ setNumber: number; errors: ValidationError[] }>
  rallySetErrors: Array<{ setNumber: number; errors: ValidationError[] }>
  scoreProgressionErrors: Array<{ setNumber: number; errors: ValidationError[] }>
  isValid: boolean
  allErrors: ValidationError[]
}

/**
 * Run complete validation across all levels
 */
export function validateCompleteMatch(input: CompleteMatchValidationInput): CompleteMatchValidation {
  const matchErrors = validateMatchWinner(input.match)
  
  const setErrors: Array<{ setNumber: number; errors: ValidationError[] }> = []
  const rallySetErrors: Array<{ setNumber: number; errors: ValidationError[] }> = []
  const scoreProgressionErrors: Array<{ setNumber: number; errors: ValidationError[] }> = []
  
  input.sets.forEach(set => {
    // Validate set scores
    const setErrs = validateSetWinner(set)
    if (setErrs.length > 0) {
      setErrors.push({ setNumber: set.setNumber, errors: setErrs })
    }
    
    // Validate rally-derived scores
    const rallyErrs = validateRallyDerivedSetScore({
      setNumber: set.setNumber,
      rallies: set.rallies,
      expectedPlayer1FinalScore: set.player1FinalScore,
      expectedPlayer2FinalScore: set.player2FinalScore,
      expectedWinnerId: set.winnerId
    })
    if (rallyErrs.length > 0) {
      rallySetErrors.push({ setNumber: set.setNumber, errors: rallyErrs })
    }
    
    // Validate score progression
    const progressionErrs = validateScoreProgression({
      setNumber: set.setNumber,
      rallies: set.rallies.map((r, idx) => ({
        rallyIndex: idx + 1,
        ...r
      }))
    })
    if (progressionErrs.length > 0) {
      scoreProgressionErrors.push({ setNumber: set.setNumber, errors: progressionErrs })
    }
  })
  
  // Collect all errors
  const allErrors = [
    ...matchErrors,
    ...setErrors.flatMap(s => s.errors),
    ...rallySetErrors.flatMap(s => s.errors),
    ...scoreProgressionErrors.flatMap(s => s.errors)
  ]
  
  const isValid = allErrors.filter(e => e.severity !== 'warning').length === 0
  
  return {
    matchErrors,
    setErrors,
    rallySetErrors,
    scoreProgressionErrors,
    isValid,
    allErrors
  }
}

// =============================================================================
// POINT SCORE VALIDATION
// =============================================================================

/**
 * Validate a point score string and parse it
 * Table tennis rules: Must be at least 11 points and win by 2
 */
export function validatePointScore(score: string): { valid: boolean; p1: number; p2: number } {
  const match = score.match(/^(\d+)-(\d+)$/)
  if (!match) {
    return { valid: false, p1: 0, p2: 0 }
  }
  
  const p1 = parseInt(match[1], 10)
  const p2 = parseInt(match[2], 10)
  
  // Basic table tennis scoring rules:
  // - At least one player must reach 11
  // - Winner must be ahead by 2 points
  const maxScore = Math.max(p1, p2)
  const diff = Math.abs(p1 - p2)
  
  if (maxScore >= 11 && diff >= 2) {
    return { valid: true, p1, p2 }
  }
  
  return { valid: false, p1: 0, p2: 0 }
}

