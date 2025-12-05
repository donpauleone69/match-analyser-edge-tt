/**
 * Validation Service - Ensures data integrity across match hierarchy
 * Validates: Match ÔåÆ Sets ÔåÆ Rallies ÔåÆ Shots
 */

import type { DBMatch, DBSet, DBRally, DBShot } from '@/data'

export interface ValidationError {
  level: 'error' | 'warning'
  entity: 'match' | 'set' | 'rally' | 'shot'
  entityId: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

/**
 * Validate complete match data hierarchy
 */
export function validateMatchData(
  match: DBMatch,
  sets: DBSet[],
  rallies: DBRally[],
  shots: DBShot[]
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // Validate match-level consistency
  validateMatchSetsConsistency(match, sets, errors, warnings)

  // Validate each set
  sets.forEach(set => {
    validateSetRalliesConsistency(set, rallies, errors, warnings)
  })

  // Validate each rally
  rallies.forEach(rally => {
    validateRallyShotsConsistency(rally, shots, errors)
  })

  // Validate sequential ordering
  validateSetSequencing(sets, errors)
  
  sets.forEach(set => {
    const setRallies = rallies.filter(r => r.set_id === set.id)
    validateRallySequencing(setRallies, set.id, errors)
    
    setRallies.forEach(rally => {
      const rallyShots = shots.filter(s => s.rally_id === rally.id)
      validateShotSequencing(rallyShots, rally.id, errors)
    })
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Match ÔåÆ Sets validation
 */
function validateMatchSetsConsistency(
  match: DBMatch,
  sets: DBSet[],
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  const setsWithWinners = sets.filter(s => s.winner_id !== null)
  const player1Wins = setsWithWinners.filter(s => s.winner_id === match.player1_id).length
  const player2Wins = setsWithWinners.filter(s => s.winner_id === match.player2_id).length

  // Warning: Match set count doesn't match actual sets with winners
  if (match.player1_sets_won !== player1Wins || match.player2_sets_won !== player2Wins) {
    warnings.push({
      level: 'warning',
      entity: 'match',
      entityId: match.id,
      message: `Match shows ${match.player1_sets_won}-${match.player2_sets_won} but actual set winners show ${player1Wins}-${player2Wins}`,
    })
  }

  // Error: Set winners must be valid players
  sets.forEach(set => {
    if (set.winner_id && set.winner_id !== match.player1_id && set.winner_id !== match.player2_id) {
      errors.push({
        level: 'error',
        entity: 'set',
        entityId: set.id,
        message: `Set ${set.set_number} winner_id is not a valid player in this match`,
      })
    }
  })

  // Warning: Match winner doesn't match set count
  if (match.winner_id) {
    const winnerSetsWon = match.winner_id === match.player1_id ? player1Wins : player2Wins
    const loserSetsWon = match.winner_id === match.player1_id ? player2Wins : player1Wins
    
    if (winnerSetsWon <= loserSetsWon) {
      warnings.push({
        level: 'warning',
        entity: 'match',
        entityId: match.id,
        message: `Match winner has ${winnerSetsWon} sets but opponent has ${loserSetsWon} sets`,
      })
    }
  }
}

/**
 * Set ÔåÆ Rallies validation
 */
function validateSetRalliesConsistency(
  set: DBSet,
  rallies: DBRally[],
  _errors: ValidationError[],
  warnings: ValidationError[]
): void {
  const setRallies = rallies.filter(r => r.set_id === set.id)

  if (setRallies.length === 0 && set.is_tagged) {
    warnings.push({
      level: 'warning',
      entity: 'set',
      entityId: set.id,
      message: `Set ${set.set_number} is marked as tagged but has no rallies`,
    })
    return
  }

  // Validate final scores match rally outcomes
  const lastRally = setRallies[setRallies.length - 1]
  if (lastRally && set.is_tagged) {
    if (lastRally.player1_score_after !== set.player1_final_score ||
        lastRally.player2_score_after !== set.player2_final_score) {
      warnings.push({
        level: 'warning',
        entity: 'set',
        entityId: set.id,
        message: `Set ${set.set_number} final score (${set.player1_final_score}-${set.player2_final_score}) doesn't match last rally score (${lastRally.player1_score_after}-${lastRally.player2_score_after})`,
      })
    }
  }

  // Validate score progression
  let expectedP1 = 0
  let expectedP2 = 0
  
  setRallies.forEach((rally, idx) => {
    if (rally.is_scoring && rally.winner_id) {
      if (rally.winner_id === 'player1') expectedP1++
      else if (rally.winner_id === 'player2') expectedP2++
    }

    if (rally.player1_score_after !== expectedP1 || rally.player2_score_after !== expectedP2) {
      warnings.push({
        level: 'warning',
        entity: 'rally',
        entityId: rally.id,
        message: `Rally ${idx + 1} in Set ${set.set_number}: Score after (${rally.player1_score_after}-${rally.player2_score_after}) doesn't match expected (${expectedP1}-${expectedP2})`,
      })
    }
  })
}

/**
 * Rally ÔåÆ Shots validation
 */
function validateRallyShotsConsistency(
  rally: DBRally,
  shots: DBShot[],
  errors: ValidationError[],
  _warnings?: ValidationError[]
): void {
  const rallyShots = shots.filter(s => s.rally_id === rally.id)

  // Error: Rally must have at least one shot (the serve)
  if (rallyShots.length === 0 && rally.has_video_data) {
    errors.push({
      level: 'error',
      entity: 'rally',
      entityId: rally.id,
      message: `Rally ${rally.rally_index} has no shots but has_video_data is true`,
    })
  }

  // Validate shot indices are sequential
  const sortedShots = [...rallyShots].sort((a, b) => a.shot_index - b.shot_index)
  sortedShots.forEach((shot, idx) => {
    if (shot.shot_index !== idx + 1) {
      errors.push({
        level: 'error',
        entity: 'shot',
        entityId: shot.id,
        message: `Shot has shot_index ${shot.shot_index} but should be ${idx + 1} in rally ${rally.rally_index}`,
      })
    }
  })
}

/**
 * Validate sets are sequentially numbered
 */
function validateSetSequencing(sets: DBSet[], errors: ValidationError[]): void {
  const sorted = [...sets].sort((a, b) => a.set_number - b.set_number)
  
  sorted.forEach((set, idx) => {
    if (set.set_number !== idx + 1) {
      errors.push({
        level: 'error',
        entity: 'set',
        entityId: set.id,
        message: `Set has set_number ${set.set_number} but should be ${idx + 1}`,
      })
    }
  })
}

/**
 * Validate rallies are sequentially numbered within a set
 */
function validateRallySequencing(
  rallies: DBRally[],
  setId: string,
  errors: ValidationError[]
): void {
  const sorted = [...rallies].sort((a, b) => a.rally_index - b.rally_index)
  
  sorted.forEach((rally, idx) => {
    if (rally.rally_index !== idx + 1) {
      errors.push({
        level: 'error',
        entity: 'rally',
        entityId: rally.id,
        message: `Rally has rally_index ${rally.rally_index} but should be ${idx + 1} in set ${setId}`,
      })
    }
  })
}

/**
 * Validate shots are sequentially numbered within a rally
 */
function validateShotSequencing(
  shots: DBShot[],
  rallyId: string,
  errors: ValidationError[]
): void {
  const sorted = [...shots].sort((a, b) => a.shot_index - b.shot_index)
  
  sorted.forEach((shot, idx) => {
    if (shot.shot_index !== idx + 1) {
      errors.push({
        level: 'error',
        entity: 'shot',
        entityId: shot.id,
        message: `Shot has shot_index ${shot.shot_index} but should be ${idx + 1} in rally ${rallyId}`,
      })
    }
  })
}

/**
 * Quick validation for a single set
 */
export function validateSet(set: DBSet): ValidationError[] {
  const errors: ValidationError[] = []

  if (set.set_number < 1) {
    errors.push({
      level: 'error',
      entity: 'set',
      entityId: set.id,
      message: 'Set number must be >= 1',
    })
  }

  if (set.player1_final_score < 0 || set.player2_final_score < 0) {
    errors.push({
      level: 'error',
      entity: 'set',
      entityId: set.id,
      message: 'Set scores cannot be negative',
    })
  }

  return errors
}

