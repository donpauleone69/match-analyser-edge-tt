/**
 * Phase2DetailComposer — V2 sequential question flow for shot tagging
 * 
 * One question at a time with auto-advance.
 * 
 * Serve sequence: Contact → Direction → Length → Spin → Serve Type
 * Shot sequence: Stroke → Direction → Intent
 * Error sequence: Stroke → Intent → Error Type
 */

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/helpers/utils'
import type { Phase1Shot, Phase1Rally } from './Phase1TimestampComposer'
import { ButtonGrid, ShotQualityToggleBlock, RallyCard, ShotListItem, type ShotQuality } from '../blocks'
import { PhaseLayoutTemplate } from '../layouts'
import { UserInputSection, VideoPlayerSection, StatusBarSection, RallyListSection } from '../sections'
import { calculateShotPlayer, type PlayerId } from '@/rules'
import { 
  extractTargetFromDirection,
  mapDirectionToOriginTarget,
  mapShotLengthUIToDB,
  mapServeSpinUIToDB,
  mapStrokeUIToDB,
  mapShotLengthDBToUI,
  mapServeSpinDBToUI,
  mapWingDBToUI,
  mapShotResultDBToUI,
  mapRallyEndRoleDBToUI,
} from '@/rules/derive/shot/mappers_UI_to_DB'
import { shotDb, setDb } from '@/data'
import { type VideoPlayerHandle, useVideoPlaybackStore } from '@/ui-mine/VideoPlayer'
import {
  Button,
  // Serve direction buttons
  LeftLeftButton,
  LeftMidButton,
  LeftRightButton,
  RightLeftButton,
  RightMidButton,
  RightRightButton,
  // Middle direction buttons (for regular shots)
  MidLeftButton,
  MidMidButton,
  MidRightButton,
  // Serve depth buttons
  ShortButton,
  HalfLongButton,
  DeepButton,
  // Spin buttons
  UnderspinButton,
  NoSpinButton,
  TopspinButton,
  // Stroke buttons
  BackhandButton,
  ForehandButton,
  // Error type buttons
  ForcedErrorButton,
  UnforcedErrorButton,
  // Intent buttons
  DefensiveButton,
  NeutralButton,
  AggressiveButton,
} from '@/ui-mine'

// Question step types
type ServeStep = 'direction' | 'length' | 'spin'
type ReceiveStep = 'stroke' | 'direction' | 'length' | 'intent'
type ShotStep = 'stroke' | 'direction' | 'intent'
type ErrorStep = 'stroke' | 'direction' | 'intent' | 'errorType'

type QuestionStep = ServeStep | ReceiveStep | ShotStep | ErrorStep | 'complete'

export interface Phase2DetailComposerProps {
  phase1Rallies: Phase1Rally[]
  onComplete?: (detailedShots: DetailedShot[]) => void
  className?: string
  setId?: string | null  // For DB saving
  player1Id?: string | null
  player2Id?: string | null
  resumeFromShotIndex?: number  // Resume from specific shot
}

type Direction = 
  | 'left_left' | 'left_mid' | 'left_right' 
  | 'mid_left' | 'mid_mid' | 'mid_right'
  | 'right_left' | 'right_mid' | 'right_right'

export interface DetailedShot extends Phase1Shot {
  rallyId: string
  rallyEndCondition: string
  isLastShot: boolean
  isError: boolean
  isReceive: boolean  // NEW: flag for shot #2
  serverId: PlayerId  // who served this rally
  winnerId: PlayerId  // who won this rally
  // Detailed data
  direction?: Direction
  length?: 'short' | 'halflong' | 'deep'  // Used for both serve AND receive
  spin?: 'underspin' | 'nospin' | 'topspin'
  stroke?: 'backhand' | 'forehand'
  intent?: 'defensive' | 'neutral' | 'aggressive'
  errorType?: 'forced' | 'unforced'
  shotQuality?: 'average' | 'high'
}

