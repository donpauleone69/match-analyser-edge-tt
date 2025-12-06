/**
 * TaggingUIPrototypeComposer — V2 main orchestrator
 * 
 * Phase 1: Timestamp capture with 1x4 button layout
 * Phase 2: Sequential question-based shot tagging
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { cn } from '@/helpers/utils'
import { Phase1TimestampComposer, type Phase1Rally } from './Phase1TimestampComposer'
import { Phase2DetailComposer, type DetailedShot } from './Phase2DetailComposer'
import { Button } from '@/ui-mine'
import { Card } from '@/ui-mine/Card'
import { useMatchStore, usePlayerStore, setDb, rallyDb, shotDb } from '@/data'
import { useTaggingSessionStore } from '@/stores/taggingSessionStore'
import { useVideoPlaybackStore } from '@/ui-mine/VideoPlayer'
import { getVideoFile } from '@/helpers/videoStorage'
import { convertDBRallyToPhase1Rally } from './dataMapping'
const { 
  getByMatchId: getSetsByMatchId,
  deleteTaggingData: deleteSetTaggingData,
  markTaggingStarted: markSetTaggingStarted,
  markTaggingCompleted: markSetTaggingCompleted,
  update: updateSetService,
} = setDb
const { create: createRally, update: updateRally } = rallyDb
const { create: createShot } = shotDb
import {
  mapPhase1RallyToDBRally,
  mapPhase1ShotToDBShot,
  mapPhase2DetailToDBShot,
  calculateScoresForRallies,
  markRallyEndShots,
  type DetailedShotData,
} from './dataMapping'
import { runInferenceForSet } from './runInference'
import { calculateShotPlayer } from '@/rules'
import { PreTaggingSetupBlock } from '../blocks/PreTaggingSetupBlock'

export interface TaggingUIPrototypeComposerProps {
  className?: string
}

type Phase = 'setup' | 'pre_setup' | 'phase1' | 'phase2' | 'saving' | 'complete'

export function TaggingUIPrototypeComposer({ className }: TaggingUIPrototypeComposerProps) {
  const { matchId } = useParams<{ matchId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const { matches, load: loadMatches, update: updateMatch } = useMatchStore()
  const { players, load: loadPlayers } = usePlayerStore()
  
  const [phase, setPhase] = useState<Phase>('setup')
  const [phase1Rallies, setPhase1Rallies] = useState<Phase1Rally[]>([])
  const [selectedSetNumber, setSelectedSetNumber] = useState(1)
  const [currentSetId, setCurrentSetId] = useState<string | null>(null)
  const [isPreparingSet, setIsPreparingSet] = useState(false)
  const [phase2ResumeIndex, setPhase2ResumeIndex] = useState(0)
  const [setupData, setSetupData] = useState<{
    firstServerId: 'player1' | 'player2'
    startingScore: { player1: number; player2: number }
  } | null>(null)
  
  const currentMatch = matches.find(m => m.id === matchId)
  
  // Get set number and redo flag from URL params
  const urlSetNumber = searchParams.get('set')
  const isRedo = searchParams.get('redo') === 'true'
  
  useEffect(() => {
    loadMatches()
    loadPlayers()
  }, [loadMatches, loadPlayers])
  
  // Resume helper function
  const resumeTaggingSession = async (targetSet: any, matchId: string) => {
    try {
      console.log(`[Resume] Starting resume for Set ${targetSet.set_number}, phase: ${targetSet.tagging_phase}`)
      console.log(`[Resume] Progress: Phase1 ${targetSet.phase1_last_rally || 0}/${targetSet.phase1_total_rallies || 0}, Phase2 ${targetSet.phase2_last_shot_index || 0}/${targetSet.phase2_total_shots || 0}`)
      
      // Get player IDs early - if no match, can't resume
      if (!currentMatch) {
        console.error('[Resume] ✗ No current match found')
        throw new Error('Match not found')
      }
      const player1Id = currentMatch.player1_id
      const player2Id = currentMatch.player2_id
      console.log(`[Resume] Players: ${player1Id} vs ${player2Id}`)
      
      // Load video from IndexedDB
      const sessionId = `${matchId}-${targetSet.set_number}`
      console.log(`[Resume] Loading video for session: ${sessionId}`)
      const videoFile = await getVideoFile(sessionId)
      
      if (videoFile) {
        const blobUrl = URL.createObjectURL(videoFile)
        useVideoPlaybackStore.getState().setVideoUrl(blobUrl)
        console.log(`[Resume] ✓ Video loaded from IndexedDB: ${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(2)} MB)`)
        console.log(`[Resume] Blob URL: ${blobUrl.substring(0, 50)}...`)
      } else {
        console.warn('[Resume] ⚠ No video file found in IndexedDB - user will need to re-select')
      }
      
      // Load rallies and shots from DB based on phase
      if (targetSet.tagging_phase === 'phase1_in_progress' || targetSet.tagging_phase === 'phase1_complete') {
        console.log(`[Resume] Loading Phase 1 data from database...`)
        const dbRallies = await rallyDb.getBySetId(targetSet.id)
        const dbShots = await shotDb.getBySetId(targetSet.id)
        console.log(`[Resume] Found ${dbRallies.length} rallies, ${dbShots.length} shots`)
        
        // Convert DB data to Phase1Rally format
        const rallies: Phase1Rally[] = dbRallies.map(rally => 
          convertDBRallyToPhase1Rally(rally, dbShots, player1Id, player2Id)
        )
        
        setPhase1Rallies(rallies)
        console.log(`[Resume] ✓ Loaded ${rallies.length} rallies into state`)
        
        // Set up player context from first rally
        if (rallies.length > 0 && dbRallies.length > 0) {
          const firstServerId = dbRallies[0].server_id === player1Id ? 'player1' : 'player2'
          setSetupData({
            firstServerId,
            startingScore: { player1: 0, player2: 0 },
          })
          console.log(`[Resume] ✓ Player context initialized, first server: ${firstServerId}`)
        }
        
        if (targetSet.tagging_phase === 'phase1_complete') {
          console.log(`[Resume] → Resuming at Phase 2`)
          setPhase('phase2')
        } else {
          console.log(`[Resume] → Resuming at Phase 1 (${rallies.length} rallies complete)`)
          setPhase('phase1')
        }
      } else if (targetSet.tagging_phase === 'phase2_in_progress' || targetSet.tagging_phase === 'phase2_complete') {
        console.log(`[Resume] Loading Phase 2 data from database...`)
        const dbRallies = await rallyDb.getBySetId(targetSet.id)
        const dbShots = await shotDb.getBySetId(targetSet.id)
        console.log(`[Resume] Found ${dbRallies.length} rallies, ${dbShots.length} shots`)
        
        // Convert to Phase1Rally first
        const rallies: Phase1Rally[] = dbRallies.map(rally => 
          convertDBRallyToPhase1Rally(rally, dbShots, player1Id, player2Id)
        )
        setPhase1Rallies(rallies)
        console.log(`[Resume] ✓ Loaded ${rallies.length} rallies into state`)
        
        // Set up player context from first rally (needed for Phase 2)
        if (rallies.length > 0 && dbRallies.length > 0) {
          const firstServerId = dbRallies[0].server_id === player1Id ? 'player1' : 'player2'
          setSetupData({
            firstServerId,
            startingScore: { player1: 0, player2: 0 },
          })
          console.log(`[Resume] ✓ Player context initialized, first server: ${firstServerId}`)
        }
        
        // Store resume shot index for Phase 2
        const resumeIndex = targetSet.phase2_last_shot_index || 0
        setPhase2ResumeIndex(resumeIndex)
        console.log(`[Resume] → Resuming at Phase 2, shot ${resumeIndex}/${targetSet.phase2_total_shots || '?'}`)
        
        setPhase('phase2')
      }
      
      console.log('[Resume] ✓✓✓ Session resumed successfully ✓✓✓')
    } catch (error) {
      console.error('Failed to resume session:', error)
      alert('Failed to resume session. Starting fresh.')
      setPhase('pre_setup')
    }
  }
  
  // Handle set preparation (redo workflow + resume)
  useEffect(() => {
    const prepareSet = async () => {
      if (!matchId || !urlSetNumber) return
      
      // Wait for match to be loaded before proceeding
      if (!currentMatch) {
        console.log('[Setup] Waiting for match data to load...')
        return
      }
      
      // Prevent duplicate preparation if already in a valid phase
      if (phase !== 'setup') {
        console.log(`[Setup] Already in phase '${phase}', skipping preparation`)
        return
      }
      
      setIsPreparingSet(true)
      console.log(`[Setup] Preparing set ${urlSetNumber} for match ${matchId}${isRedo ? ' (REDO)' : ''}`)
      try {
        const sets = await getSetsByMatchId(matchId)
        const targetSet = sets.find(s => s.set_number === parseInt(urlSetNumber))
        
        if (!targetSet) {
          alert('Set not found')
          setIsPreparingSet(false)
          return
        }
        
        // Check if this is a resume or redo
        if (isRedo) {
          // Delete existing tagging data for redo
          await deleteSetTaggingData(targetSet.id)
          console.log(`Cleared tagging data for Set ${targetSet.set_number}`)
          // Clear localStorage session
          useTaggingSessionStore.getState().clearSession()
          setPhase('pre_setup')
          await markSetTaggingStarted(targetSet.id)
        } else if (targetSet.tagging_phase && targetSet.tagging_phase !== 'not_started') {
          // Resume existing session
          await resumeTaggingSession(targetSet, matchId)
        } else {
          // Fresh start
          setPhase('pre_setup')
          await markSetTaggingStarted(targetSet.id)
        }
        
        setSelectedSetNumber(parseInt(urlSetNumber))
        setCurrentSetId(targetSet.id)
        console.log(`[Setup] Set ID initialized: ${targetSet.id}, Set Number: ${targetSet.set_number}`)
      } catch (error) {
        console.error('Failed to prepare set:', error)
        alert('Failed to prepare set for tagging')
      } finally {
        setIsPreparingSet(false)
      }
    }
    
    if (urlSetNumber && phase === 'setup') {
      prepareSet()
    }
  }, [matchId, urlSetNumber, isRedo, phase, currentMatch])
  
  const handleCompletePreSetup = (data: {
    firstServerId: 'player1' | 'player2'
    startingScore: { player1: number; player2: number }
  }) => {
    setSetupData(data)
    setPhase('phase1')
  }
  
  const handleCompletePhase1 = async (rallies: Phase1Rally[]) => {
    console.log(`[Phase1→Phase2] Completing Phase 1 with ${rallies.length} rallies`)
    setPhase1Rallies(rallies)
    
    // Mark Phase 1 as complete in database
    if (currentSetId) {
      try {
        await setDb.update(currentSetId, {
          tagging_phase: 'phase1_complete',
          phase1_total_rallies: rallies.length,
        })
        console.log('[Phase1→Phase2] ✓ Phase 1 marked as complete in database')
      } catch (error) {
        console.error('[Phase1→Phase2] ✗ Failed to mark Phase 1 complete:', error)
        // Don't block - user can still continue
      }
    } else {
      console.warn('[Phase1→Phase2] No currentSetId - skipping DB update')
    }
    
    // Ensure video URL is in global store for Phase 2
    const currentVideoUrl = useVideoPlaybackStore.getState().videoUrl
    if (currentVideoUrl) {
      console.log('[Phase1→Phase2] ✓ Video URL preserved:', currentVideoUrl.substring(0, 50) + '...')
    } else {
      console.warn('[Phase1→Phase2] ⚠ No video URL in global store!')
    }
    
    setPhase('phase2')
  }
  
  const handleCompletePhase2 = async (detailedShots: DetailedShot[]) => {
    if (!matchId || !currentMatch) {
      alert('No match selected!')
      return
    }
    
    setPhase('saving')
    
    try {
      // Get the EXISTING set for this set number (don't create a new one!)
      const existingSets = await getSetsByMatchId(matchId)
      const setData = existingSets.find(s => s.set_number === selectedSetNumber)
      
      if (!setData) {
        alert(`Set ${selectedSetNumber} not found! Please contact support.`)
        setPhase('phase2')
        return
      }
      
      // Update the existing set with first server info if needed
      const firstServerId = phase1Rallies[0]?.serverId === 'player1' 
        ? currentMatch.player1_id 
        : currentMatch.player2_id
      
      await updateSetService(setData.id, {
        set_first_server_id: firstServerId,
        has_video: true,
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
      
      // Update set final scores and winner
      const finalRally = ralliesWithScores[ralliesWithScores.length - 1]
      if (finalRally) {
        // Determine winner based on final score
        const winnerId = finalRally.player1_score_after > finalRally.player2_score_after
          ? currentMatch.player1_id
          : finalRally.player2_score_after > finalRally.player1_score_after
          ? currentMatch.player2_id
          : null
        
        await updateSetService(setData.id, {
          player1_final_score: finalRally.player1_score_after,
          player2_final_score: finalRally.player2_score_after,
          winner_id: winnerId,
        })
      }
      
      // Run inference on all shots
      await runInferenceForSet(ralliesWithScores, shotsWithEndMarkers)
      
      // Mark set as tagging completed
      await markSetTaggingCompleted(setData.id)
      
      // Update match set counts based on all tagged sets
      const allSets = await getSetsByMatchId(matchId)
      const player1SetsWon = allSets.filter(s => s.winner_id === currentMatch.player1_id && s.is_tagged).length
      const player2SetsWon = allSets.filter(s => s.winner_id === currentMatch.player2_id && s.is_tagged).length
      const matchWinnerId = player1SetsWon > player2SetsWon 
        ? currentMatch.player1_id 
        : player2SetsWon > player1SetsWon
        ? currentMatch.player2_id
        : null
      
      // Update match with tagged set counts
      await updateMatch(matchId, {
        player1_sets_won: player1SetsWon,
        player2_sets_won: player2SetsWon,
        winner_id: matchWinnerId,
      })
      
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

  // Preparing set (redo workflow)
  if (phase === 'setup' || isPreparingSet) {
    return (
      <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
        <Card className="p-8 max-w-lg text-center">
          <h2 className="text-2xl font-bold text-neutral-50 mb-4">Preparing Set for Tagging</h2>
          <p className="text-neutral-400 mb-6">
            {isRedo ? 'Clearing existing data and preparing set...' : 'Loading set data...'}
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
          </div>
        </Card>
      </div>
    )
  }

  // Pre-tagging setup questions
  if (phase === 'pre_setup' && currentMatch) {
    const player1Name = players.find(p => p.id === currentMatch.player1_id)?.first_name || 'Player 1'
    const player2Name = players.find(p => p.id === currentMatch.player2_id)?.first_name || 'Player 2'
    
    return (
      <PreTaggingSetupBlock
        player1Name={player1Name}
        player2Name={player2Name}
        setNumber={selectedSetNumber}
        onComplete={handleCompletePreSetup}
        onCancel={() => navigate('/matches')}
      />
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
        setId={currentSetId}
        player1Id={currentMatch.player1_id}
        player2Id={currentMatch.player2_id}
        resumeFromShotIndex={phase2ResumeIndex}
      />
    )
  }
  
  // Build player context for Phase1
  const player1Name = players.find(p => p.id === currentMatch.player1_id)?.first_name || 'Player 1'
  const player2Name = players.find(p => p.id === currentMatch.player2_id)?.first_name || 'Player 2'

  const playerContext = setupData ? {
    firstServerId: setupData.firstServerId,
    startingScore: setupData.startingScore,
    player1Name,
    player2Name,
  } : null

  return (
    <Phase1TimestampComposer
      onCompletePhase1={handleCompletePhase1}
      playerContext={playerContext}
      className={className}
      setId={currentSetId}
      player1Id={currentMatch.player1_id}
      player2Id={currentMatch.player2_id}
    />
  )
}
