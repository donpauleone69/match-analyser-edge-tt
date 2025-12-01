/**
 * deriveMatchPanel — View model derivation for Match Panel
 */

import { useMemo } from 'react'
import { useTaggingStore } from '@/stores/taggingStore'
import type { MatchPanelVM, RallyTreeNodeVM, GameNodeVM, PointDetailsTreeVM } from '../models'

/**
 * Derive the Match Panel view model from store state.
 */
export function useDeriveMatchPanel(): MatchPanelVM {
  const {
    player1Name,
    player2Name,
    matchDate,
    games,
    player1Score,
    player2Score,
    currentServerId,
    taggingMode,
  } = useTaggingStore()
  
  return useMemo(() => {
    // Calculate set score from games
    const player1Sets = games.filter(g => g.winnerId === 'player1').length
    const player2Sets = games.filter(g => g.winnerId === 'player2').length
    
    return {
      player1Name,
      player2Name,
      matchDate,
      currentSetScore: `${player1Sets}-${player2Sets}`,
      currentPointsScore: `${player1Score}-${player2Score}`,
      currentServerId,
      taggingMode,
    }
  }, [player1Name, player2Name, matchDate, games, player1Score, player2Score, currentServerId, taggingMode])
}

/**
 * Derive the Point Details tree view model.
 */
export function useDerivePointDetailsTree(): PointDetailsTreeVM {
  const {
    rallies,
    games,
    currentReviewRallyIndex,
    player1Name,
    player2Name,
  } = useTaggingStore()
  
  return useMemo(() => {
    // Group rallies by game
    const gameNodes: GameNodeVM[] = []
    let currentGameRallies: RallyTreeNodeVM[] = []
    let currentGameNumber = 1
    let errorsCount = 0
    
    rallies.forEach((rally, index) => {
      const hasError = !rally.winnerId && rally.isScoring // Missing winner is an error
      if (hasError) errorsCount++
      
      const node: RallyTreeNodeVM = {
        id: rally.id,
        rallyIndex: rally.rallyIndex,
        isScoring: rally.isScoring,
        winnerId: rally.winnerId,
        serverId: rally.serverId,
        scoreAfter: `${rally.player1ScoreAfter}-${rally.player2ScoreAfter}`,
        shotCount: rally.contacts.length,
        isExpanded: false,
        isCurrentReview: index === currentReviewRallyIndex,
        isHighlight: rally.isHighlight || false,
        hasError,
        // Part 2 - expanded view data
        contacts: rally.contacts,
        endOfPointTime: rally.endOfPointTime,
      }
      
      currentGameRallies.push(node)
      
      // Check if game ended (someone reached 11 with 2+ lead)
      const p1 = rally.player1ScoreAfter
      const p2 = rally.player2ScoreAfter
      const maxScore = Math.max(p1, p2)
      const lead = Math.abs(p1 - p2)
      
      if (maxScore >= 11 && lead >= 2) {
        // Game ended
        gameNodes.push({
          gameNumber: currentGameNumber,
          player1Score: p1,
          player2Score: p2,
          winnerId: p1 > p2 ? 'player1' : 'player2',
          rallies: currentGameRallies,
          isExpanded: true,
        })
        currentGameRallies = []
        currentGameNumber++
      }
    })
    
    // Add current in-progress game if there are rallies
    if (currentGameRallies.length > 0) {
      gameNodes.push({
        gameNumber: currentGameNumber,
        player1Score: rallies.length > 0 ? rallies[rallies.length - 1].player1ScoreAfter : 0,
        player2Score: rallies.length > 0 ? rallies[rallies.length - 1].player2ScoreAfter : 0,
        winnerId: undefined,
        rallies: currentGameRallies,
        isExpanded: true,
      })
    }
    
    return {
      games: gameNodes,
      totalRallies: rallies.length,
      ralliesWithErrors: errorsCount,
    }
  }, [rallies, games, currentReviewRallyIndex, player1Name, player2Name])
}

