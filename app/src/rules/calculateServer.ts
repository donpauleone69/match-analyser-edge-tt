/**
 * Edge TT Match Analyser — Serve Order Engine
 * 
 * Pure functions to calculate server/receiver based on:
 * - First server
 * - Service rule (default: 2 each, alternate after 10-10)
 * - Current score
 * 
 * No React, no IO — deterministic calculations only.
 */

import type { PlayerId } from './types'

// =============================================================================
// SERVICE RULES
// =============================================================================

/**
 * Standard service rule: 2 serves each, alternating at deuce (10-10+).
 */
export type ServiceRule = '2_each_to_10_then_alternate'

export const DEFAULT_SERVICE_RULE: ServiceRule = '2_each_to_10_then_alternate'

// =============================================================================
// CALCULATE SERVER
// =============================================================================

export interface CalculateServerInput {
  firstServerId: PlayerId
  player1Score: number
  player2Score: number
  serviceRule?: ServiceRule
}

export interface ServerResult {
  serverId: PlayerId
  receiverId: PlayerId
}

/**
 * Calculate the current server based on score and service rule.
 * 
 * Standard table tennis rules:
 * - Each player serves 2 points in rotation
 * - At deuce (10-10 or higher), service alternates every point
 * 
 * @param input - First server and current score
 * @returns Current server and receiver
 */
export function calculateServer(input: CalculateServerInput): ServerResult {
  const { firstServerId, player1Score, player2Score, serviceRule = DEFAULT_SERVICE_RULE } = input

  if (serviceRule !== '2_each_to_10_then_alternate') {
    // Future: support other service rules
    throw new Error(`Unsupported service rule: ${serviceRule}`)
  }

  const totalPoints = player1Score + player2Score
  const isDeuce = player1Score >= 10 && player2Score >= 10

  let serverId: PlayerId

  if (isDeuce) {
    // At deuce: alternate every point
    // First server at deuce is determined by who would serve after 10-10
    // At 10-10, 20 points have been played → 10 service changes → back to first server
    // So at deuce, we continue from where we left off
    const pointsAtDeuce = totalPoints - 20 // Points played after reaching 10-10
    const serviceChangesBeforeDeuce = 10 // 5 rotations of 2 serves each
    const totalServiceChanges = serviceChangesBeforeDeuce + pointsAtDeuce
    
    serverId = totalServiceChanges % 2 === 0 ? firstServerId : otherPlayer(firstServerId)
  } else {
    // Normal play: 2 serves each
    // Service changes every 2 points
    const serviceRotation = Math.floor(totalPoints / 2)
    serverId = serviceRotation % 2 === 0 ? firstServerId : otherPlayer(firstServerId)
  }

  return {
    serverId,
    receiverId: otherPlayer(serverId),
  }
}

// =============================================================================
// CALCULATE NEXT SERVER (after current point)
// =============================================================================

export interface CalculateNextServerInput extends CalculateServerInput {
  winnerId: PlayerId
}

/**
 * Calculate who serves next after the current point is scored.
 * 
 * @param input - Current state plus winner of current point
 * @returns Server for the next point
 */
export function calculateNextServer(input: CalculateNextServerInput): ServerResult {
  const { firstServerId, player1Score, player2Score, winnerId, serviceRule } = input

  // Calculate new score after this point
  const newPlayer1Score = winnerId === 'player1' ? player1Score + 1 : player1Score
  const newPlayer2Score = winnerId === 'player2' ? player2Score + 1 : player2Score

  return calculateServer({
    firstServerId,
    player1Score: newPlayer1Score,
    player2Score: newPlayer2Score,
    serviceRule,
  })
}

// =============================================================================
// VALIDATE SERVER SEQUENCE
// =============================================================================

export interface ValidateServerInput {
  firstServerId: PlayerId
  rallies: Array<{
    serverId: PlayerId
    winnerId?: PlayerId
    isScoring: boolean
  }>
  serviceRule?: ServiceRule
}

export interface ValidationResult {
  isValid: boolean
  errors: Array<{
    rallyIndex: number
    expectedServerId: PlayerId
    actualServerId: PlayerId
  }>
}

/**
 * Validate that a sequence of rallies has correct server assignments.
 * Useful for detecting and highlighting errors in tagging.
 * 
 * @param input - First server and rally sequence
 * @returns Validation result with any errors found
 */
export function validateServerSequence(input: ValidateServerInput): ValidationResult {
  const { firstServerId, rallies, serviceRule } = input

  const errors: ValidationResult['errors'] = []
  let player1Score = 0
  let player2Score = 0

  for (let i = 0; i < rallies.length; i++) {
    const rally = rallies[i]
    
    const expected = calculateServer({
      firstServerId,
      player1Score,
      player2Score,
      serviceRule,
    })

    if (rally.serverId !== expected.serverId) {
      errors.push({
        rallyIndex: i,
        expectedServerId: expected.serverId,
        actualServerId: rally.serverId,
      })
    }

    // Update score if scoring rally
    if (rally.isScoring && rally.winnerId) {
      if (rally.winnerId === 'player1') {
        player1Score++
      } else {
        player2Score++
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'player1' ? 'player2' : 'player1'
}

/**
 * Get the other player ID.
 * Exported for use in other rules modules.
 */
export { otherPlayer }

// =============================================================================
// SERVICE CHANGE DETECTION
// =============================================================================

/**
 * Check if service will change after this point.
 * Useful for UI indicators.
 */
export function willServiceChange(input: CalculateServerInput): boolean {
  const { player1Score, player2Score } = input
  const totalPoints = player1Score + player2Score
  const isDeuce = player1Score >= 10 && player2Score >= 10

  if (isDeuce) {
    // At deuce, service changes every point
    return true
  }

  // Normal play: service changes after every 2nd point
  return (totalPoints + 1) % 2 === 0
}

/**
 * Get the number of serves remaining for current server.
 */
export function servesRemaining(input: CalculateServerInput): number {
  const { player1Score, player2Score } = input
  const totalPoints = player1Score + player2Score
  const isDeuce = player1Score >= 10 && player2Score >= 10

  if (isDeuce) {
    return 1 // Always 1 at deuce
  }

  // Normal play: 2 - (points in current service block)
  return 2 - (totalPoints % 2)
}

