/**
 * Derive Raw Data View Model
 * 
 * Presents unprocessed data organized by set for validation.
 */

import type { DBSet, DBRally, DBShot } from '@/data'
import type { RawDataViewModel } from '../models'

export function useDeriveRawData(
  sets: DBSet[],
  rallies: DBRally[],
  shots: DBShot[]
): RawDataViewModel {
  const sortedSets = [...sets].sort((a, b) => a.set_number - b.set_number)
  
  const setsData = sortedSets.map(set => {
    const setRallies = rallies
      .filter(r => r.set_id === set.id)
      .sort((a, b) => a.rally_index - b.rally_index)
    
    const ralliesData = setRallies.map(rally => {
      const rallyShots = shots
        .filter(s => s.rally_id === rally.id)
        .sort((a, b) => a.shot_index - b.shot_index)
      
      const shotsData = rallyShots.map(shot => ({
        shotIndex: shot.shot_index,
        playerId: shot.player_id,
        wing: shot.wing,
        intent: shot.intent,
        shotResult: shot.shot_result,
        shotOrigin: shot.shot_origin,
        shotDestination: shot.shot_destination,
        rallyEndRole: shot.rally_end_role,
      }))
      
      return {
        rallyIndex: rally.rally_index,
        serverId: rally.server_id,
        receiverId: rally.receiver_id,
        winnerId: rally.winner_id,
        isScoring: rally.is_scoring,
        player1ScoreAfter: rally.player1_score_after,
        player2ScoreAfter: rally.player2_score_after,
        pointEndType: rally.point_end_type,
        shotCount: rallyShots.length,
        shots: shotsData,
      }
    })
    
    return {
      setNumber: set.set_number,
      player1Score: set.player1_final_score,
      player2Score: set.player2_final_score,
      winnerId: set.winner_id || '',
      rallies: ralliesData,
    }
  })
  
  return {
    sets: setsData,
  }
}

