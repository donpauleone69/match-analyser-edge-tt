/**
 * Derive rally point_end_type (100% deterministic)
 * 
 * Logic:
 * - Shot 1 error → 'serviceFault'
 * - Shot 2 error → 'receiveError'
 * - Shot 3+ error → 'forcedError' or 'unforcedError' (requires user input to distinguish)
 * - Non-error shot → 'winnerShot'
 * - Net serve → 'let' (non-scoring)
 * 
 * Database Field Populated:
 * - rallies.point_end_type
 */

import type { PointEndType } from '../../types'
import type { ShotResult } from '@/data/entities/shots/shot.types'

export interface LastShotForPointEndType {
  shot_index: number
  shot_result?: ShotResult | null
  rally_end_role?: 'winner' | 'unforced_error' | 'forced_error' | 'service_fault' | 'receive_error' | null
}

export interface DerivedPointEndType {
  point_end_type: PointEndType | null
  needs_user_input: boolean
  note: string
}

/**
 * Derive point_end_type from the last shot.
 * 
 * @param lastShot - The final shot of the rally
 * @returns Point end type with flag indicating if user input needed
 */
export function deriveRally_point_end_type(
  lastShot: LastShotForPointEndType
): DerivedPointEndType {
  if (!lastShot) {
    return {
      point_end_type: null,
      needs_user_input: false,
      note: 'No last shot provided'
    }
  }
  
  // Check if error: shot_result !== 'in_play' means error occurred
  const isError = lastShot.shot_result && lastShot.shot_result !== 'in_play'
  
  if (isError) {
    // Shot 1: Service fault
    if (lastShot.shot_index === 1) {
      return {
        point_end_type: 'serviceFault',
        needs_user_input: false,
        note: `Service fault - ball went ${lastShot.shot_result?.replace('_', ' ')}`
      }
    }
    
    // Shot 2: Receive error
    if (lastShot.shot_index === 2) {
      return {
        point_end_type: 'receiveError',
        needs_user_input: false,
        note: `Receive error - ball went ${lastShot.shot_result?.replace('_', ' ')}`
      }
    }
    
    // Shot 3+: Check if rally_end_role is already set
    if (lastShot.rally_end_role === 'forced_error') {
      return {
        point_end_type: 'forcedError',
        needs_user_input: false,
        note: 'Rally error - forced'
      }
    }
    
    if (lastShot.rally_end_role === 'unforced_error') {
      return {
        point_end_type: 'unforcedError',
        needs_user_input: false,
        note: 'Rally error - unforced'
      }
    }
    
    // Shot 3+ error but no rally_end_role: needs user input
    return {
      point_end_type: null,
      needs_user_input: true,
      note: `Rally error - ball went ${lastShot.shot_result?.replace('_', ' ')}. Was it forced or unforced?`
    }
  }
  
  // Non-error: Winner shot (opponent couldn't return)
  return {
    point_end_type: 'winnerShot',
    needs_user_input: false,
    note: 'Winner shot - opponent could not return'
  }
}