export function Phase2DetailComposer({ phase1Rallies, onComplete, className, setId, player1Id, player2Id, resumeFromShotIndex = 0 }: Phase2DetailComposerProps) {
  const videoUrl = useVideoPlaybackStore(state => state.videoUrl)
  const setVideoUrl = useVideoPlaybackStore(state => state.setVideoUrl)
  const setPlaybackSpeed = useVideoPlaybackStore(state => state.setPlaybackSpeed)
  const videoPlayerRef = useRef<VideoPlayerHandle>(null)
  
  // Video preview settings
  const [previewBuffer] = useState(0.3) // 300ms before/after shot
  
  // Set playback speed to 0.5x for shot review
  useEffect(() => {
    setPlaybackSpeed(0.5)
  }, [setPlaybackSpeed])
  
  // Build flat list of all shots from all rallies
  const [allShots, setAllShots] = useState<DetailedShot[]>(() => {
    const shots: DetailedShot[] = []
    phase1Rallies.forEach((rally) => {
      rally.shots.forEach((shot, index) => {
        const isLastShot = index === rally.shots.length - 1
        const isError = rally.isError && isLastShot  // Only last shot can be error
        const isReceive = shot.shotIndex === 2  // NEW: flag for shot #2
        shots.push({
          ...shot,
          isServe: shot.isServe ?? (shot.shotIndex === 1),  // Ensure isServe is always defined
          rallyId: rally.id,
          rallyEndCondition: rally.endCondition,
          isLastShot,
          isError,
          isReceive,  // NEW
          serverId: rally.serverId,
          winnerId: rally.winnerId,
        })
      })
    })
    return shots
  })
  
  const [currentShotIndex, setCurrentShotIndex] = useState(resumeFromShotIndex)
  
  // Load existing Phase 2 data from DB on mount (if resuming)
  useEffect(() => {
    const loadExistingPhase2Data = async () => {
      if (!setId || !player1Id || !player2Id) {
        console.log('[Phase2] No DB context - skipping Phase 2 data load')
        return
      }
      
      if (resumeFromShotIndex === 0) {
        console.log('[Phase2] Starting fresh Phase 2 (no resume)')
        return
      }
      
      console.log(`[Phase2] Loading existing data, resuming from shot ${resumeFromShotIndex}/${allShots.length}`)
      
      try {
        const dbShots = await shotDb.getBySetId(setId)
        console.log(`[Phase2] Found ${dbShots.length} shots in database`)
        
        let updatedCount = 0
        
        // Update allShots with any existing Phase 2 data
        setAllShots(prevShots => 
          prevShots.map(shot => {
            const dbShot = dbShots.find(s => s.shot_index === shot.shotIndex)
            if (!dbShot) return shot
            
            updatedCount++
            
            // Merge DB data into shot using centralized mappers
            return {
              ...shot,
              direction: dbShot.shot_origin && dbShot.shot_target
                ? `${dbShot.shot_origin}_${dbShot.shot_target}` as any
                : shot.direction,
              length: mapShotLengthDBToUI(dbShot.shot_length) || shot.length,
              spin: mapServeSpinDBToUI(dbShot.serve_spin_family) || shot.spin,
              stroke: mapWingDBToUI(dbShot.shot_wing) || shot.stroke,
              intent: dbShot.intent || shot.intent,
              shotQuality: mapShotResultDBToUI(dbShot.shot_quality) || shot.shotQuality,
              errorType: mapRallyEndRoleDBToUI(dbShot.rally_end_role) || shot.errorType,
            }
          })
        )
        
        console.log(`[Phase2] ✓ Merged Phase 2 data for ${updatedCount} shots`)
      } catch (error) {
        console.error('[Phase2] ✗ Failed to load existing Phase 2 data:', error)
      }
    }
    
    loadExistingPhase2Data()
  }, [setId, player1Id, player2Id, resumeFromShotIndex])
  const [currentStep, setCurrentStep] = useState<QuestionStep>('direction')  // Start with serve direction
  const [currentShotQuality, setCurrentShotQuality] = useState<ShotQuality>('average')  // Track shot quality for current shot
  
  const currentShot = allShots[currentShotIndex]
  if (!currentShot) {
    return <div className="p-8 text-center text-neutral-500">No shots to tag</div>
  }
  
  // Ensure isServe is defined (in case of data migration issues)
  if (currentShot.isServe === undefined) {
    currentShot.isServe = currentShot.shotIndex === 1
  }
  
  // Debug logging
  console.log('[Phase2] Current shot:', {
    shotIndex: currentShot.shotIndex,
    isServe: currentShot.isServe,
    isReceive: currentShot.isReceive,
    isError: currentShot.isError,
    step: currentStep,
    allProperties: Object.keys(currentShot)
  })
  
  // Calculate constrained playback range for current shot (loop preview)
  const constrainedPlayback = {
    enabled: true,
    startTime: Math.max(0, currentShot.timestamp - previewBuffer),
    endTime: currentShot.timestamp + previewBuffer,
    loopOnEnd: true,
  }
  
  // Calculate which player is hitting the current shot
  const currentShotPlayer = currentShot 
    ? calculateShotPlayer(currentShot.serverId, currentShot.shotIndex)
    : null
  
  // Check if current step is the last question for this shot
  const isLastQuestion = (step: QuestionStep, shot: DetailedShot): boolean => {
    if (shot.isServe) return step === 'spin'
    if (shot.isError) return step === 'errorType'
    if (shot.isReceive) return step === 'intent'
    return step === 'intent' // Regular shots
  }
  
  // Determine question flow based on shot type
  const getNextStep = (current: QuestionStep): QuestionStep => {
    if (!currentShot) return 'complete'
    
    // Serve flow: direction → length → spin → next shot
    if (currentShot.isServe) {
      if (current === 'direction') return 'length'
      if (current === 'length') return 'spin'
      if (current === 'spin') return advanceToNextShot()
    }
    
    // Error shot flow: stroke → direction → intent → errorType → next shot
    // (Error takes precedence over receive)
    if (currentShot.isError) {
      if (current === 'stroke') return 'direction'
      if (current === 'direction') return 'intent'
      if (current === 'intent') return 'errorType'
      if (current === 'errorType') return advanceToNextShot()
    }
    
    // Receive flow (shot #2, but not error): stroke → direction → length → intent → next shot
    if (currentShot.isReceive) {
      if (current === 'stroke') return 'direction'
      if (current === 'direction') return 'length'
      if (current === 'length') return 'intent'
      if (current === 'intent') return advanceToNextShot()
    }
    
    // Regular shot flow: stroke → direction → intent → next shot
    if (current === 'stroke') return 'direction'
    if (current === 'direction') return 'intent'
    if (current === 'intent') return advanceToNextShot()
    
    return 'complete'
  }
  
  const advanceToNextShot = (): QuestionStep => {
    // NOTE: Save logic moved to handleAnswer to avoid stale state issues
    // This function now just determines the next step
    console.log('[Phase2] advanceToNextShot called (save already handled in handleAnswer)')
    
    if (currentShotIndex < allShots.length - 1) {
      // Next step will be determined by the new shot type
      const nextShot = allShots[currentShotIndex + 1]
      return nextShot?.isServe ? 'direction' : 'stroke'
    }
    
    // All shots complete
    return 'complete'
  }
  
  const saveCurrentShotToDatabase = async (shot: DetailedShot) => {
    if (!setId || !player1Id || !player2Id) {
      console.warn(`[Phase2] Cannot save shot ${currentShotIndex + 1} - missing DB context`)
      return
    }
    
    let updates: any = {} // Declare outside try block for error handler access
    
    try {
      console.log(`[Phase2] Saving shot ${currentShotIndex + 1}/${allShots.length} (rallyId: ${shot.rallyId}, shotIndex: ${shot.shotIndex})`)
      
      // Find existing shot in DB by matching BOTH rally_id AND shot_index
      const rallyShots = await shotDb.getBySetId(setId)
      const matchingShot = rallyShots.find(s => 
        s.rally_id === shot.rallyId && s.shot_index === shot.shotIndex
      )
      
      console.log(`[Phase2] Found matching shot:`, matchingShot ? `ID ${matchingShot.id}` : 'NOT FOUND')
      
      if (!matchingShot) {
        console.error(`[Phase2] ✗ No matching shot found in DB for shot index ${shot.shotIndex}`)
        return
      }
      
      // Update existing shot with Phase 2 details - simplified approach
      // We'll just update the fields that Phase 2 adds
      updates = {}
      
      // DEBUG: Log what data we have for this shot
      console.log(`[Phase2] Shot data before save:`, {
        shotIndex: shot.shotIndex,
        direction: shot.direction,
        length: shot.length,
        spin: shot.spin,
        stroke: shot.stroke,
        intent: shot.intent,
        shotQuality: shot.shotQuality,
        errorType: shot.errorType,
        isServe: shot.isServe,
        isReceive: shot.isReceive,
        isError: shot.isError,
      })
      
      // Use centralized mappers for UI → DB transformation
      if (shot.direction) {
        const { shot_origin, shot_target } = mapDirectionToOriginTarget(shot.direction)
        updates.shot_origin = shot_origin
        updates.shot_target = shot_target
      }
      if (shot.length) {
        updates.shot_length = mapShotLengthUIToDB(shot.length)
      }
      if (shot.spin) {
        updates.serve_spin_family = mapServeSpinUIToDB(shot.spin)
      }
      if (shot.stroke) {
        updates.shot_wing = mapStrokeUIToDB(shot.stroke)
      }
      if (shot.intent) {
        updates.intent = shot.intent
      }
      
      // DEBUG: Log shot state before updates
      console.log(`[Phase2] Shot state:`, {
        shotIndex: shot.shotIndex,
        isError: shot.isError,
        isLastShot: shot.isLastShot,
        errorType: shot.errorType,
        shotQuality: shot.shotQuality,
        rallyEndCondition: shot.rallyEndCondition,
      })
      console.log(`[Phase2] Current DB shot:`, {
        shot_result: matchingShot.shot_result,
        rally_end_role: matchingShot.rally_end_role,
        is_rally_end: matchingShot.is_rally_end,
      })
      
      // shot_result is READ-ONLY from Phase 1 - do NOT modify
      // shot_quality is set based on whether shot is in play
      if (!shot.isError && shot.shotQuality) {
        // Only save quality if shot is in play AND user answered
        updates.shot_quality = shot.shotQuality // 'high' or 'average'
        console.log(`[Phase2] Setting shot_quality:`, shot.shotQuality)
      } else if (shot.isError) {
        // Errors don't have quality
        updates.shot_quality = null
        console.log(`[Phase2] Error shot - shot_quality = null`)
      }
      // Note: if shot is in play but quality not answered yet, leave as null
      
      console.log(`[Phase2] Checking rally_end_role update: isError=${shot.isError}, errorType=${shot.errorType}`)
      if (shot.isError && shot.errorType) {
        // Derive rally_end_role from errorType
        updates.rally_end_role = shot.errorType === 'forced' ? 'forced_error' : 'unforced_error'
        console.log(`[Phase2] Setting rally_end_role:`, updates.rally_end_role)
      } else {
        console.log(`[Phase2] NOT setting rally_end_role (condition not met)`)
      }
      
      console.log(`[Phase2] Updating shot ${matchingShot.id} with:`, updates)
      console.log(`[Phase2] Missing fields:`, {
        noDirection: !shot.direction,
        noLength: !shot.length && (shot.isServe || shot.isReceive),
        noSpin: !shot.spin && shot.isServe,
        noStroke: !shot.stroke && !shot.isServe,
        noIntent: !shot.intent && !shot.isServe,
      })
      
      // Mark as tagged
      updates.is_tagged = true
      
      await shotDb.update(matchingShot.id, updates)
      
      // Verify what was saved by reading it back
      const verifyShot = await shotDb.getById(matchingShot.id)
      console.log(`[Phase2] ✓ Verified saved shot in DB:`, {
        id: verifyShot?.id,
        shot_index: verifyShot?.shot_index,
        wing: verifyShot?.shot_wing,
        serve_spin_family: verifyShot?.serve_spin_family,
        shot_origin: verifyShot?.shot_origin,
        shot_target: verifyShot?.shot_target,
        shot_length: verifyShot?.shot_length,
        shot_result: verifyShot?.shot_result,
        intent: verifyShot?.intent,
        is_tagged: verifyShot?.is_tagged,
      })
      
      // Update set progress
      await setDb.update(setId, {
        tagging_phase: 'phase2_in_progress',
        phase2_last_shot_index: currentShotIndex + 1,
        phase2_total_shots: allShots.length,
      })
      
      console.log(`[Phase2] ✓ Saved shot ${currentShotIndex + 1}/${allShots.length} to database`)
    } catch (error) {
      console.error(`[Phase2] ✗ Failed to save shot ${currentShotIndex + 1}:`, error)
      console.error(`[Phase2] Shot data:`, shot)
      console.error(`[Phase2] Updates attempted:`, updates)
      // Don't throw - continue to next shot even if save fails
    }
  }
  
  // Handle answer selection
  const handleAnswer = async <T,>(field: keyof DetailedShot, value: T) => {
    console.log(`[Phase2] handleAnswer called:`, { field, value, currentShotIndex, currentStep })
    
    // Save answer to current shot
    const updatedShots = [...allShots]
    const before = { ...updatedShots[currentShotIndex] }
    updatedShots[currentShotIndex] = {
      ...updatedShots[currentShotIndex],
      [field]: value,
    }
    const after = updatedShots[currentShotIndex]
    
    console.log(`[Phase2] Updated shot:`, {
      before_keys: Object.keys(before),
      after_keys: Object.keys(after),
      field_added: field,
      field_value: value,
      has_field_after: field in after,
    })
    
    setAllShots(updatedShots)
    
    // Auto-advance to next question
    const nextStep = getNextStep(currentStep)
    console.log(`[Phase2] Auto-advancing: ${currentStep} → ${nextStep}`)
    
    // If this was the last question for current shot, save it now with fresh data
    if (isLastQuestion(currentStep, currentShot)) {
      console.log(`[Phase2] Last question answered - saving shot NOW with fresh data`)
      const shotToSave = updatedShots[currentShotIndex]
      console.log(`[Phase2] Shot to save has ${Object.keys(shotToSave).length} fields:`, Object.keys(shotToSave))
      
      if (setId && player1Id && player2Id) {
        saveCurrentShotToDatabase(shotToSave).catch(console.error)
      }
      
      if (nextStep !== 'complete') {
        setCurrentShotIndex(prev => prev + 1)
        setCurrentShotQuality('average')
      } else {
        // All shots complete
        if (setId && player1Id && player2Id) {
          try {
            console.log('[Phase2] All shots tagged - finalizing...')
            
            // 1. Update set status
            await setDb.update(setId, {
              tagging_phase: 'phase2_complete',
              is_tagged: true,
              tagging_completed_at: new Date().toISOString(),
              phase2_last_shot_index: currentShotIndex + 1,
              phase2_total_shots: allShots.length,
            })
          console.log('[Phase2] ✓ Set marked as complete')
          
          // 2. Finalize match-level data (inference moved to Phase 3)
            console.log('[Phase2] Finalizing match...')
            const currentSet = await setDb.getById(setId)
            if (currentSet) {
              const { finalizeMatchAfterPhase2 } = await import('./finalizeMatch')
              await finalizeMatchAfterPhase2(currentSet.match_id, setId, player1Id, player2Id)
            }
            console.log('[Phase2] ✓ Match finalized')
            
          } catch (error) {
            console.error('[Phase2] ✗ Error during finalization:', error)
            alert('Tagging complete, but some finalization steps failed. Check console.')
          }
        }
        
        if (onComplete) onComplete(updatedShots)
      }
    }
    
    setCurrentStep(nextStep)
  }
  
  if (currentStep === 'complete') {
    return (
      <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-neutral-50">Tagging Complete!</h2>
          <p className="text-neutral-400">
            All {allShots.length} shots have been tagged.
          </p>
          <div className="flex gap-3 justify-center pt-4">
            {onComplete && (
              <Button variant="primary" onClick={() => onComplete && onComplete(allShots)}>
                Continue
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  // Progress info
  const progress = `${currentShotIndex + 1} of ${allShots.length}`
  // const progressPercent = Math.round((currentShotIndex / allShots.length) * 100)
  
  // Build current question label for status bar
  const getCurrentQuestionLabel = (): string => {
    if (currentStep === 'direction') {
      if (currentShot?.isServe) return 'Serve Direction'
      if (currentShot?.isError) return 'Shot Direction (Target)'
      return 'Shot Direction'
    }
    if (currentStep === 'length') {
      if (currentShot?.isServe) return 'Serve Depth'
      if (currentShot?.isReceive) return 'Receive Depth'
      return 'Shot Depth'
    }
    if (currentStep === 'spin') return 'Spin Type'
    if (currentStep === 'stroke') return 'Stroke Type'
    if (currentStep === 'intent') return 'Shot Intent'
    if (currentStep === 'errorType') return 'Error Type'
    return ''
  }
  
  const currentQuestionLabel = getCurrentQuestionLabel()
  
  // Helper to get previous shot direction (for dynamic shot direction buttons)
  const getPreviousDirection = (): 'left' | 'mid' | 'right' | null => {
    if (currentShotIndex === 0) return null
    const prevShot = allShots[currentShotIndex - 1]
    if (!prevShot?.direction) return null
    
    // Extract ending position from direction (e.g., 'left_mid' → 'mid')
    return extractTargetFromDirection(prevShot.direction) || 'mid'
  }
  
  // Helper to get next shot's starting side from receiver's perspective
  // If ball arrives on the right, the receiver is on the left (and vice versa)
  const getNextShotStartingSide = (): 'left' | 'mid' | 'right' | null => {
    const prevEnd = getPreviousDirection()
    if (!prevEnd) return null
    
    // Invert left/right for receiver's perspective; mid stays mid
    if (prevEnd === 'left') return 'right'
    if (prevEnd === 'right') return 'left'
    return 'mid'
  }
  
  return (
    <PhaseLayoutTemplate
      className={className}
      
      shotLog={
        <RallyListSection title="Shot Log - Phase 2 Tagging">
          {phase1Rallies.map((rally, rallyIdx) => {
            const rallyShots = allShots.filter(shot => shot.rallyId === rally.id)
            const hasCurrentShot = rallyShots.some(shot => allShots.indexOf(shot) === currentShotIndex)
            
            return (
              <RallyCard
                key={rally.id}
                rallyNumber={rallyIdx + 1}
                serverName={rally.serverName}
                winnerName={rally.winnerName}
                endCondition={rally.endCondition}
                isError={rally.isError}
                isTagging={hasCurrentShot}
              >
                {rallyShots.map((shot, idx) => {
                  const globalIdx = allShots.indexOf(shot)
                  const isCurrent = globalIdx === currentShotIndex
                  const isCompleted = globalIdx < currentShotIndex
                  
                  // Calculate player for this shot
                  const shotPlayer = calculateShotPlayer(rally.serverId, shot.shotIndex)
                  const playerName = shotPlayer === 'player1' ? rally.player1Name : rally.player2Name
                  
                  // Build detail string from collected data
                  const details: string[] = []
                  if (shot.stroke) details.push(shot.stroke === 'backhand' ? 'BH' : 'FH')
                  if (shot.direction) details.push(shot.direction.replace('_', '→'))
                  if (shot.length) details.push(`Depth:${shot.length}`)
                  if (shot.spin) details.push(`Spin:${shot.spin}`)
                  if (shot.intent) details.push(shot.intent)
                  if (shot.errorType) details.push(`ERR:${shot.errorType}`)
                  if (shot.shotQuality) details.push(`Q:${shot.shotQuality}`)
                  
                  return (
                    <ShotListItem
                      key={shot.id}
                      shotNumber={idx + 1}
                      shotType={shot.isServe ? 'serve' : shot.shotIndex === 2 ? 'receive' : 'shot'}
                      playerName={playerName}
                      timestamp={shot.timestamp}
                      isError={shot.isError}
                      isCurrent={isCurrent}
                      isCompleted={isCompleted}
                      details={details}
                    />
                  )
                })}
              </RallyCard>
            )
          })}
        </RallyListSection>
      }
      
      videoPlayer={
        <VideoPlayerSection
          ref={videoPlayerRef}
          videoUrl={videoUrl}
          onVideoSelect={setVideoUrl}
          constrainedPlayback={constrainedPlayback}
        />
      }
      
      statusBar={
        <StatusBarSection
          items={[
            // Column 1: Rally/Shot counters (left/right justified)
            <div key="rally-shot" className="flex flex-col text-xs leading-tight min-w-[80px]">
              <div className="flex justify-between">
                <span className="text-neutral-400">Rally</span>
                <span className="text-neutral-200 font-semibold">
                  {phase1Rallies.findIndex(r => r.shots.some(s => allShots.indexOf(s as any) === currentShotIndex)) + 1 || 1}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Shot</span>
                <span className="text-neutral-200 font-semibold">{currentShotIndex + 1}</span>
              </div>
            </div>,
            
            // Column 2: Current question (centered, spans more width)
            <div key="question" className="flex items-center justify-center px-6 min-w-[200px]">
              <span className="text-xs text-neutral-300 font-medium">{currentQuestionLabel}?</span>
            </div>,
            
            // Column 3: Progress (centered)
            <div key="progress" className="flex flex-col items-center text-xs leading-tight">
              <span className="text-neutral-400">Progress</span>
              <span className="text-neutral-200 font-semibold">{progress}</span>
            </div>,
            
            // Column 4: Player indicator (centered, colored badge)
            <div 
              key="player" 
              className={cn(
                'h-full px-4 rounded flex flex-col items-center justify-center text-xs font-bold leading-tight',
                currentShotPlayer === 'player1' && 'bg-blue-500/20 text-blue-400',
                currentShotPlayer === 'player2' && 'bg-orange-500/20 text-orange-400',
                !currentShotPlayer && 'bg-neutral-700 text-neutral-300'
              )}
            >
              <div className="truncate max-w-[80px]">
                {currentShotPlayer === 'player1' && phase1Rallies[0]?.player1Name}
                {currentShotPlayer === 'player2' && phase1Rallies[0]?.player2Name}
                {!currentShotPlayer && '—'}
              </div>
            </div>,
            
            // Column 5: Placeholder for future action button
            <div key="spacer" className="w-[80px]" />,
          ]}
        />
      }
      
      userInput={
        <UserInputSection playerTint={currentShotPlayer as 'player1' | 'player2' | null}>
          {/* Serve questions */}
        {currentShot.isServe && currentStep === 'direction' && (
          <ButtonGrid columns={6}>
            <LeftLeftButton onClick={() => handleAnswer('direction', 'left_left')} className="!w-full !aspect-auto" />
            <LeftMidButton onClick={() => handleAnswer('direction', 'left_mid')} className="!w-full !aspect-auto" />
            <LeftRightButton onClick={() => handleAnswer('direction', 'left_right')} className="!w-full !aspect-auto" />
            <RightLeftButton onClick={() => handleAnswer('direction', 'right_left')} className="!w-full !aspect-auto" />
            <RightMidButton onClick={() => handleAnswer('direction', 'right_mid')} className="!w-full !aspect-auto" />
            <RightRightButton onClick={() => handleAnswer('direction', 'right_right')} className="!w-full !aspect-auto" />
          </ButtonGrid>
        )}
        {currentShot.isServe && currentStep === 'length' && (
          <ButtonGrid columns={3}>
            <ShortButton onClick={() => handleAnswer('length', 'short')} />
            <HalfLongButton onClick={() => handleAnswer('length', 'halflong')} />
            <DeepButton onClick={() => handleAnswer('length', 'deep')} />
          </ButtonGrid>
        )}
        {currentShot.isServe && currentStep === 'spin' && (
          <ButtonGrid columns={3}>
            <UnderspinButton onClick={() => handleAnswer('spin', 'underspin')} />
            <NoSpinButton onClick={() => handleAnswer('spin', 'nospin')} />
            <TopspinButton onClick={() => handleAnswer('spin', 'topspin')} />
          </ButtonGrid>
        )}
        
        {/* Receive (shot #2) questions - only if NOT an error */}
        {currentShot.isReceive && !currentShot.isError && currentStep === 'stroke' && (
          <ButtonGrid columns={3}>
            <ShotQualityToggleBlock 
              value={currentShotQuality} 
              onChange={setCurrentShotQuality}
            />
            <BackhandButton onClick={() => {
              // Update both fields in single operation to avoid race condition
              const updatedShots = [...allShots]
              updatedShots[currentShotIndex] = {
                ...updatedShots[currentShotIndex],
                shotQuality: currentShotQuality,
                stroke: 'backhand' as const,
              }
              setAllShots(updatedShots)
              const nextStep = getNextStep(currentStep)
              setCurrentStep(nextStep)
            }} />
            <ForehandButton onClick={() => {
              // Update both fields in single operation to avoid race condition
              const updatedShots = [...allShots]
              updatedShots[currentShotIndex] = {
                ...updatedShots[currentShotIndex],
                shotQuality: currentShotQuality,
                stroke: 'forehand' as const,
              }
              setAllShots(updatedShots)
              const nextStep = getNextStep(currentStep)
              setCurrentStep(nextStep)
            }} />
          </ButtonGrid>
        )}
        {currentShot.isReceive && !currentShot.isError && currentStep === 'direction' && (
          <ButtonGrid columns={3}>
              {getNextShotStartingSide() === 'left' && (
                <>
                  <LeftLeftButton onClick={() => handleAnswer('direction', 'left_left')} />
                  <LeftMidButton onClick={() => handleAnswer('direction', 'left_mid')} />
                  <LeftRightButton onClick={() => handleAnswer('direction', 'left_right')} />
                </>
              )}
              {getNextShotStartingSide() === 'mid' && (
                <>
                  <MidLeftButton onClick={() => handleAnswer('direction', 'mid_left')} />
                  <MidMidButton onClick={() => handleAnswer('direction', 'mid_mid')} />
                  <MidRightButton onClick={() => handleAnswer('direction', 'mid_right')} />
                </>
              )}
              {getNextShotStartingSide() === 'right' && (
                <>
                  <RightLeftButton onClick={() => handleAnswer('direction', 'right_left')} />
                  <RightMidButton onClick={() => handleAnswer('direction', 'right_mid')} />
                  <RightRightButton onClick={() => handleAnswer('direction', 'right_right')} />
                </>
              )}
              {!getNextShotStartingSide() && (
                <>
                  <MidLeftButton onClick={() => handleAnswer('direction', 'mid_left')} />
                  <MidMidButton onClick={() => handleAnswer('direction', 'mid_mid')} />
                  <MidRightButton onClick={() => handleAnswer('direction', 'mid_right')} />
                </>
              )}
          </ButtonGrid>
        )}
        {currentShot.isReceive && !currentShot.isError && currentStep === 'length' && (
          <ButtonGrid columns={3}>
            <ShortButton onClick={() => handleAnswer('length', 'short')} />
            <HalfLongButton onClick={() => handleAnswer('length', 'halflong')} />
            <DeepButton onClick={() => handleAnswer('length', 'deep')} />
          </ButtonGrid>
        )}
        {currentShot.isReceive && !currentShot.isError && currentStep === 'intent' && (
          <ButtonGrid columns={3}>
            <DefensiveButton onClick={() => handleAnswer('intent', 'defensive')} />
            <NeutralButton onClick={() => handleAnswer('intent', 'neutral')} />
            <AggressiveButton onClick={() => handleAnswer('intent', 'aggressive')} />
          </ButtonGrid>
        )}
        
        {/* Regular shot questions */}
        {!currentShot.isServe && !currentShot.isError && !currentShot.isReceive && currentStep === 'stroke' && (
          <ButtonGrid columns={3}>
            <ShotQualityToggleBlock 
              value={currentShotQuality} 
              onChange={setCurrentShotQuality}
            />
            <BackhandButton onClick={() => {
              // Update both fields in single operation to avoid race condition
              const updatedShots = [...allShots]
              updatedShots[currentShotIndex] = {
                ...updatedShots[currentShotIndex],
                shotQuality: currentShotQuality,
                stroke: 'backhand' as const,
              }
              setAllShots(updatedShots)
              const nextStep = getNextStep(currentStep)
              setCurrentStep(nextStep)
            }} />
            <ForehandButton onClick={() => {
              // Update both fields in single operation to avoid race condition
              const updatedShots = [...allShots]
              updatedShots[currentShotIndex] = {
                ...updatedShots[currentShotIndex],
                shotQuality: currentShotQuality,
                stroke: 'forehand' as const,
              }
              setAllShots(updatedShots)
              const nextStep = getNextStep(currentStep)
              setCurrentStep(nextStep)
            }} />
          </ButtonGrid>
        )}
        {!currentShot.isServe && !currentShot.isError && !currentShot.isReceive && currentStep === 'direction' && (
          <ButtonGrid columns={3}>
              {getNextShotStartingSide() === 'left' && (
                <>
                  <LeftLeftButton onClick={() => handleAnswer('direction', 'left_left')} />
                  <LeftMidButton onClick={() => handleAnswer('direction', 'left_mid')} />
                  <LeftRightButton onClick={() => handleAnswer('direction', 'left_right')} />
                </>
              )}
              {getNextShotStartingSide() === 'mid' && (
                <>
                  <MidLeftButton onClick={() => handleAnswer('direction', 'mid_left')} />
                  <MidMidButton onClick={() => handleAnswer('direction', 'mid_mid')} />
                  <MidRightButton onClick={() => handleAnswer('direction', 'mid_right')} />
                </>
              )}
              {getNextShotStartingSide() === 'right' && (
                <>
                  <RightLeftButton onClick={() => handleAnswer('direction', 'right_left')} />
                  <RightMidButton onClick={() => handleAnswer('direction', 'right_mid')} />
                  <RightRightButton onClick={() => handleAnswer('direction', 'right_right')} />
                </>
              )}
              {/* Fallback if next starting side is null (shouldn't happen but safe) */}
              {!getNextShotStartingSide() && (
                <>
                  <MidLeftButton onClick={() => handleAnswer('direction', 'mid_left')} />
                  <MidMidButton onClick={() => handleAnswer('direction', 'mid_mid')} />
                  <MidRightButton onClick={() => handleAnswer('direction', 'mid_right')} />
                </>
              )}
          </ButtonGrid>
        )}
        {!currentShot.isServe && !currentShot.isError && !currentShot.isReceive && currentStep === 'intent' && (
          <ButtonGrid columns={3}>
            <DefensiveButton onClick={() => handleAnswer('intent', 'defensive')} />
            <NeutralButton onClick={() => handleAnswer('intent', 'neutral')} />
            <AggressiveButton onClick={() => handleAnswer('intent', 'aggressive')} />
          </ButtonGrid>
        )}
        
        {/* Error shot questions */}
        {currentShot.isError && currentStep === 'stroke' && (
          <ButtonGrid columns={2}>
            <BackhandButton onClick={() => {
              const updatedShots = [...allShots]
              updatedShots[currentShotIndex] = {
                ...updatedShots[currentShotIndex],
                shotQuality: currentShotQuality,
                stroke: 'backhand' as const,
              }
              setAllShots(updatedShots)
              const nextStep = getNextStep(currentStep)
              setCurrentStep(nextStep)
            }} />
            <ForehandButton onClick={() => {
              const updatedShots = [...allShots]
              updatedShots[currentShotIndex] = {
                ...updatedShots[currentShotIndex],
                shotQuality: currentShotQuality,
                stroke: 'forehand' as const,
              }
              setAllShots(updatedShots)
              const nextStep = getNextStep(currentStep)
              setCurrentStep(nextStep)
            }} />
          </ButtonGrid>
        )}
        {currentShot.isError && !currentShot.isServe && currentStep === 'direction' && (
          <ButtonGrid columns={3}>
              {getNextShotStartingSide() === 'left' && (
                <>
                  <LeftLeftButton onClick={() => handleAnswer('direction', 'left_left')} />
                  <LeftMidButton onClick={() => handleAnswer('direction', 'left_mid')} />
                  <LeftRightButton onClick={() => handleAnswer('direction', 'left_right')} />
                </>
              )}
              {getNextShotStartingSide() === 'mid' && (
                <>
                  <MidLeftButton onClick={() => handleAnswer('direction', 'mid_left')} />
                  <MidMidButton onClick={() => handleAnswer('direction', 'mid_mid')} />
                  <MidRightButton onClick={() => handleAnswer('direction', 'mid_right')} />
                </>
              )}
              {getNextShotStartingSide() === 'right' && (
                <>
                  <RightLeftButton onClick={() => handleAnswer('direction', 'right_left')} />
                  <RightMidButton onClick={() => handleAnswer('direction', 'right_mid')} />
                  <RightRightButton onClick={() => handleAnswer('direction', 'right_right')} />
                </>
              )}
              {!getNextShotStartingSide() && (
                <>
                  <MidLeftButton onClick={() => handleAnswer('direction', 'mid_left')} />
                  <MidMidButton onClick={() => handleAnswer('direction', 'mid_mid')} />
                  <MidRightButton onClick={() => handleAnswer('direction', 'mid_right')} />
                </>
              )}
          </ButtonGrid>
        )}
        {currentShot.isError && currentStep === 'intent' && (
          <ButtonGrid columns={3}>
            <DefensiveButton onClick={() => handleAnswer('intent', 'defensive')} />
            <NeutralButton onClick={() => handleAnswer('intent', 'neutral')} />
            <AggressiveButton onClick={() => handleAnswer('intent', 'aggressive')} />
          </ButtonGrid>
        )}
        {currentShot.isError && currentStep === 'errorType' && (
          <ButtonGrid columns={2}>
            <ForcedErrorButton onClick={() => handleAnswer('errorType', 'forced')} />
            <UnforcedErrorButton onClick={() => handleAnswer('errorType', 'unforced')} />
          </ButtonGrid>
        )}
        </UserInputSection>
      }
    />
  )
}
