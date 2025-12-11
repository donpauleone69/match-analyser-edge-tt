/**
 * TaggingUIComposer — Main orchestrator for two-phase tagging
 * 
 * Phase 1: Timestamp capture with 1x4 button layout
 * Phase 2: Sequential question-based shot tagging
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { cn } from '@/helpers/utils'
import { Phase1TimestampComposer, type Phase1Rally } from './Phase1TimestampComposer'
import { Phase2DetailComposer, type DetailedShot } from './Phase2DetailComposer'
import { Phase3InferenceComposer } from './Phase3InferenceComposer'
import { Button } from '@/ui-mine'
import { Card } from '@/ui-mine/Card'
import { useMatchStore, usePlayerStore, setDb, rallyDb, shotDb } from '@/data'
import { useTaggingSessionStore } from '@/stores/taggingSessionStore'
import { useVideoPlaybackStore } from '@/ui-mine/VideoPlayer'
import { getVideoFile } from '@/helpers/videoStorage'
import { convertDBRallyToPhase1Rally } from './dataMapping'
const { 
  getByMatchId: getSetsByMatchId,
  markTaggingStarted: markSetTaggingStarted,
  deleteTaggingData: deleteSetTaggingData,
} = setDb

export interface TaggingUIComposerProps {
  className?: string
}

type Phase = 'setup' | 'phase1' | 'phase2' | 'phase3' | 'complete'

export function TaggingUIComposer({ className }: TaggingUIComposerProps) {
  const { matchId } = useParams<{ matchId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const { matches, load: loadMatches } = useMatchStore()
  const { players, load: loadPlayers } = usePlayerStore()
  
  const [phase, setPhase] = useState<Phase>('setup')
  const [phase1Rallies, setPhase1Rallies] = useState<Phase1Rally[]>([])
  const [currentSetId, setCurrentSetId] = useState<string | null>(null)
  const [isPreparingSet, setIsPreparingSet] = useState(false)
  const [phase2ResumeIndex, setPhase2ResumeIndex] = useState(0)
  
  const currentMatch = matches.find(m => m.id === matchId)
  
  // Get set number and redo flag from URL params
  const urlSetNumber = searchParams.get('set')
  const redoParam = searchParams.get('redo')
  const isRedo = redoParam === 'true' || redoParam === 'phase2'
  const redoMode: 'all' | 'phase2_only' = redoParam === 'phase2' ? 'phase2_only' : 'all'
  
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
        
        // Get player names
        const player1Name = players.find(p => p.id === player1Id)?.first_name || 'Player 1'
        const player2Name = players.find(p => p.id === player2Id)?.first_name || 'Player 2'
        
        // Convert DB data to Phase1Rally format
        const rallies: Phase1Rally[] = dbRallies.map(rally => 
          convertDBRallyToPhase1Rally(rally, dbShots, player1Id, player2Id, player1Name, player2Name)
        )
        
        setPhase1Rallies(rallies)
        console.log(`[Resume] ✓ Loaded ${rallies.length} rallies into state`)
        
        // Note: Player context is derived from rallies when resuming
        console.log(`[Resume] ✓ Player context available from rallies`)
        
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
        
        // Get player names
        const player1Name = players.find(p => p.id === player1Id)?.first_name || 'Player 1'
        const player2Name = players.find(p => p.id === player2Id)?.first_name || 'Player 2'
        
        // Convert to Phase1Rally first
        const rallies: Phase1Rally[] = dbRallies.map(rally => 
          convertDBRallyToPhase1Rally(rally, dbShots, player1Id, player2Id, player1Name, player2Name)
        )
        setPhase1Rallies(rallies)
        console.log(`[Resume] ✓ Loaded ${rallies.length} rallies into state`)
        
        // Note: Player context is derived from rallies when resuming
        console.log(`[Resume] ✓ Player context available from rallies`)
        
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
      setPhase('setup')
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
      console.log(`[Setup] Preparing set ${urlSetNumber} for match ${matchId}${isRedo ? ` (REDO - ${redoMode})` : ''}`)
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
          console.log(`[Setup] Deleting existing tagging data for redo (mode: ${redoMode})...`)
          await deleteSetTaggingData(targetSet.id, redoMode)
          console.log(`Cleared tagging data for Set ${targetSet.set_number}`)
          // Clear localStorage session
          useTaggingSessionStore.getState().clearSession()
          
          // If redo mode is phase2_only, resume from Phase 1 complete, otherwise start Phase 1
          if (redoMode === 'phase2_only') {
            // Resume from Phase 1 data
            await resumeTaggingSession(targetSet, matchId)
          } else {
            // Full redo - start from Phase 1
            setPhase('phase1')
            await markSetTaggingStarted(targetSet.id)
          }
        } else if (targetSet.tagging_phase && targetSet.tagging_phase !== 'not_started') {
          // Resume existing session
          await resumeTaggingSession(targetSet, matchId)
        } else {
          // Fresh start - go directly to Phase1 (has its own setup)
          setPhase('phase1')
          await markSetTaggingStarted(targetSet.id)
        }
        
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
  }, [matchId, urlSetNumber, isRedo, redoMode, phase, currentMatch])
  
  const handleCompletePhase2 = async (_detailedShots: DetailedShot[]) => {
    console.log('[TaggingUI] Phase 2 complete!')
    console.log('[TaggingUI] All data already saved by Phase1 and Phase2 composers')
    console.log('[TaggingUI] Match finalization complete (inference moved to Phase 3)')
    
    // Transition to Phase 3 (inference)
    setPhase('phase3')
  }
  
  const handleCompletePhase3 = () => {
    console.log('[TaggingUI] Phase 3 (inference) complete!')
    setPhase('complete')
  }
  
  const handleSkipPhase3 = () => {
    console.log('[TaggingUI] Phase 3 (inference) skipped by user')
    setPhase('complete')
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
  
  if (phase === 'phase3') {
    const player1Name = players.find(p => p.id === currentMatch?.player1_id)?.first_name || 'Player 1'
    const player2Name = players.find(p => p.id === currentMatch?.player2_id)?.first_name || 'Player 2'
    
    return (
      <Phase3InferenceComposer
        setId={currentSetId!}
        matchId={matchId!}
        player1Name={player1Name}
        player2Name={player2Name}
        onComplete={handleCompletePhase3}
        onSkip={handleSkipPhase3}
        className={className}
      />
    )
  }
  
  // Build player context for Phase1
  // Phase1TimestampComposer now handles its own setup (SetupControlsBlock)
  // We just provide player names for default values
  const player1Name = players.find(p => p.id === currentMatch.player1_id)?.first_name || 'Player 1'
  const player2Name = players.find(p => p.id === currentMatch.player2_id)?.first_name || 'Player 2'

  const playerContext = {
    firstServerId: 'player1' as const,  // Default - Phase1 setup will ask user
    startingScore: { player1: 0, player2: 0 },  // Default - Phase1 setup will ask user
    player1Name,
    player2Name,
  }

  return (
    <Phase1TimestampComposer
      playerContext={playerContext}
      className={className}
      setId={currentSetId}
      player1Id={currentMatch.player1_id}
      player2Id={currentMatch.player2_id}
    />
  )
}

