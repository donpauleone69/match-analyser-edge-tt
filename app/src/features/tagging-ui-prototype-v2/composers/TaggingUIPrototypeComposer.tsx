/**
 * TaggingUIPrototypeComposer — V2 main orchestrator
 * 
 * Phase 1: Timestamp capture with 1x4 button layout
 * Phase 2: Sequential question-based shot tagging
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Phase1TimestampComposer, type Phase1Rally } from './Phase1TimestampComposer'
import { Phase2DetailComposer, type DetailedShot } from './Phase2DetailComposer'
import { Button } from '@/ui-mine'
import { Card } from '@/ui-mine/Card'
import { useMatchManagementStore } from '@/stores/matchManagementStore'
import { usePlayerStore } from '@/stores/playerStore'
import { 
  createSet,
  createRally,
  createShot,
  updateRally,
  updateSet,
} from '@/database/services/matchService'
import {
  mapPhase1RallyToDBRally,
  mapPhase1ShotToDBShot,
  mapPhase2DetailToDBShot,
  calculateScoresForRallies,
  markRallyEndShots,
  type DetailedShotData,
} from '@/database/services/mappingService'
import { runInferenceForSet } from '@/database/services/inferenceService'
import { calculateShotPlayer } from '@/rules'

export interface TaggingUIPrototypeComposerProps {
  className?: string
}

type Phase = 'phase1' | 'phase2' | 'saving' | 'complete'

export function TaggingUIPrototypeComposer({ className }: TaggingUIPrototypeComposerProps) {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  
  const { matches, loadMatches } = useMatchManagementStore()
  const { players, loadPlayers } = usePlayerStore()
  
  const [phase, setPhase] = useState<Phase>('phase1')
  const [phase1Rallies, setPhase1Rallies] = useState<Phase1Rally[]>([])
  
  const currentMatch = matches.find(m => m.id === matchId)
  
  useEffect(() => {
    loadMatches()
    loadPlayers()
  }, [loadMatches, loadPlayers])
  
  const handleCompletePhase1 = (rallies: Phase1Rally[]) => {
    setPhase1Rallies(rallies)
    setPhase('phase2')
  }
  
  const handleCompletePhase2 = async (detailedShots: DetailedShot[]) => {
    if (!matchId || !currentMatch) {
      alert('No match selected!')
      return
    }
    
    setPhase('saving')
    
    try {
      // Create a set for this tagging session
      const setData = await createSet({
        match_id: matchId,
        set_number: 1, // For now, assume first set (can be extended)
        player1_final_score: 0, // Will be calculated
        player2_final_score: 0, // Will be calculated
        first_server_id: phase1Rallies[0]?.serverId === 'player1' 
          ? currentMatch.player1_id 
          : currentMatch.player2_id,
        winner_id: null,
        has_video: true,
        video_start_player1_score: 0,
        video_start_player2_score: 0,
        end_of_set_timestamp: null,
      })
      
      // Map Phase 1 rallies to database rallies
      const dbRallies = phase1Rallies.map((rally, index) => 
        mapPhase1RallyToDBRally(rally, setData.id, index + 1, currentMatch.player1_id, currentMatch.player2_id)
      )
      
      // Save all rallies
      const savedRallies = await Promise.all(
        dbRallies.map(rally => createRally(rally))
      )
      
      // Build a map from Phase1Rally.id to saved DBRally
      const rallyIdMap = new Map<string, string>()
      phase1Rallies.forEach((p1Rally, index) => {
        rallyIdMap.set(p1Rally.id, savedRallies[index].id)
      })
      
      // Map and save all shots (Phase 1 structure + Phase 2 details)
      const dbShots = detailedShots.map(detailedShot => {
        const dbRallyId = rallyIdMap.get(detailedShot.rallyId)
        if (!dbRallyId) throw new Error('Rally mapping failed')
        
        const shotPlayer = calculateShotPlayer(detailedShot.serverId, detailedShot.shotIndex)
        const playerId = shotPlayer === 'player1' ? currentMatch.player1_id : currentMatch.player2_id
        
        // Create initial shot structure from Phase 1
        const baseShot = mapPhase1ShotToDBShot(detailedShot, dbRallyId, playerId)
        
        // Apply Phase 2 details
        const detailData: DetailedShotData = {
          direction: detailedShot.direction,
          length: detailedShot.length,
          spin: detailedShot.spin,
          stroke: detailedShot.stroke,
          intent: detailedShot.intent,
          errorType: detailedShot.errorType,
          shotQuality: detailedShot.shotQuality,
        }
        
        const phase2Updates = mapPhase2DetailToDBShot(
          detailedShot.isServe,
          detailedShot.isError,
          detailData
        )
        
        return { ...baseShot, ...phase2Updates }
      })
      
      // Mark rally-ending shots
      const shotsWithEndMarkers = markRallyEndShots(dbShots, savedRallies)
      
      // Save all shots
      await Promise.all(shotsWithEndMarkers.map(shot => createShot(shot)))
      
      // Determine rally winners and update rally scores
      // For now, winner is determined by who made the error
      const ralliesWithWinners = savedRallies.map((rally) => {
        const rallyShots = shotsWithEndMarkers.filter(s => s.rally_id === rally.id)
        const lastShot = rallyShots[rallyShots.length - 1]
        
        // Winner is the other player if last shot was an error
        if (rally.is_scoring && lastShot?.rally_end_role === 'unforced_error') {
          const winnerId = lastShot.player_id === currentMatch.player1_id 
            ? currentMatch.player2_id 
            : currentMatch.player1_id
          return { ...rally, winner_id: winnerId }
        }
        
        return rally
      })
      
      // Calculate scores
      const ralliesWithScores = calculateScoresForRallies(
        ralliesWithWinners,
        currentMatch.player1_id,
        currentMatch.player2_id
      )
      
      // Update all rallies with winner and scores
      await Promise.all(ralliesWithScores.map(rally => updateRally(rally.id, rally)))
      
      // Update set final scores
      const finalRally = ralliesWithScores[ralliesWithScores.length - 1]
      if (finalRally) {
        await updateSet(setData.id, {
          player1_final_score: finalRally.player1_score_after,
          player2_final_score: finalRally.player2_score_after,
        })
      }
      
      // Run inference on all shots
      await runInferenceForSet(ralliesWithScores, shotsWithEndMarkers)
      
      setPhase('complete')
    } catch (error) {
      console.error('Failed to save match data:', error)
      alert('Failed to save match data. Please try again.')
      setPhase('phase2') // Allow retry
    }
  }
  
  // Removed unused function
  
  const handleViewData = () => {
    navigate(`/data-viewer?match=${matchId}`)
  }
  
  // No match selected
  if (!matchId || !currentMatch) {
    return (
      <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
        <Card className="p-8 max-w-lg text-center">
          <h2 className="text-2xl font-bold text-neutral-50 mb-4">No Match Selected</h2>
          <p className="text-neutral-400 mb-6">
            Please select a match from the match list to start tagging.
          </p>
          <Button onClick={() => navigate('/matches')}>
            Go to Matches
          </Button>
        </Card>
      </div>
    )
  }
  
  if (phase === 'saving') {
    return (
      <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
        <div className="text-center space-y-4">
          <div className="text-4xl">💾</div>
          <h2 className="text-2xl font-bold text-neutral-50">Saving Match Data...</h2>
          <p className="text-neutral-400">
            Saving {phase1Rallies.length} rallies to database
          </p>
        </div>
      </div>
    )
  }
  
  if (phase === 'complete') {
    const player1Name = players.find(p => p.id === currentMatch?.player1_id)?.first_name || 'Player 1'
    const player2Name = players.find(p => p.id === currentMatch?.player2_id)?.first_name || 'Player 2'
    
    return (
      <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
        <Card className="p-8 max-w-lg text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-3xl font-bold text-neutral-50 mb-2">Tagging Complete!</h2>
          <p className="text-neutral-400 mb-6">
            Successfully tagged {phase1Rallies.length} rallies for<br />
            <span className="font-semibold text-neutral-200">{player1Name} vs {player2Name}</span>
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => navigate('/matches')}>
              Back to Matches
            </Button>
            <Button variant="primary" onClick={handleViewData}>
              View Data
            </Button>
          </div>
        </Card>
      </div>
    )
  }
  
  if (phase === 'phase2') {
    return (
      <Phase2DetailComposer
        phase1Rallies={phase1Rallies}
        onComplete={handleCompletePhase2}
        className={className}
      />
    )
  }
  
  return (
    <Phase1TimestampComposer
      onCompletePhase1={handleCompletePhase1}
      className={className}
    />
  )
}
