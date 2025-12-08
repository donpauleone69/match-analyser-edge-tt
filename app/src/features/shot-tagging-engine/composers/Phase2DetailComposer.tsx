/**
 * Phase2DetailComposer — V2 sequential question flow for shot tagging
 * 
 * One question at a time with auto-advance.
 * 
 * Serve sequence: Contact → Direction → Length → Spin
 * Shot sequence: Stroke → Direction → Intent
 * Error sequence: Stroke → Intent → Error Type
 */

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/helpers/utils'
import type { Phase1Shot, Phase1Rally } from './Phase1TimestampComposer'
import { ButtonGrid, ShotQualityToggleBlock, type ShotQuality } from '../blocks'
import { calculateShotPlayer, type PlayerId } from '@/rules'
import { 
  extractTargetFromDirection,
  mapDirectionToOriginTarget,
  mapShotLengthUIToDB,
  mapServeSpinUIToDB,
  mapStrokeUIToDB,
  mapShotQualityUIToDB,
  mapShotLengthDBToUI,
  mapServeSpinDBToUI,
  mapWingDBToUI,
  mapShotResultDBToUI,
  mapRallyEndRoleDBToUI,
} from '@/rules/derive/shot/mappers_UI_to_DB'
import { deriveShot_rally_end_role } from '@/rules/derive/shot/deriveShot_rally_end_role'
import { shotDb, setDb } from '@/data'
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
import { VideoPlayer, type VideoPlayerHandle, useVideoPlaybackStore } from '@/ui-mine/VideoPlayer'

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
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null)
  
  // Manual save all Phase 2 progress
  const handleManualSave = async () => {
    if (!setId || !player1Id || !player2Id) {
      alert('Cannot save - missing database context')
      return
    }
    
    setIsSaving(true)
    console.log(`[Manual Save] Saving Phase 2 progress for ${currentShotIndex} shots...`)
    
    try {
      const dbShots = await shotDb.getBySetId(setId)
      let savedCount = 0
      
      // Save all shots up to current index
      for (let i = 0; i < currentShotIndex; i++) {
        const shot = allShots[i]
        const matchingShot = dbShots.find(s => s.shot_index === shot.shotIndex)
        
        if (matchingShot) {
          const updates: any = {}
          
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
            updates.wing = mapStrokeUIToDB(shot.stroke)
          }
          if (shot.intent) {
            updates.intent = shot.intent
          }
          if (shot.shotQuality) {
            updates.shot_result = mapShotQualityUIToDB(shot.shotQuality)
          }
          if (shot.errorType) {
            updates.rally_end_role = deriveShot_rally_end_role(
              {
                shot_index: shot.shotIndex,
                shot_result: updates.shot_result || matchingShot.shot_result,
                is_rally_end: true
              },
              shot.errorType
            )
          }
          
          if (Object.keys(updates).length > 0) {
            await shotDb.update(matchingShot.id, updates)
            savedCount++
          }
        }
      }
      
      // Update set progress
      await setDb.update(setId, {
        tagging_phase: 'phase2_in_progress',
        phase2_last_shot_index: currentShotIndex,
        phase2_total_shots: allShots.length,
      })
      
      setLastSaveTime(new Date())
      console.log(`[Manual Save] ✓ Saved ${savedCount} shot details successfully`)
      alert(`Successfully saved progress for ${savedCount} shots!`)
    } catch (error) {
      console.error('[Manual Save] ✗ Failed:', error)
      alert('Failed to save progress. Check console for details.')
    } finally {
      setIsSaving(false)
    }
  }
  
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
              stroke: mapWingDBToUI(dbShot.wing) || shot.stroke,
              intent: dbShot.intent || shot.intent,
              shotQuality: mapShotResultDBToUI(dbShot.shot_result) || shot.shotQuality,
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
      console.log(`[Phase2] Saving shot ${currentShotIndex + 1}/${allShots.length} (index ${shot.shotIndex})`)
      
      // Find existing shot in DB by matching shot index - timestamp from Phase 1 may have slight differences
      const rallyShots = await shotDb.getBySetId(setId)
      const matchingShot = rallyShots.find(s => 
        s.shot_index === shot.shotIndex
      )
      
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
        updates.wing = mapStrokeUIToDB(shot.stroke)
      }
      if (shot.intent) {
        updates.intent = shot.intent
      }
      // ALWAYS save shot quality (defaults to 'average' if not set)
      updates.shot_result = mapShotQualityUIToDB(shot.shotQuality || 'average')
      
      if (shot.errorType) {
        // Derive rally_end_role using centralized logic
        updates.rally_end_role = deriveShot_rally_end_role(
          {
            shot_index: currentShotIndex + 1,
            shot_result: updates.shot_result,
            is_rally_end: true
          },
          shot.errorType
        )
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
        wing: verifyShot?.wing,
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
  const handleAnswer = <T,>(field: keyof DetailedShot, value: T) => {
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
        if (setId) {
          setDb.update(setId, {
            tagging_phase: 'phase2_complete',
            is_tagged: true,
            tagging_completed_at: new Date().toISOString(),
            phase2_last_shot_index: currentShotIndex + 1,
            phase2_total_shots: allShots.length,
          }).catch(console.error)
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
  const progressPercent = Math.round((currentShotIndex / allShots.length) * 100)
  const shotLabel = currentShot.isServe ? 'Serve' : `Shot ${currentShot.shotIndex}`
  
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
    <div className={cn('fixed inset-0 flex flex-col bg-bg-surface overflow-hidden', className)}>
      {/* Shot Log - Top (scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 bg-bg-surface">
        <div className="text-sm text-neutral-500 mb-3">Shot Log - Phase 2 Tagging</div>
        
        {phase1Rallies.map((rally, rallyIdx) => {
          const rallyShots = allShots.filter(shot => shot.rallyId === rally.id)
          const hasCurrentShot = rallyShots.some(shot => allShots.indexOf(shot) === currentShotIndex)
          const endConditionLabel = 
            rally.endCondition === 'winner' ? 'Winner' :
            rally.endCondition === 'innet' ? 'In-Net' : 'Long'
          const endConditionColor = 
            rally.endCondition === 'winner' ? 'text-success' : 'text-danger'
          
          return (
            <div 
              key={rally.id} 
              className={cn(
                'p-3 rounded-lg',
                hasCurrentShot ? 'bg-brand-primary/10 border border-brand-primary/30' : 'bg-neutral-800'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs">
                  <span className={cn('font-medium', hasCurrentShot ? 'text-brand-primary' : 'text-neutral-400')}>
                    Rally {rallyIdx + 1} {hasCurrentShot && '(Tagging)'}
                  </span>
                  <span className="ml-2 text-neutral-500">Server: {rally.serverName}</span>
                </div>
                <div className="text-xs">
                  <span className="font-medium text-success mr-2">{rally.winnerName} won</span>
                  <span className={cn('font-medium', endConditionColor)}>
                    {endConditionLabel}
                    {rally.isError && ' (Error)'}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
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
                    <div key={shot.id} className="space-y-0.5">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-xs text-neutral-600">#{idx + 1}</span>
                        <span className={cn('text-xs', isCompleted ? 'text-neutral-400' : 'text-neutral-600')}>
                          {shot.isServe ? 'Serve' : shot.shotIndex === 2 ? 'Receive' : 'Shot'}
                        </span>
                        <span className="text-xs text-neutral-300 font-medium">{playerName}</span>
                        {shot.isError && <span className="text-xs text-danger">(error)</span>}
                        <span className="ml-auto font-mono text-xs text-neutral-600">{shot.timestamp.toFixed(2)}s</span>
                        {isCurrent && <span className="text-xs text-brand-primary font-medium ml-2">←</span>}
                      </div>
                      {details.length > 0 && (
                        <div className="pl-8 text-xs text-neutral-500">
                          {details.join(' • ')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Video Player - Fixed height, full width */}
      <div className="shrink-0 w-full aspect-video bg-black">
        <VideoPlayer
          ref={videoPlayerRef}
          videoSrc={videoUrl || undefined}
          onVideoSelect={setVideoUrl}
          compact={true}
          showTimeOverlay={true}
          constrainedPlayback={constrainedPlayback}
        />
      </div>
      
      {/* Progress Strip - Below Video */}
      <div className="shrink-0 border-t border-neutral-700 bg-neutral-900 px-4 py-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500">{shotLabel}: {currentQuestionLabel}?</span>
          <span className="text-neutral-400">{progress}</span>
        </div>
      </div>
      
      {/* Question Controls - Bottom */}
      <div className={cn(
        'shrink-0 border-t border-neutral-700 transition-colors duration-300',
        currentShotPlayer === 'player1' && 'bg-[rgb(59_130_246_/_0.12)]',
        currentShotPlayer === 'player2' && 'bg-[rgb(249_115_22_/_0.12)]',
        !currentShotPlayer && 'bg-bg-card'
      )}>
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
      </div>
    </div>
  )
}
